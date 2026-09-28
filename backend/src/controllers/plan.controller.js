import { Examen, PlanEstudio, Tema, User } from '../models/index.js';
import { diaKey, generarPlan } from '../services/planGenerator.js';
import { sincronizarProgresoPlan } from '../services/progreso.js';
import { AppError } from '../utils/AppError.js';
import { findOwned } from '../utils/ownership.js';

const NOT_FOUND = 'Plan de estudio no encontrado';
const EXAMEN_NOT_FOUND = 'Examen no encontrado';

const hoyKey = () => new Date().toISOString().slice(0, 10);
const porFecha = (a, b) => a.fecha - b.fecha || String(a.temaId).localeCompare(String(b.temaId));

async function temasDelExamen(examen, userId) {
  return Tema.find({ _id: { $in: examen.temas }, userId }).sort({ orden: 1, createdAt: 1 });
}

/** Horas por día que ya ocupan los planes de los demás exámenes. */
async function horasOcupadas(userId, examenId) {
  const otros = await PlanEstudio.find({ userId, examenId: { $ne: examenId } }).select('diasPlan.fecha diasPlan.horas');
  const ocupadas = new Map();
  for (const plan of otros) {
    for (const s of plan.diasPlan) ocupadas.set(diaKey(s.fecha), (ocupadas.get(diaKey(s.fecha)) ?? 0) + s.horas);
  }
  return ocupadas;
}

function comprobarTemas(examen, temaIds) {
  const delExamen = new Set(examen.temas.map(String));
  if (temaIds.some((id) => !delExamen.has(String(id)))) {
    throw AppError.badRequest('Algún tema no entra en este examen', { diasPlan: 'Algún tema no entra en este examen' });
  }
}

function comprobarFechas(examen, fechas) {
  if (fechas.some((f) => f >= examen.fecha)) {
    throw AppError.badRequest('Las sesiones tienen que ser antes del día del examen', {
      diasPlan: 'Las sesiones tienen que ser antes del día del examen',
    });
  }
}

/** Crea o sustituye el plan del examen (hay uno por examen). */
async function guardarPlan(userId, examenId, datos) {
  const existente = await PlanEstudio.findOne({ userId, examenId });
  let plan;
  if (existente) {
    existente.set(datos);
    plan = await existente.save();
  } else {
    plan = await PlanEstudio.create({ ...datos, userId, examenId });
  }
  // Las horas de las sesiones completadas cuentan como estudiadas.
  await sincronizarProgresoPlan(plan);
  return plan;
}

/**
 * POST /api/plan-estudio/generar-automatico
 * Genera el plan con el algoritmo. Con `guardar: false` (por defecto) solo
 * devuelve la vista previa. Las sesiones ya completadas del plan anterior se
 * conservan y se descuentan de lo que falta.
 */
export async function generarAutomatico(req, res) {
  const userId = req.user.id;
  const { examenId, guardar, ...params } = req.body;
  const examen = await findOwned(Examen, examenId, userId, EXAMEN_NOT_FOUND);
  const [temas, user, anterior, ocupadas] = await Promise.all([
    temasDelExamen(examen, userId),
    User.findById(userId),
    PlanEstudio.findOne({ userId, examenId }),
    horasOcupadas(userId, examenId),
  ]);
  if (temas.length === 0) {
    throw new AppError('El examen no tiene temas asignados. Elige qué temas entran antes de generar el plan.', 422, {
      code: 'PLAN_SIN_TEMAS',
    });
  }

  const fechaInicio = params.fechaInicio ? diaKey(params.fechaInicio) : hoyKey();
  const horasPorDia = params.horasPorDia ?? Math.max(0.5, user?.horasEstudioDiarias || 3);

  // Lo completado se mantiene: cuenta como hecho y ocupa su hueco de ese día.
  const temasIds = new Set(temas.map((t) => String(t._id)));
  const completadas = (anterior?.diasPlan ?? []).filter((s) => s.completado && temasIds.has(String(s.temaId)));
  const hechas = new Map();
  for (const s of completadas) {
    const clave = `${s.temaId}:${s.tipo}`;
    hechas.set(clave, (hechas.get(clave) ?? 0) + s.horas);
    ocupadas.set(diaKey(s.fecha), (ocupadas.get(diaKey(s.fecha)) ?? 0) + s.horas);
  }

  const { sesiones, resumen } = generarPlan({
    temas,
    fechaInicio,
    fechaExamen: diaKey(examen.fecha),
    horasPorDia,
    diasDescanso: params.diasDescanso,
    repaso: params.repaso,
    incluirEstudiados: params.incluirEstudiados,
    ocupadas,
    completadas: hechas,
  });

  const datos = {
    tipo: 'automatico',
    horasPorDia,
    fechaInicio: new Date(`${fechaInicio}T00:00:00.000Z`),
    diasDescanso: params.diasDescanso,
    repaso: params.repaso,
    incluirEstudiados: params.incluirEstudiados,
    diasPlan: [
      ...completadas.map((s) => s.toObject()),
      ...sesiones.map((s) => ({ ...s, fecha: new Date(`${s.fecha}T00:00:00.000Z`), completado: false })),
    ].sort(porFecha),
  };

  if (!guardar) {
    res.json({ plan: { ...datos, examenId: examen._id }, resumen, guardado: false });
    return;
  }
  const plan = await guardarPlan(userId, examen._id, datos);
  res.status(anterior ? 200 : 201).json({ plan, resumen, guardado: true });
}

/**
 * POST /api/plan-estudio/crear-manual
 * Guarda un plan hecho a mano (o una vista previa del generador retocada).
 * Sustituye al plan anterior del examen.
 */
export async function crearManual(req, res) {
  const userId = req.user.id;
  const { examenId, diasPlan, ...params } = req.body;
  const examen = await findOwned(Examen, examenId, userId, EXAMEN_NOT_FOUND);
  comprobarTemas(examen, diasPlan.map((s) => s.temaId));
  comprobarFechas(examen, diasPlan.map((s) => s.fecha));

  // Conserva cuándo se completó cada sesión que ya estaba hecha.
  const anterior = await PlanEstudio.findOne({ userId, examenId });
  const completadoEn = new Map(
    (anterior?.diasPlan ?? [])
      .filter((s) => s.completado)
      .map((s) => [`${diaKey(s.fecha)}:${s.temaId}:${s.tipo}`, s.completadoEn]),
  );
  const idsAnteriores = new Set((anterior?.diasPlan ?? []).map((s) => String(s._id)));

  const plan = await guardarPlan(userId, examen._id, {
    ...params,
    horasPorDia: params.horasPorDia ?? anterior?.horasPorDia,
    fechaInicio: params.fechaInicio ?? diasPlan.map((s) => s.fecha).sort((a, b) => a - b)[0],
    diasPlan: diasPlan
      // Solo se respeta el id de sesiones que ya eran de este plan.
      .map(({ _id, ...s }) => (_id && idsAnteriores.has(_id) ? { _id, ...s } : s))
      .map((s) => ({
        ...s,
        completadoEn: s.completado
          ? (completadoEn.get(`${diaKey(s.fecha)}:${s.temaId}:${s.tipo}`) ?? new Date())
          : undefined,
      }))
      .sort(porFecha),
  });
  res.status(anterior ? 200 : 201).json({ plan });
}

/** GET /api/plan-estudio — resumen de todos los planes (para la página de planes). */
export async function listPlanes(req, res) {
  const planes = await PlanEstudio.find({ userId: req.user.id });
  const hoy = hoyKey();
  res.json({
    planes: planes.map((plan) => {
      const total = plan.diasPlan.reduce((a, s) => a + s.horas, 0);
      const hechas = plan.diasPlan.filter((s) => s.completado).reduce((a, s) => a + s.horas, 0);
      const proxima = plan.diasPlan
        .filter((s) => !s.completado && diaKey(s.fecha) >= hoy)
        .map((s) => s.fecha)
        .sort((a, b) => a - b)[0];
      const atrasadas = plan.diasPlan.filter((s) => !s.completado && diaKey(s.fecha) < hoy).length;
      return {
        _id: plan._id,
        examenId: plan.examenId,
        tipo: plan.tipo,
        horasPorDia: plan.horasPorDia,
        sesiones: plan.diasPlan.length,
        porcentajeCompletado: plan.porcentajeCompletado,
        horasTotales: total,
        horasCompletadas: hechas,
        proximaSesion: proxima ?? null,
        sesionesAtrasadas: atrasadas,
        updatedAt: plan.updatedAt,
      };
    }),
  });
}

/** GET /api/plan-estudio/:examenId — el plan del examen, o `null` si aún no tiene. */
export async function getPlan(req, res) {
  const examen = await findOwned(Examen, req.params.examenId, req.user.id, EXAMEN_NOT_FOUND);
  const plan = await PlanEstudio.findOne({ userId: req.user.id, examenId: examen._id });
  res.json({ plan });
}

/**
 * PUT /api/plan-estudio/:id/dia
 * Cambia una sesión: completarla, cambiar el tema, las horas o el día.
 * Al completar la última sesión de estudio de un tema, el tema queda
 * marcado como estudiado.
 */
export async function actualizarDia(req, res) {
  const userId = req.user.id;
  const plan = await findOwned(PlanEstudio, req.params.id, userId, NOT_FOUND);
  const { diaId, ...cambios } = req.body;
  const sesion = plan.diasPlan.id(diaId);
  if (!sesion) throw AppError.notFound('Sesión no encontrada');

  if (cambios.temaId || cambios.fecha) {
    const examen = await findOwned(Examen, plan.examenId, userId, EXAMEN_NOT_FOUND);
    if (cambios.temaId) comprobarTemas(examen, [cambios.temaId]);
    if (cambios.fecha) comprobarFechas(examen, [cambios.fecha]);
  }
  if (cambios.completado !== undefined && cambios.completado !== sesion.completado) {
    sesion.completadoEn = cambios.completado ? new Date() : undefined;
  }
  sesion.set(cambios);

  const dia = diaKey(sesion.fecha);
  const delDia = plan.diasPlan.filter((s) => diaKey(s.fecha) === dia);
  if (delDia.some((s) => s !== sesion && String(s.temaId) === String(sesion.temaId) && s.tipo === sesion.tipo && s.completado === sesion.completado)) {
    throw AppError.badRequest('Ese tema ya está ese día en el plan');
  }
  if (delDia.reduce((a, s) => a + s.horas, 0) > 16) {
    throw AppError.badRequest('Ese día tendría más de 16 horas de estudio');
  }
  plan.diasPlan.sort(porFecha);
  await plan.save();
  await sincronizarProgresoPlan(plan);

  let temaEstudiado = null;
  if (cambios.completado && sesion.tipo === 'estudio') {
    const pendientes = plan.diasPlan.some(
      (s) => String(s.temaId) === String(sesion.temaId) && s.tipo === 'estudio' && !s.completado,
    );
    if (!pendientes) {
      const { modifiedCount } = await Tema.updateOne(
        { _id: sesion.temaId, userId, estudiado: false },
        { estudiado: true, fechaEstudiado: new Date() },
      );
      if (modifiedCount > 0) temaEstudiado = sesion.temaId;
    }
  }

  res.json({ plan, temaEstudiado });
}

/** DELETE /api/plan-estudio/:id */
export async function deletePlan(req, res) {
  const plan = await findOwned(PlanEstudio, req.params.id, req.user.id, NOT_FOUND);
  await plan.deleteOne();
  res.status(204).end();
}
