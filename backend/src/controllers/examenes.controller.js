import { Asignatura, Examen, PlanEstudio, Tema } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { findOwned } from '../utils/ownership.js';

const NOT_FOUND = 'Examen no encontrado';

// Campos opcionales: si no llegan en un PUT, se borran (el PUT reemplaza el examen).
const OPCIONALES = ['titulo', 'hora', 'peso', 'aula', 'notas'];

const hoyUTC = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

async function asignaturaActiva(asignaturaId, userId) {
  const asignatura = await findOwned(Asignatura, asignaturaId, userId, 'Asignatura no encontrada');
  if (asignatura.archivada) {
    throw AppError.badRequest('La asignatura está archivada', { asignaturaId: 'La asignatura está archivada' });
  }
  return asignatura;
}

/** Comprueba que todos los temas son de la asignatura y los devuelve en el orden del temario. */
async function temasDeAsignatura(ids, asignaturaId, userId) {
  if (ids.length === 0) return [];
  const temas = await Tema.find({ _id: { $in: ids }, userId, asignaturaId }).sort({ orden: 1, createdAt: 1 }).select('_id');
  if (temas.length !== ids.length) {
    throw AppError.badRequest('Algún tema no pertenece a la asignatura del examen', {
      temas: 'Algún tema no pertenece a la asignatura del examen',
    });
  }
  return temas.map((t) => t._id);
}

/** Quita del plan de estudio las sesiones de temas que ya no entran en el examen. */
async function podarPlan(examen) {
  await PlanEstudio.updateOne(
    { userId: examen.userId, examenId: examen._id },
    { $pull: { diasPlan: { temaId: { $nin: examen.temas } } } },
  );
}

async function todosLosTemas(asignaturaId, userId) {
  const temas = await Tema.find({ userId, asignaturaId }).sort({ orden: 1, createdAt: 1 }).select('_id');
  return temas.map((t) => t._id);
}

/**
 * Añade a cada examen su asignatura (nombre y color) y cuántos de sus temas
 * están estudiados, para pintar la lista sin más peticiones.
 */
export async function conResumen(userId, examenes) {
  const asignaturaIds = [...new Set(examenes.map((e) => String(e.asignaturaId)))];
  const temaIds = [...new Set(examenes.flatMap((e) => e.temas.map(String)))];
  const [asignaturas, estudiados] = await Promise.all([
    Asignatura.find({ _id: { $in: asignaturaIds }, userId }).select('nombre color archivada'),
    Tema.find({ _id: { $in: temaIds }, userId, estudiado: true }).distinct('_id'),
  ]);
  const porId = new Map(asignaturas.map((a) => [String(a._id), a]));
  const estudiadosSet = new Set(estudiados.map(String));

  return examenes.map((examen) => {
    const asignatura = porId.get(String(examen.asignaturaId));
    return {
      ...examen.toJSON(),
      asignatura: asignatura
        ? { _id: asignatura._id, nombre: asignatura.nombre, color: asignatura.color, archivada: asignatura.archivada }
        : null,
      resumenTemas: {
        total: examen.temas.length,
        estudiados: examen.temas.filter((id) => estudiadosSet.has(String(id))).length,
      },
    };
  });
}

/** GET /api/examenes?estado=proximos|pasados|todos&desde=YYYY-MM-DD&asignaturaId= */
export async function listExamenes(req, res) {
  const { estado, desde, asignaturaId } = req.validatedQuery;
  const hoy = desde ?? hoyUTC();
  const filter = { userId: req.user.id };
  if (asignaturaId) filter.asignaturaId = asignaturaId;
  if (estado === 'proximos') filter.fecha = { $gte: hoy };
  if (estado === 'pasados') filter.fecha = { $lt: hoy };

  // Próximos: el más cercano primero. Pasados: el más reciente primero.
  const orden = estado === 'pasados' ? -1 : 1;
  const examenes = await Examen.find(filter).sort({ fecha: orden, hora: orden, createdAt: 1 });

  res.json({ examenes: await conResumen(req.user.id, examenes) });
}

/** GET /api/examenes/:id */
export async function getExamen(req, res) {
  const examen = await findOwned(Examen, req.params.id, req.user.id, NOT_FOUND);
  const [conDatos] = await conResumen(req.user.id, [examen]);
  res.json({ examen: conDatos });
}

/**
 * GET /api/examenes/:id/detalles
 * El examen con su asignatura, los temas que entran y el temario completo de
 * la asignatura (para elegir o sugerir temas).
 */
export async function getDetalles(req, res) {
  const userId = req.user.id;
  const examen = await findOwned(Examen, req.params.id, userId, NOT_FOUND);
  const [[conDatos], asignatura, temario] = await Promise.all([
    conResumen(userId, [examen]),
    Asignatura.findOne({ _id: examen.asignaturaId, userId }),
    Tema.find({ userId, asignaturaId: examen.asignaturaId }).sort({ orden: 1, createdAt: 1 }),
  ]);
  const incluidos = new Set(examen.temas.map(String));

  res.json({
    examen: conDatos,
    asignatura,
    temas: temario.filter((t) => incluidos.has(String(t._id))),
    temario,
  });
}

/** POST /api/examenes — sin `temas`, entran todos los de la asignatura. */
export async function createExamen(req, res) {
  const userId = req.user.id;
  const asignatura = await asignaturaActiva(req.body.asignaturaId, userId);
  const temas = req.body.temas
    ? await temasDeAsignatura(req.body.temas, asignatura._id, userId)
    : await todosLosTemas(asignatura._id, userId);

  const examen = await Examen.create({ ...req.body, temas, userId, asignaturaId: asignatura._id });
  const [conDatos] = await conResumen(userId, [examen]);
  res.status(201).json({ examen: conDatos });
}

/**
 * PUT /api/examenes/:id
 * Sin `temas` se conservan los actuales; si cambia la asignatura, pasan a ser
 * todos los de la nueva.
 */
export async function updateExamen(req, res) {
  const userId = req.user.id;
  const examen = await findOwned(Examen, req.params.id, userId, NOT_FOUND);
  const cambiaAsignatura = String(examen.asignaturaId) !== req.body.asignaturaId;
  // Se puede editar un examen de una asignatura archivada, pero no mover uno a ella.
  const asignatura = cambiaAsignatura
    ? await asignaturaActiva(req.body.asignaturaId, userId)
    : await findOwned(Asignatura, req.body.asignaturaId, userId, 'Asignatura no encontrada');

  let temas = examen.temas;
  if (req.body.temas) temas = await temasDeAsignatura(req.body.temas, asignatura._id, userId);
  else if (cambiaAsignatura) temas = await todosLosTemas(asignatura._id, userId);

  for (const campo of OPCIONALES) examen.set(campo, req.body[campo]);
  examen.set({ asignaturaId: asignatura._id, tipo: req.body.tipo, fecha: req.body.fecha, temas });
  await examen.save();
  await podarPlan(examen);

  const [conDatos] = await conResumen(userId, [examen]);
  res.json({ examen: conDatos });
}

/** POST /api/examenes/:id/temas — fija qué temas entran en el examen. */
export async function setTemasExamen(req, res) {
  const userId = req.user.id;
  const examen = await findOwned(Examen, req.params.id, userId, NOT_FOUND);
  examen.temas = await temasDeAsignatura(req.body.temas, examen.asignaturaId, userId);
  await examen.save();
  await podarPlan(examen);

  const [conDatos] = await conResumen(userId, [examen]);
  res.json({ examen: conDatos });
}

/** DELETE /api/examenes/:id — borra también su plan de estudio. */
export async function deleteExamen(req, res) {
  const examen = await findOwned(Examen, req.params.id, req.user.id, NOT_FOUND);
  await PlanEstudio.deleteMany({ userId: req.user.id, examenId: examen._id });
  await examen.deleteOne();
  res.status(204).end();
}
