import { Asignatura, Examen, PlanEstudio, Tema } from '../models/index.js';
import { findOwned } from '../utils/ownership.js';

const NOT_FOUND = 'Tema no encontrado';

/** GET /api/asignaturas/:id/temas */
export async function listTemas(req, res) {
  const asignatura = await findOwned(Asignatura, req.params.id, req.user.id, 'Asignatura no encontrada');
  const temas = await Tema.find({ userId: req.user.id, asignaturaId: asignatura._id }).sort({
    orden: 1,
    createdAt: 1,
  });
  res.json({ temas });
}

/** POST /api/asignaturas/:id/temas — se añade al final del temario. */
export async function createTema(req, res) {
  const asignatura = await findOwned(Asignatura, req.params.id, req.user.id, 'Asignatura no encontrada');
  const ultimo = await Tema.findOne({ asignaturaId: asignatura._id }).sort({ orden: -1 }).select('orden');

  const tema = await Tema.create({
    ...req.body,
    userId: req.user.id,
    asignaturaId: asignatura._id,
    orden: (ultimo?.orden ?? -1) + 1,
  });
  res.status(201).json({ tema });
}

/** PUT /api/temas/:id */
export async function updateTema(req, res) {
  const tema = await findOwned(Tema, req.params.id, req.user.id, NOT_FOUND);
  tema.set(req.body);
  await tema.save();
  res.json({ tema });
}

/** PATCH /api/temas/:id/marcar-estudiado */
export async function marcarEstudiado(req, res) {
  const tema = await findOwned(Tema, req.params.id, req.user.id, NOT_FOUND);
  tema.estudiado = req.body.estudiado;
  tema.fechaEstudiado = req.body.estudiado ? new Date() : undefined;
  await tema.save();
  res.json({ tema });
}

/** DELETE /api/temas/:id — lo quita también de exámenes y planes de estudio. */
export async function deleteTema(req, res) {
  const tema = await findOwned(Tema, req.params.id, req.user.id, NOT_FOUND);
  const userId = req.user.id;

  await Promise.all([
    Examen.updateMany({ userId, temas: tema._id }, { $pull: { temas: tema._id } }),
    PlanEstudio.updateMany({ userId, 'diasPlan.temaId': tema._id }, { $pull: { diasPlan: { temaId: tema._id } } }),
  ]);
  await tema.deleteOne();

  res.status(204).end();
}
