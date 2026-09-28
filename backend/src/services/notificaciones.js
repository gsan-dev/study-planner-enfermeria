import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Asignatura, Examen, Notificacion, PlanEstudio, User } from '../models/index.js';
import { sumarDias } from './fechas.js';
import { diaKey } from './planGenerator.js';
import { enviarPush } from './push.js';
import { sesionesEnRango } from './sesionesPlan.js';

const DUPLICADA = 11000;

const textoHoras = (h) => {
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${String(Math.round(h * 100) / 100).replace('.', ',')} h`;
};

/**
 * Crea una notificación y la envía por push a los dispositivos de la usuaria.
 * Con `clave`, no se repite: si ya existe una con esa clave, no hace nada y
 * devuelve null.
 */
export async function crearNotificacion(userId, { tipo = 'general', titulo, mensaje, url = '/', clave }) {
  let notificacion;
  try {
    notificacion = await Notificacion.create({ userId, tipo, titulo, mensaje, url, clave });
  } catch (err) {
    if (err.code === DUPLICADA) return null;
    throw err;
  }
  try {
    await enviarPush(userId, notificacion);
  } catch (err) {
    // La notificación queda en la app aunque falle el push.
    logger.warn({ err: err.message }, 'Fallo al enviar el push');
  }
  return notificacion;
}

/** Día ("YYYY-MM-DD") y hora ("HH:mm") actuales en la zona horaria de la usuaria. */
export function ahoraEn(zonaHoraria, fecha = new Date()) {
  let partes;
  try {
    partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(fecha);
  } catch {
    return ahoraEn('Europe/Madrid', fecha);
  }
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

const nombreExamen = (examen, asignatura) => {
  if (examen.titulo) return examen.titulo;
  return asignatura ? `examen de ${asignatura.nombre}` : 'examen';
};

/** Avisos de exámenes a 7, 3 y 1 día. */
async function avisosExamenes(user, hoy) {
  const fechas = [7, 3, 1].map((n) => ({ n, fecha: sumarDias(hoy, n) }));
  const examenes = await Examen.find({ userId: user._id, fecha: { $in: fechas.map((f) => f.fecha) } });
  if (examenes.length === 0) return;
  const [asignaturas, planes] = await Promise.all([
    Asignatura.find({ _id: { $in: examenes.map((e) => e.asignaturaId) }, userId: user._id }).select('nombre'),
    PlanEstudio.find({ userId: user._id, examenId: { $in: examenes.map((e) => e._id) } }),
  ]);
  const asignaturaPorId = new Map(asignaturas.map((a) => [String(a._id), a]));
  const planPorExamen = new Map(planes.map((p) => [String(p.examenId), p]));

  for (const examen of examenes) {
    const n = fechas.find((f) => f.fecha.getTime() === examen.fecha.getTime()).n;
    const asignatura = asignaturaPorId.get(String(examen.asignaturaId));
    const nombre = nombreExamen(examen, asignatura);
    const plan = planPorExamen.get(String(examen._id));
    const total = plan ? plan.diasPlan.reduce((a, s) => a + s.horas, 0) : 0;
    const hechas = plan ? plan.diasPlan.filter((s) => s.completado).reduce((a, s) => a + s.horas, 0) : 0;
    const progreso = total > 0 ? Math.round((hechas / total) * 100) : 0;

    let titulo;
    let mensaje;
    if (n === 7) {
      titulo = `Tu ${nombre} es en 7 días`;
      mensaje = plan
        ? `Llevas el ${progreso} % de tu plan de estudio. ¡Sigue así!`
        : 'Aún no tienes plan de estudio: créalo y reparte los temas hasta el examen.';
    } else if (n === 3) {
      titulo = `Quedan 3 días para tu ${nombre}`;
      mensaje = plan
        ? `Llevas el ${progreso} % del plan. Deberías ir terminando los temas y empezar a repasar.`
        : 'Deberías empezar a estudiar si no lo has hecho: crea un plan con lo que queda.';
    } else {
      titulo = `Mañana es tu ${nombre}`;
      mensaje = `${examen.hora ? `A las ${examen.hora}. ` : ''}Repasa lo más difícil y descansa bien. ¡Mucho ánimo!`;
    }
    await crearNotificacion(user._id, {
      tipo: `examen_${n}d`,
      titulo,
      mensaje,
      url: `/plan/${examen._id}`,
      clave: `examen_${n}d:${examen._id}`,
    });
  }
}

/** Qué toca estudiar hoy según los planes. */
async function avisoPlanDiario(user, hoy, dia) {
  const sesiones = (await sesionesEnRango(user._id, hoy, hoy)).filter((s) => !s.completado);
  if (sesiones.length === 0) return;
  const total = sesiones.reduce((a, s) => a + s.horas, 0);
  const lista = sesiones
    .slice(0, 3)
    .map((s) => `${s.tema} (${textoHoras(s.horas)})`)
    .join(', ');
  const resto = sesiones.length > 3 ? ` y ${sesiones.length - 3} más` : '';
  await crearNotificacion(user._id, {
    tipo: 'plan_diario',
    titulo: sesiones.length === 1 ? `Hoy toca estudiar ${sesiones[0].tema}` : `Hoy toca estudiar ${textoHoras(total)}`,
    mensaje: `${lista}${resto}.`,
    url: '/agenda',
    clave: `plan_diario:${dia}`,
  });
}

/** Planes con sesiones sin hacer de días anteriores (de exámenes que aún no han pasado). */
async function avisosRetraso(user, hoy, dia) {
  const examenes = await Examen.find({ userId: user._id, fecha: { $gte: hoy } });
  if (examenes.length === 0) return;
  const [planes, asignaturas] = await Promise.all([
    PlanEstudio.find({ userId: user._id, examenId: { $in: examenes.map((e) => e._id) } }),
    Asignatura.find({ _id: { $in: examenes.map((e) => e.asignaturaId) }, userId: user._id }).select('nombre'),
  ]);
  const examenPorId = new Map(examenes.map((e) => [String(e._id), e]));
  const asignaturaPorId = new Map(asignaturas.map((a) => [String(a._id), a]));

  for (const plan of planes) {
    const atrasadas = plan.diasPlan.filter((s) => !s.completado && s.fecha < hoy);
    if (atrasadas.length === 0) continue;
    const dias = new Set(atrasadas.map((s) => diaKey(s.fecha))).size;
    const examen = examenPorId.get(String(plan.examenId));
    const nombre = nombreExamen(examen, asignaturaPorId.get(String(examen.asignaturaId)));
    await crearNotificacion(user._id, {
      tipo: 'plan_retraso',
      titulo: `Vas retrasada ${dias} ${dias === 1 ? 'día' : 'días'} en tu plan`,
      mensaje: `Tienes ${atrasadas.length} ${atrasadas.length === 1 ? 'sesión' : 'sesiones'} sin hacer del ${nombre}. Regenera el plan para repartirlas o aumenta tus horas diarias.`,
      url: `/plan/${plan.examenId}`,
      clave: `plan_retraso:${plan._id}:${dia}`,
    });
  }
}

/**
 * Revisa los avisos de una usuaria. Los diarios (exámenes, plan del día y
 * retrasos) solo a partir de su hora de aviso; como cada uno lleva su clave
 * con el día, se envían una sola vez aunque se revise muchas veces.
 */
export async function revisarUsuaria(user, ahora = new Date()) {
  const prefs = user.notificaciones ?? {};
  const { dia, hora } = ahoraEn(prefs.zonaHoraria || 'Europe/Madrid', ahora);
  if (hora < (prefs.horaDiaria || '08:00')) return;
  const hoy = new Date(`${dia}T00:00:00.000Z`);

  if (prefs.examenes !== false) await avisosExamenes(user, hoy);
  if (prefs.planDiario !== false) await avisoPlanDiario(user, hoy, dia);
  if (prefs.retraso !== false) await avisosRetraso(user, hoy, dia);
}

/** Aviso inmediato al completar la última sesión de un plan. */
export async function avisoPlanCompletado(userId, plan) {
  const user = await User.findById(userId);
  if (!user || user.notificaciones?.logros === false) return;
  if (plan.diasPlan.length === 0 || plan.diasPlan.some((s) => !s.completado)) return;
  const examen = await Examen.findOne({ _id: plan.examenId, userId });
  if (!examen) return;
  const asignatura = await Asignatura.findOne({ _id: examen.asignaturaId, userId }).select('nombre');
  const horas = plan.diasPlan.reduce((a, s) => a + s.horas, 0);
  await crearNotificacion(userId, {
    tipo: 'plan_completado',
    titulo: '¡Felicidades! 🎉',
    mensaje: `Completaste el plan del ${nombreExamen(examen, asignatura)}: ${textoHoras(horas)} de estudio. ¡Ahora a por el examen!`,
    url: `/plan/${examen._id}`,
    clave: `plan_completado:${plan._id}`,
  });
}

let enMarcha = false;

async function revisarTodas() {
  if (enMarcha) return;
  enMarcha = true;
  try {
    const usuarias = await User.find({}).select('notificaciones');
    for (const user of usuarias) {
      try {
        await revisarUsuaria(user);
      } catch (err) {
        logger.error({ err: err.message, userId: user._id }, 'Error revisando avisos');
      }
    }
  } finally {
    enMarcha = false;
  }
}

/** Revisa los avisos al arrancar (con un pequeño margen) y cada N minutos. */
export function iniciarNotificador() {
  const intervalo = env.notificacionesIntervaloMin * 60 * 1000;
  setTimeout(revisarTodas, 15_000).unref();
  setInterval(revisarTodas, intervalo).unref();
  logger.info({ minutos: env.notificacionesIntervaloMin }, 'Avisos programados');
}
