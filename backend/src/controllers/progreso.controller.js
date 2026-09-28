import mongoose from 'mongoose';
import { Asignatura, Examen, PlanEstudio, Progreso, Tema } from '../models/index.js';
import { hoyUTC, lunesDe, primeroDeMes, sumarDias } from '../services/fechas.js';
import { diaKey, horasRecomendadas } from '../services/planGenerator.js';
import { horasPorDia } from '../services/progreso.js';
import { AppError } from '../utils/AppError.js';
import { findOwned } from '../utils/ownership.js';

const redondear = (n) => Math.round(n * 100) / 100;
const suma = (lista, campo) => redondear(lista.reduce((a, x) => a + x[campo], 0));

/** Registro con su asignatura y tema, para listarlo. */
async function conNombres(userId, registros) {
  const [asignaturas, temas] = await Promise.all([
    Asignatura.find({ _id: { $in: registros.map((r) => r.asignaturaId) }, userId }).select('nombre color'),
    Tema.find({ _id: { $in: registros.flatMap((r) => r.temasEstudiados) }, userId }).select('nombre'),
  ]);
  const asignaturaPorId = new Map(asignaturas.map((a) => [String(a._id), a]));
  const temaPorId = new Map(temas.map((t) => [String(t._id), t.nombre]));
  return registros.map((r) => {
    const asignatura = asignaturaPorId.get(String(r.asignaturaId));
    return {
      ...r.toJSON(),
      asignatura: asignatura ? { _id: asignatura._id, nombre: asignatura.nombre, color: asignatura.color } : null,
      temas: r.temasEstudiados.map((id) => ({ _id: id, nombre: temaPorId.get(String(id)) ?? 'Tema eliminado' })),
    };
  });
}

/** POST /api/progreso/registrar-horas — horas estudiadas a mano en un tema o una asignatura. */
export async function registrarHoras(req, res) {
  const userId = req.user.id;
  const { fecha, horas, temaId, asignaturaId, notas } = req.body;
  let asignatura;
  if (temaId) {
    const tema = await findOwned(Tema, temaId, userId, 'Tema no encontrado');
    if (asignaturaId && String(tema.asignaturaId) !== asignaturaId) {
      throw AppError.badRequest('El tema no es de esa asignatura', { temaId: 'El tema no es de esa asignatura' });
    }
    asignatura = await findOwned(Asignatura, tema.asignaturaId, userId, 'Asignatura no encontrada');
  } else {
    asignatura = await findOwned(Asignatura, asignaturaId, userId, 'Asignatura no encontrada');
  }

  const registro = await Progreso.create({
    userId,
    fecha,
    horasEstudiadas: horas,
    asignaturaId: asignatura._id,
    temasEstudiados: temaId ? [temaId] : [],
    notas,
    origen: 'manual',
  });
  const [conDatos] = await conNombres(userId, [registro]);
  res.status(201).json({ registro: conDatos });
}

/** GET /api/progreso?limite= — últimos registros de horas. */
export async function listRegistros(req, res) {
  const registros = await Progreso.find({ userId: req.user.id })
    .sort({ fecha: -1, createdAt: -1 })
    .limit(req.validatedQuery.limite);
  res.json({ registros: await conNombres(req.user.id, registros) });
}

/** DELETE /api/progreso/:id — solo los registros a mano; los del plan se quitan desmarcando la sesión. */
export async function borrarRegistro(req, res) {
  const registro = await findOwned(Progreso, req.params.id, req.user.id, 'Registro no encontrado');
  if (registro.origen === 'plan') {
    throw AppError.badRequest('Estas horas vienen de una sesión del plan: desmárcala en el plan para quitarlas');
  }
  await registro.deleteOne();
  res.status(204).end();
}

/**
 * Racha actual (días seguidos con estudio hasta hoy; si hoy aún no hay nada,
 * hasta ayer) y la mejor racha.
 */
function rachas(dias, hoy) {
  const conEstudio = (d) => (dias.get(diaKey(d)) ?? 0) > 0;
  let dia = conEstudio(hoy) ? hoy : sumarDias(hoy, -1);
  let actual = 0;
  while (conEstudio(dia)) {
    actual += 1;
    dia = sumarDias(dia, -1);
  }
  const ordenados = [...dias.keys()].filter((k) => dias.get(k) > 0).sort();
  let mejor = 0;
  let seguidos = 0;
  let anterior = null;
  for (const key of ordenados) {
    const fecha = new Date(`${key}T00:00:00.000Z`);
    seguidos = anterior && sumarDias(anterior, 1).getTime() === fecha.getTime() ? seguidos + 1 : 1;
    mejor = Math.max(mejor, seguidos);
    anterior = fecha;
  }
  return { actual, mejor };
}

/** GET /api/progreso/resumen?hoy= — cifras generales de progreso. */
export async function getResumen(req, res) {
  const userId = req.user.id;
  const hoy = req.validatedQuery.hoy ?? hoyUTC();
  const [dias, temasTotal, temasEstudiados] = await Promise.all([
    horasPorDia(userId),
    Tema.countDocuments({ userId }),
    Tema.countDocuments({ userId, estudiado: true }),
  ]);

  const entre = (desde, hasta) =>
    redondear([...dias].filter(([k]) => k >= diaKey(desde) && k <= diaKey(hasta)).reduce((a, [, h]) => a + h, 0));
  const racha = rachas(dias, hoy);

  res.json({
    horasTotales: redondear([...dias.values()].reduce((a, h) => a + h, 0)),
    horasHoy: dias.get(diaKey(hoy)) ?? 0,
    horasSemana: entre(lunesDe(hoy), sumarDias(lunesDe(hoy), 6)),
    horasMes: entre(primeroDeMes(hoy), hoy),
    // Media de los últimos 30 días (incluido hoy), contando los días sin estudio.
    mediaDiaria: redondear(entre(sumarDias(hoy, -29), hoy) / 30),
    diasEstudiados: [...dias.values()].filter((h) => h > 0).length,
    racha: racha.actual,
    mejorRacha: racha.mejor,
    temas: { total: temasTotal, estudiados: temasEstudiados },
  });
}

/**
 * GET /api/progreso/por-asignatura?periodo=semana|mes|todo&hoy=
 * Por asignatura: horas estudiadas (en el periodo), planificadas en sus planes,
 * recomendadas para todo su temario y temas estudiados.
 */
export async function getPorAsignatura(req, res) {
  const userId = req.user.id;
  const { periodo } = req.validatedQuery;
  const hoy = req.validatedQuery.hoy ?? hoyUTC();
  const desde = periodo === 'semana' ? lunesDe(hoy) : periodo === 'mes' ? primeroDeMes(hoy) : null;
  const hasta = periodo === 'semana' ? sumarDias(lunesDe(hoy), 6) : hoy;

  const [horas, asignaturas, temas, examenes] = await Promise.all([
    Progreso.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          ...(desde ? { fecha: { $gte: desde, $lte: hasta } } : {}),
        },
      },
      { $group: { _id: '$asignaturaId', horas: { $sum: '$horasEstudiadas' } } },
    ]),
    Asignatura.find({ userId }).select('nombre color archivada').sort({ nombre: 1 }).collation({ locale: 'es', strength: 1 }),
    Tema.find({ userId }).select('asignaturaId estudiado horasEstimadas dificultad'),
    Examen.find({ userId }).select('asignaturaId'),
  ]);
  const planes = await PlanEstudio.find({ userId, examenId: { $in: examenes.map((e) => e._id) } }).select(
    'examenId diasPlan.horas',
  );

  const horasPor = new Map(horas.map((h) => [String(h._id), h.horas]));
  const asignaturaDeExamen = new Map(examenes.map((e) => [String(e._id), String(e.asignaturaId)]));
  const planificadas = new Map();
  for (const plan of planes) {
    const id = asignaturaDeExamen.get(String(plan.examenId));
    planificadas.set(id, (planificadas.get(id) ?? 0) + plan.diasPlan.reduce((a, s) => a + s.horas, 0));
  }

  const filas = asignaturas
    // Las archivadas solo si tienen horas en el periodo.
    .filter((a) => !a.archivada || horasPor.get(String(a._id)))
    .map((a) => {
      const id = String(a._id);
      const suyos = temas.filter((t) => String(t.asignaturaId) === id);
      const estudiados = suyos.filter((t) => t.estudiado).length;
      return {
        asignatura: { _id: a._id, nombre: a.nombre, color: a.color, archivada: a.archivada },
        horasEstudiadas: redondear(horasPor.get(id) ?? 0),
        horasPlanificadas: redondear(planificadas.get(id) ?? 0),
        horasRecomendadas: suma(suyos.map((t) => ({ h: horasRecomendadas(t) })), 'h'),
        temas: { total: suyos.length, estudiados },
        porcentajeTemario: suyos.length > 0 ? Math.round((estudiados / suyos.length) * 100) : 0,
      };
    });

  res.json({
    periodo,
    desde: desde ?? null,
    hasta,
    asignaturas: filas,
    horasTotales: suma(filas, 'horasEstudiadas'),
  });
}
