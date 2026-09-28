import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import { Examen, PlanEstudio, Progreso } from '../models/index.js';
import { diaKey } from './planGenerator.js';

const redondear = (n) => Math.round(n * 100) / 100;

/** Horas estudiadas por día ("YYYY-MM-DD" → horas) que cumplen el filtro. */
export async function horasPorDia(userId, filtro = {}) {
  const filas = await Progreso.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), ...filtro } },
    { $group: { _id: '$fecha', horas: { $sum: '$horasEstudiadas' } } },
  ]);
  const mapa = new Map();
  for (const f of filas) {
    const key = diaKey(f._id);
    mapa.set(key, redondear((mapa.get(key) ?? 0) + f.horas));
  }
  return mapa;
}

/**
 * Deja los registros de horas de un plan (`origen: 'plan'`) igual que sus
 * sesiones completadas: uno por sesión hecha, con sus horas y su día. Los de
 * sesiones que ya no están hechas (o ya no existen) se borran.
 */
export async function sincronizarProgresoPlan(plan) {
  const examen = await Examen.findOne({ _id: plan.examenId, userId: plan.userId }).select('asignaturaId');
  const completadas = plan.diasPlan.filter((s) => s.completado);

  await Progreso.deleteMany({
    userId: plan.userId,
    planEstudioId: plan._id,
    origen: 'plan',
    sesionId: { $nin: completadas.map((s) => s._id) },
  });
  if (completadas.length === 0) return;
  await Progreso.bulkWrite(
    completadas.map((s) => ({
      updateOne: {
        filter: { userId: plan.userId, sesionId: s._id },
        update: {
          $set: {
            fecha: s.fecha,
            horasEstudiadas: s.horas,
            temasEstudiados: [s.temaId],
            asignaturaId: examen?.asignaturaId,
            planEstudioId: plan._id,
            origen: 'plan',
          },
        },
        upsert: true,
      },
    })),
  );
}

/**
 * Al arrancar: crea los registros de horas de las sesiones completadas antes
 * de que existiera el registro de progreso. Es idempotente.
 */
export async function migrarProgresoPlanes() {
  const planes = await PlanEstudio.find({ 'diasPlan.completado': true });
  for (const plan of planes) await sincronizarProgresoPlan(plan);
  if (planes.length > 0) logger.info({ planes: planes.length }, 'Progreso de los planes sincronizado');
}
