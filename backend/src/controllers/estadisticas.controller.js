import mongoose from 'mongoose';
import { Asignatura, Examen, PlanEstudio, Progreso, Tema } from '../models/index.js';
import { hoyUTC, lunesDe, sumarDias } from '../services/fechas.js';
import { diaKey, horasRecomendadas } from '../services/planGenerator.js';
import { horasPorDia } from '../services/progreso.js';
import { sesionesEnRango } from '../services/sesionesPlan.js';
import { findOwned } from '../utils/ownership.js';
import { conResumen } from './examenes.controller.js';

const redondear = (n) => Math.round(n * 100) / 100;

/**
 * GET /api/estadisticas/semana-actual?hoy=
 * Horas estudiadas y planificadas por día (lunes a domingo), con el desglose
 * de lo estudiado por asignatura.
 */
export async function getSemana(req, res) {
  const userId = req.user.id;
  const hoy = req.validatedQuery.hoy ?? hoyUTC();
  const lunes = lunesDe(hoy);
  const domingo = sumarDias(lunes, 6);

  const [registros, sesiones] = await Promise.all([
    Progreso.find({ userId, fecha: { $gte: lunes, $lte: domingo } }).select('fecha horasEstudiadas asignaturaId'),
    sesionesEnRango(userId, lunes, domingo),
  ]);
  const asignaturas = await Asignatura.find({ _id: { $in: registros.map((r) => r.asignaturaId) }, userId }).select(
    'nombre color',
  );

  const dias = Array.from({ length: 7 }, (_, i) => {
    const key = diaKey(sumarDias(lunes, i));
    const delDia = registros.filter((r) => diaKey(r.fecha) === key);
    const porAsignatura = new Map();
    for (const r of delDia) {
      const id = String(r.asignaturaId);
      porAsignatura.set(id, (porAsignatura.get(id) ?? 0) + r.horasEstudiadas);
    }
    return {
      fecha: key,
      horasEstudiadas: redondear(delDia.reduce((a, r) => a + r.horasEstudiadas, 0)),
      horasPlanificadas: redondear(
        sesiones.filter((s) => diaKey(s.fecha) === key).reduce((a, s) => a + s.horas, 0),
      ),
      porAsignatura: [...porAsignatura].map(([asignaturaId, horas]) => ({ asignaturaId, horas: redondear(horas) })),
    };
  });

  res.json({
    desde: diaKey(lunes),
    hasta: diaKey(domingo),
    dias,
    horasEstudiadas: redondear(dias.reduce((a, d) => a + d.horasEstudiadas, 0)),
    horasPlanificadas: redondear(dias.reduce((a, d) => a + d.horasPlanificadas, 0)),
    asignaturas: asignaturas.map((a) => ({ _id: a._id, nombre: a.nombre, color: a.color })),
  });
}

/**
 * GET /api/estadisticas/por-tema?asignaturaId=
 * Para cada tema de la asignatura: horas invertidas frente a planificadas y
 * recomendadas. `horasSinTema`: lo registrado en la asignatura sin tema.
 */
export async function getPorTema(req, res) {
  const userId = req.user.id;
  const asignatura = await findOwned(Asignatura, req.validatedQuery.asignaturaId, userId, 'Asignatura no encontrada');
  const [temas, invertidas, examenes] = await Promise.all([
    Tema.find({ userId, asignaturaId: asignatura._id }).sort({ orden: 1, createdAt: 1 }),
    Progreso.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), asignaturaId: asignatura._id } },
      { $unwind: { path: '$temasEstudiados', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$temasEstudiados', horas: { $sum: '$horasEstudiadas' } } },
    ]),
    Examen.find({ userId, asignaturaId: asignatura._id }).select('_id'),
  ]);
  const planes = await PlanEstudio.find({ userId, examenId: { $in: examenes.map((e) => e._id) } }).select(
    'diasPlan.temaId diasPlan.horas',
  );

  const invertidasPor = new Map(invertidas.map((f) => [String(f._id), f.horas]));
  const planificadasPor = new Map();
  for (const s of planes.flatMap((p) => p.diasPlan)) {
    planificadasPor.set(String(s.temaId), (planificadasPor.get(String(s.temaId)) ?? 0) + s.horas);
  }

  res.json({
    asignatura: { _id: asignatura._id, nombre: asignatura.nombre, color: asignatura.color },
    temas: temas.map((t) => ({
      tema: { _id: t._id, nombre: t.nombre, dificultad: t.dificultad, estudiado: t.estudiado },
      horasInvertidas: redondear(invertidasPor.get(String(t._id)) ?? 0),
      horasPlanificadas: redondear(planificadasPor.get(String(t._id)) ?? 0),
      horasRecomendadas: horasRecomendadas(t),
    })),
    horasSinTema: redondear(invertidasPor.get('null') ?? 0),
  });
}

/**
 * GET /api/estadisticas/evolucion?desde=&hasta=
 * Horas por día y acumuladas (desde el primer registro) en el rango. Por
 * defecto, los últimos 30 días.
 */
export async function getEvolucion(req, res) {
  const userId = req.user.id;
  const hasta = req.validatedQuery.hasta ?? hoyUTC();
  const desde = req.validatedQuery.desde ?? sumarDias(hasta, -29);
  const dias = await horasPorDia(userId);

  let acumulado = redondear([...dias].filter(([k]) => k < diaKey(desde)).reduce((a, [, h]) => a + h, 0));
  const serie = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
    const horas = dias.get(diaKey(d)) ?? 0;
    acumulado = redondear(acumulado + horas);
    serie.push({ fecha: diaKey(d), horas, acumulado });
  }
  res.json({ desde: diaKey(desde), hasta: diaKey(hasta), dias: serie });
}

/**
 * Preparación estimada (0-10) para un examen: la mitad por horas estudiadas
 * de sus temas frente a las recomendadas (hasta el 100 %) y la mitad por
 * temas marcados como estudiados. Es una orientación, no una nota real.
 */
function notaEstimada(horas, requeridas, estudiados, total) {
  if (total === 0) return null;
  const cobertura = requeridas > 0 ? Math.min(1, horas / requeridas) : 0;
  return Math.round((0.5 * cobertura + 0.5 * (estudiados / total)) * 100) / 10;
}

/**
 * GET /api/estadisticas/prediccion?hoy=
 * Para cada examen próximo: preparación estimada ahora y si se cumple lo que
 * queda de su plan.
 */
export async function getPrediccion(req, res) {
  const userId = req.user.id;
  const hoy = req.validatedQuery.hoy ?? hoyUTC();
  const examenesDocs = await Examen.find({ userId, fecha: { $gte: hoy } }).sort({ fecha: 1, hora: 1 });
  const temaIds = examenesDocs.flatMap((e) => e.temas);
  const [examenes, temas, invertidas, planes] = await Promise.all([
    conResumen(userId, examenesDocs),
    Tema.find({ _id: { $in: temaIds }, userId }),
    Progreso.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), temasEstudiados: { $in: temaIds } } },
      { $unwind: '$temasEstudiados' },
      { $group: { _id: '$temasEstudiados', horas: { $sum: '$horasEstudiadas' } } },
    ]),
    PlanEstudio.find({ userId, examenId: { $in: examenesDocs.map((e) => e._id) } }),
  ]);
  const temaPorId = new Map(temas.map((t) => [String(t._id), t]));
  const invertidasPor = new Map(invertidas.map((f) => [String(f._id), f.horas]));
  const planPorExamen = new Map(planes.map((p) => [String(p.examenId), p]));

  res.json({
    examenes: examenes.map((examen) => {
      const suyos = examen.temas.map((id) => temaPorId.get(String(id))).filter(Boolean);
      const ids = new Set(suyos.map((t) => String(t._id)));
      const requeridas = suyos.reduce((a, t) => a + horasRecomendadas(t), 0);
      const estudiadas = suyos.reduce((a, t) => a + (invertidasPor.get(String(t._id)) ?? 0), 0);
      const estudiados = suyos.filter((t) => t.estudiado).length;

      // Lo que queda del plan (desde hoy) y qué temas quedarían estudiados al cumplirlo.
      const pendientes = (planPorExamen.get(String(examen._id))?.diasPlan ?? []).filter(
        (s) => !s.completado && s.fecha >= hoy && ids.has(String(s.temaId)),
      );
      const horasPendientes = pendientes.reduce((a, s) => a + s.horas, 0);
      const temasQueSeEstudiarian = new Set(
        pendientes.filter((s) => s.tipo === 'estudio').map((s) => String(s.temaId)),
      );
      const estudiadosConPlan =
        estudiados + suyos.filter((t) => !t.estudiado && temasQueSeEstudiarian.has(String(t._id))).length;

      return {
        examen,
        temas: { total: suyos.length, estudiados },
        horasRecomendadas: redondear(requeridas),
        horasEstudiadas: redondear(estudiadas),
        horasPlanPendientes: redondear(horasPendientes),
        tienePlan: planPorExamen.has(String(examen._id)),
        notaActual: notaEstimada(estudiadas, requeridas, estudiados, suyos.length),
        notaConPlan: notaEstimada(estudiadas + horasPendientes, requeridas, estudiadosConPlan, suyos.length),
      };
    }),
  });
}
