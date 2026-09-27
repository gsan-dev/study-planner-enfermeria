import { Asignatura, EntradaDiario, Examen, PlanEstudio, Tarea, Tema } from '../models/index.js';
import { findOwned } from '../utils/ownership.js';
import { conResumen } from './examenes.controller.js';

const NOT_FOUND = 'Tarea no encontrada';
const porFechaYHora = { fecha: 1, hora: 1, createdAt: 1 };

/**
 * Sesiones de los planes de estudio dentro del rango, con el nombre del tema
 * y el color de la asignatura para pintarlas.
 */
async function sesionesEnRango(userId, desde, hasta) {
  const planes = await PlanEstudio.find({ userId, diasPlan: { $elemMatch: { fecha: { $gte: desde, $lte: hasta } } } });
  const sesiones = planes.flatMap((plan) =>
    plan.diasPlan
      .filter((s) => s.fecha >= desde && s.fecha <= hasta)
      .map((s) => ({ ...s.toJSON(), planId: plan._id, examenId: plan.examenId })),
  );
  if (sesiones.length === 0) return [];

  const [temas, examenes] = await Promise.all([
    Tema.find({ _id: { $in: sesiones.map((s) => s.temaId) }, userId }).select('nombre asignaturaId'),
    Examen.find({ _id: { $in: planes.map((p) => p.examenId) }, userId }).select('asignaturaId tipo titulo'),
  ]);
  const asignaturas = await Asignatura.find({ _id: { $in: examenes.map((e) => e.asignaturaId) }, userId }).select(
    'nombre color',
  );
  const temaPorId = new Map(temas.map((t) => [String(t._id), t]));
  const examenPorId = new Map(examenes.map((e) => [String(e._id), e]));
  const asignaturaPorId = new Map(asignaturas.map((a) => [String(a._id), a]));

  return sesiones
    .map((s) => {
      const examen = examenPorId.get(String(s.examenId));
      const asignatura = examen && asignaturaPorId.get(String(examen.asignaturaId));
      return {
        ...s,
        tema: temaPorId.get(String(s.temaId))?.nombre ?? 'Tema',
        asignatura: asignatura ? { _id: asignatura._id, nombre: asignatura.nombre, color: asignatura.color } : null,
      };
    })
    .sort((a, b) => a.fecha - b.fecha);
}

/**
 * GET /api/agenda?desde=&hasta=&hoy=
 * Todo lo de un rango de días: tareas, diario, exámenes y sesiones del plan.
 * Con `hoy`, también las tareas sin hacer de días anteriores (`pendientes`).
 */
export async function getAgenda(req, res) {
  const userId = req.user.id;
  const { desde, hasta, hoy } = req.validatedQuery;
  const rango = { $gte: desde, $lte: hasta };

  const [tareas, diario, examenes, sesiones, pendientes] = await Promise.all([
    Tarea.find({ userId, fecha: rango }).sort(porFechaYHora),
    EntradaDiario.find({ userId, fecha: rango }).sort({ fecha: 1 }),
    Examen.find({ userId, fecha: rango }).sort({ fecha: 1, hora: 1 }),
    sesionesEnRango(userId, desde, hasta),
    hoy ? Tarea.find({ userId, hecho: false, fecha: { $lt: hoy } }).sort(porFechaYHora).limit(50) : [],
  ]);

  res.json({ tareas, diario, examenes: await conResumen(userId, examenes), sesiones, pendientes });
}

/** POST /api/agenda/tareas */
export async function crearTarea(req, res) {
  const tarea = await Tarea.create({ ...req.body, userId: req.user.id });
  res.status(201).json({ tarea });
}

/** PATCH /api/agenda/tareas/:id — texto, hora, día o hecha. */
export async function actualizarTarea(req, res) {
  const tarea = await findOwned(Tarea, req.params.id, req.user.id, NOT_FOUND);
  const { hora, hecho, ...resto } = req.body;
  tarea.set(resto);
  if (hora !== undefined) tarea.hora = hora || undefined;
  if (hecho !== undefined && hecho !== tarea.hecho) {
    tarea.hecho = hecho;
    tarea.hechoEn = hecho ? new Date() : undefined;
  }
  await tarea.save();
  res.json({ tarea });
}

/** DELETE /api/agenda/tareas/:id */
export async function borrarTarea(req, res) {
  const tarea = await findOwned(Tarea, req.params.id, req.user.id, NOT_FOUND);
  await tarea.deleteOne();
  res.status(204).end();
}

/**
 * PUT /api/agenda/diario/:fecha — guarda la entrada del día (se crea o se
 * sustituye). Sin texto ni ánimo, la entrada se borra.
 */
export async function guardarDiario(req, res) {
  const userId = req.user.id;
  // validate() comprueba los params pero no los transforma: aquí llega "YYYY-MM-DD".
  const fecha = new Date(`${req.params.fecha}T00:00:00.000Z`);
  const texto = req.body.texto.trim() ? req.body.texto : '';
  const animo = req.body.animo ?? undefined;

  if (!texto && !animo) {
    await EntradaDiario.deleteOne({ userId, fecha });
    res.json({ entrada: null });
    return;
  }
  const entrada = await EntradaDiario.findOneAndUpdate(
    { userId, fecha },
    animo ? { $set: { texto, animo } } : { $set: { texto }, $unset: { animo: 1 } },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
  );
  res.json({ entrada });
}
