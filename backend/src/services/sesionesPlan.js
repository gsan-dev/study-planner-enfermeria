import { Asignatura, Examen, PlanEstudio, Tema } from '../models/index.js';

/**
 * Sesiones de los planes de estudio dentro del rango, con el nombre del tema
 * y el color de la asignatura para pintarlas.
 */
export async function sesionesEnRango(userId, desde, hasta) {
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
