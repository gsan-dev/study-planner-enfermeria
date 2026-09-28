import { EntradaDiario, Examen, Tarea } from '../models/index.js';
import { diaKey } from '../services/planGenerator.js';
import { sesionesEnRango } from '../services/sesionesPlan.js';
import { conResumen } from './examenes.controller.js';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Cuadrícula del mes: del lunes de la primera semana al domingo de la última. */
function cuadricula(mes) {
  const [anio, m] = mes.split('-').map(Number);
  const primero = new Date(Date.UTC(anio, m - 1, 1));
  const ultimo = new Date(Date.UTC(anio, m, 0));
  const desde = new Date(primero.getTime() - ((primero.getUTCDay() + 6) % 7) * DIA_MS);
  const hasta = new Date(ultimo.getTime() + ((7 - ultimo.getUTCDay()) % 7) * DIA_MS);
  return { desde, hasta };
}

/**
 * GET /api/calendario/mes?mes=YYYY-MM
 * Información por día de la cuadrícula del mes (incluye los días de los meses
 * vecinos que se ven): exámenes, estudio agrupado por asignatura, tareas y
 * diario. También la leyenda de asignaturas que aparecen.
 */
export async function getMes(req, res) {
  const userId = req.user.id;
  const { mes } = req.validatedQuery;
  const { desde, hasta } = cuadricula(mes);
  const rango = { $gte: desde, $lte: hasta };

  const [examenesDocs, sesiones, tareas, diario] = await Promise.all([
    Examen.find({ userId, fecha: rango }).sort({ fecha: 1, hora: 1 }),
    sesionesEnRango(userId, desde, hasta),
    Tarea.find({ userId, fecha: rango }).select('fecha hecho'),
    EntradaDiario.find({ userId, fecha: rango }).select('fecha animo'),
  ]);
  const examenes = await conResumen(userId, examenesDocs);

  const leyenda = new Map();
  const dias = [];
  for (let t = desde.getTime(); t <= hasta.getTime(); t += DIA_MS) {
    const key = diaKey(new Date(t));
    const delDia = (lista) => lista.filter((x) => diaKey(x.fecha) === key);

    // Estudio del día agrupado por asignatura (un bloque por asignatura).
    const estudio = new Map();
    for (const s of delDia(sesiones)) {
      const id = String(s.asignatura?._id ?? 'sin-asignatura');
      const bloque = estudio.get(id) ?? { asignatura: s.asignatura, horas: 0, horasCompletadas: 0, sesiones: [] };
      bloque.horas += s.horas;
      if (s.completado) bloque.horasCompletadas += s.horas;
      bloque.sesiones.push({
        _id: s._id,
        planId: s.planId,
        examenId: s.examenId,
        tema: s.tema,
        horas: s.horas,
        tipo: s.tipo,
        completado: s.completado,
      });
      estudio.set(id, bloque);
      if (s.asignatura) leyenda.set(id, s.asignatura);
    }

    const examenesDia = delDia(examenes);
    for (const e of examenesDia) if (e.asignatura) leyenda.set(String(e.asignatura._id), e.asignatura);
    const tareasDia = delDia(tareas);
    const entrada = delDia(diario)[0];

    dias.push({
      fecha: key,
      examenes: examenesDia,
      estudio: [...estudio.values()],
      tareas: { total: tareasDia.length, hechas: tareasDia.filter((x) => x.hecho).length },
      diario: entrada ? { animo: entrada.animo ?? null } : null,
    });
  }

  res.json({
    mes,
    desde: diaKey(desde),
    hasta: diaKey(hasta),
    dias,
    asignaturas: [...leyenda.values()]
      .map((a) => ({ _id: a._id, nombre: a.nombre, color: a.color }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  });
}
