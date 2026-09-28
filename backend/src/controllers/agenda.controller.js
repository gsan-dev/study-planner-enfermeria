import { EntradaDiario, Examen, Tarea } from '../models/index.js';
import { sesionesEnRango } from '../services/sesionesPlan.js';
import { findOwned } from '../utils/ownership.js';
import { conResumen } from './examenes.controller.js';

const NOT_FOUND = 'Tarea no encontrada';
const porFechaYHora = { fecha: 1, hora: 1, createdAt: 1 };

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
