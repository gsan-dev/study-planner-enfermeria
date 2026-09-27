import { Asignatura } from '../models/index.js';
import { escanearHorario, escaneoDisponible } from '../services/horarioScanner.js';
import { AppError } from '../utils/AppError.js';
import { withResumen } from './asignaturas.controller.js';

/** GET /api/horario/escanear — indica si el escaneo está configurado. */
export function getEscaneo(_req, res) {
  res.json({ disponible: escaneoDisponible() });
}

/** POST /api/horario/escanear — devuelve las clases detectadas (no guarda nada). */
export async function postEscaneo(req, res) {
  const resultado = await escanearHorario(req.body.archivo);
  res.json(resultado);
}

/**
 * PUT /api/horario — guarda el horario editado en la tabla.
 * Actualiza las franjas de las asignaturas indicadas y crea las nuevas.
 * Se valida la propiedad de todas antes de escribir nada.
 */
export async function guardarHorario(req, res) {
  const userId = req.user.id;
  const items = req.body.asignaturas;

  const ids = items.filter((i) => i._id).map((i) => i._id);
  if (new Set(ids).size !== ids.length) {
    throw AppError.badRequest('Hay asignaturas repetidas');
  }

  const existentes = await Asignatura.find({ _id: { $in: ids }, userId, archivada: false });
  if (existentes.length !== ids.length) {
    throw AppError.notFound('Alguna asignatura no existe o está archivada');
  }
  const porId = new Map(existentes.map((a) => [String(a._id), a]));

  for (const item of items) {
    if (!item._id) continue;
    const asignatura = porId.get(item._id);
    asignatura.horarios = item.horarios;
    await asignatura.save();
  }

  const nuevas = items.filter((i) => !i._id);
  if (nuevas.length > 0) {
    await Asignatura.insertMany(nuevas.map(({ nombre, color, horarios }) => ({ userId, nombre, color, horarios })));
  }

  const asignaturas = await Asignatura.find({ userId, archivada: false })
    .sort({ nombre: 1 })
    .collation({ locale: 'es', strength: 1 });
  res.json({ asignaturas: await withResumen(userId, asignaturas) });
}
