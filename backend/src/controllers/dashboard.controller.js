import { Asignatura, Examen, PlanEstudio, Tarea, Tema } from '../models/index.js';
import { diaKey } from '../services/planGenerator.js';
import { sesionesEnRango } from '../services/sesionesPlan.js';
import { conResumen } from './examenes.controller.js';

const DIA_MS = 24 * 60 * 60 * 1000;

const hoyUTC = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
const sumaHoras = (sesiones) => sesiones.reduce((a, s) => a + s.horas, 0);

/**
 * Cumplimiento del plan: de las sesiones que ya tocaban (días anteriores a
 * hoy, más las de hoy ya hechas), qué porcentaje se ha completado.
 * `null` si todavía no tocaba ninguna.
 */
function cumplimiento(sesiones, hoy) {
  const debidas = sesiones.filter((s) => s.fecha < hoy || (diaKey(s.fecha) === diaKey(hoy) && s.completado));
  const hechas = debidas.filter((s) => s.completado);
  return {
    porcentaje: debidas.length > 0 ? Math.round((hechas.length / debidas.length) * 100) : null,
    atrasadas: debidas.length - hechas.length,
  };
}

/** Resumen de un plan para las tarjetas de examen. */
function resumenPlan(plan) {
  const total = sumaHoras(plan.diasPlan);
  const hechas = sumaHoras(plan.diasPlan.filter((s) => s.completado));
  return {
    _id: plan._id,
    porcentaje: total > 0 ? Math.round((hechas / total) * 100) : 0,
    horasTotales: total,
    horasCompletadas: hechas,
  };
}

/**
 * GET /api/dashboard?hoy=YYYY-MM-DD
 * Todo lo que necesita la página de inicio en una sola petición.
 */
export async function getDashboard(req, res) {
  const userId = req.user.id;
  const hoy = req.validatedQuery.hoy ?? hoyUTC();
  // Semana de lunes a domingo que contiene hoy.
  const lunes = new Date(hoy.getTime() - ((hoy.getUTCDay() + 6) % 7) * DIA_MS);
  const domingo = new Date(lunes.getTime() + 6 * DIA_MS);

  const [asignaturas, temas, examenesActivos, planesTotales, sesionesSemana, tareasHoy, tareasAtrasadas] =
    await Promise.all([
      Asignatura.countDocuments({ userId, archivada: false }),
      Tema.countDocuments({ userId }),
      Examen.find({ userId, fecha: { $gte: hoy } }).sort({ fecha: 1, hora: 1 }),
      PlanEstudio.countDocuments({ userId }),
      sesionesEnRango(userId, lunes, domingo),
      Tarea.find({ userId, fecha: hoy }).sort({ hora: 1, createdAt: 1 }),
      Tarea.countDocuments({ userId, hecho: false, fecha: { $lt: hoy } }),
    ]);

  // Planes de los exámenes que aún no han pasado: con ellos se mide el cumplimiento.
  const planesActivos = await PlanEstudio.find({ userId, examenId: { $in: examenesActivos.map((e) => e._id) } });
  const planPorExamen = new Map(planesActivos.map((p) => [String(p.examenId), p]));
  const proximos = await conResumen(userId, examenesActivos.slice(0, 3));

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(lunes.getTime() + i * DIA_MS);
    const delDia = sesionesSemana.filter((s) => diaKey(s.fecha) === diaKey(fecha));
    return {
      fecha,
      horasPlanificadas: sumaHoras(delDia),
      horasCompletadas: sumaHoras(delDia.filter((s) => s.completado)),
    };
  });

  res.json({
    resumen: { asignaturas, temas, examenesProximos: examenesActivos.length, planes: planesTotales },
    proximosExamenes: proximos.map((examen) => {
      const plan = planPorExamen.get(String(examen._id));
      return { ...examen, plan: plan ? resumenPlan(plan) : null };
    }),
    hoy: {
      fecha: hoy,
      sesiones: sesionesSemana.filter((s) => diaKey(s.fecha) === diaKey(hoy)),
      tareas: tareasHoy,
      tareasAtrasadas,
    },
    semana: {
      desde: lunes,
      hasta: domingo,
      dias,
      horasPlanificadas: sumaHoras(sesionesSemana),
      horasCompletadas: sumaHoras(sesionesSemana.filter((s) => s.completado)),
      cumplimiento: cumplimiento(sesionesSemana, hoy).porcentaje,
    },
    cumplimiento: cumplimiento(
      planesActivos.flatMap((p) => p.diasPlan),
      hoy,
    ),
  });
}
