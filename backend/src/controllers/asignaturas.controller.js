import mongoose from 'mongoose';
import { Asignatura, Examen, PlanEstudio, Tema } from '../models/index.js';
import { findOwned } from '../utils/ownership.js';

const NOT_FOUND = 'Asignatura no encontrada';

/** Cuenta temas totales/estudiados y horas estimadas por asignatura. */
async function resumenTemas(userId, asignaturaIds) {
  const rows = await Tema.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), asignaturaId: { $in: asignaturaIds } } },
    {
      $group: {
        _id: '$asignaturaId',
        total: { $sum: 1 },
        estudiados: { $sum: { $cond: ['$estudiado', 1, 0] } },
        horasEstimadas: { $sum: '$horasEstimadas' },
      },
    },
  ]);
  return new Map(rows.map(({ _id, ...resumen }) => [String(_id), resumen]));
}

const RESUMEN_VACIO = { total: 0, estudiados: 0, horasEstimadas: 0 };

export async function withResumen(userId, asignaturas) {
  const resumenes = await resumenTemas(
    userId,
    asignaturas.map((a) => a._id),
  );
  return asignaturas.map((a) => ({
    ...a.toJSON(),
    resumenTemas: resumenes.get(String(a._id)) ?? RESUMEN_VACIO,
  }));
}

/** GET /api/asignaturas?archivadas=false|true|todas */
export async function listAsignaturas(req, res) {
  const { archivadas } = req.validatedQuery;
  const filter = { userId: req.user.id };
  if (archivadas !== 'todas') filter.archivada = archivadas === 'true';

  const asignaturas = await Asignatura.find(filter)
    .sort({ nombre: 1 })
    .collation({ locale: 'es', strength: 1 });

  res.json({ asignaturas: await withResumen(req.user.id, asignaturas) });
}

/** GET /api/asignaturas/:id */
export async function getAsignatura(req, res) {
  const asignatura = await findOwned(Asignatura, req.params.id, req.user.id, NOT_FOUND);
  const [conResumen] = await withResumen(req.user.id, [asignatura]);
  res.json({ asignatura: conResumen });
}

/** POST /api/asignaturas */
export async function createAsignatura(req, res) {
  const asignatura = await Asignatura.create({ ...req.body, userId: req.user.id });
  res.status(201).json({ asignatura: { ...asignatura.toJSON(), resumenTemas: RESUMEN_VACIO } });
}

/** PUT /api/asignaturas/:id */
export async function updateAsignatura(req, res) {
  const asignatura = await findOwned(Asignatura, req.params.id, req.user.id, NOT_FOUND);
  asignatura.set(req.body);
  await asignatura.save();
  const [conResumen] = await withResumen(req.user.id, [asignatura]);
  res.json({ asignatura: conResumen });
}

/** PATCH /api/asignaturas/:id/archivar — archiva (o desarchiva) sin borrar nada. */
export async function archivarAsignatura(req, res) {
  const asignatura = await findOwned(Asignatura, req.params.id, req.user.id, NOT_FOUND);
  asignatura.archivada = req.body.archivada;
  await asignatura.save();
  const [conResumen] = await withResumen(req.user.id, [asignatura]);
  res.json({ asignatura: conResumen });
}

/**
 * DELETE /api/asignaturas/:id
 * Borra también sus temas, exámenes y planes de estudio. Los registros de
 * horas estudiadas (Progreso) se conservan para las estadísticas.
 */
export async function deleteAsignatura(req, res) {
  const asignatura = await findOwned(Asignatura, req.params.id, req.user.id, NOT_FOUND);
  const userId = req.user.id;

  const examenIds = await Examen.find({ userId, asignaturaId: asignatura._id }).distinct('_id');
  await Promise.all([
    PlanEstudio.deleteMany({ userId, examenId: { $in: examenIds } }),
    Examen.deleteMany({ userId, asignaturaId: asignatura._id }),
    Tema.deleteMany({ userId, asignaturaId: asignatura._id }),
  ]);
  await asignatura.deleteOne();

  res.status(204).end();
}
