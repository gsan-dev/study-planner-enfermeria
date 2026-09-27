import { AppError } from '../utils/AppError.js';

// Todo se calcula en cuartos de hora (enteros) para evitar errores de redondeo.
const CUARTOS = 4;

/** Multiplicador de las horas estimadas según la dificultad (1-5). */
export const FACTOR_DIFICULTAD = { 1: 0.7, 2: 0.85, 3: 1, 4: 1.25, 5: 1.5 };

/** Parte del tiempo de estudio de un tema que se reserva para repasarlo. */
const PROPORCION_REPASO = 0.25;

/** Tema sin horas estimadas: se le da al menos media hora. */
const MINIMO_TEMA = 0.5;

const DIA_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" → Date a medianoche UTC. */
export const diaDate = (key) => new Date(`${key}T00:00:00.000Z`);
export const diaKey = (date) => date.toISOString().slice(0, 10);

function diasEntre(inicio, finExclusivo) {
  const dias = [];
  for (let t = diaDate(inicio).getTime(); t < diaDate(finExclusivo).getTime(); t += DIA_MS) {
    dias.push(diaKey(new Date(t)));
  }
  return dias;
}

const aCuartos = (horas) => Math.round(horas * CUARTOS);
const aHoras = (cuartos) => cuartos / CUARTOS;
/** 6.5 → "6,5 h" */
const textoHoras = (cuartos) => `${String(aHoras(cuartos)).replace('.', ',')} h`;

/**
 * Reparte `total` cuartos entre los días en proporción a su capacidad, de
 * forma uniforme (por redondeo acumulado) y sin pasar de la capacidad de cada día.
 */
function repartirUniforme(capacidades, total) {
  const capacidadTotal = capacidades.reduce((a, b) => a + b, 0);
  const presupuesto = [];
  let acumulada = 0;
  let asignado = 0;
  let arrastre = 0;
  for (const capacidad of capacidades) {
    acumulada += capacidad;
    const objetivo = Math.round((total * acumulada) / capacidadTotal);
    const deseado = objetivo - asignado + arrastre;
    const dado = Math.min(capacidad, Math.max(0, deseado));
    arrastre = deseado - dado;
    presupuesto.push(dado);
    asignado = objetivo;
  }
  // Lo que no cupo por redondeo, en los primeros días con hueco.
  for (let i = 0; arrastre > 0 && i < capacidades.length; i += 1) {
    const extra = Math.min(arrastre, capacidades[i] - presupuesto[i]);
    presupuesto[i] += extra;
    arrastre -= extra;
  }
  return presupuesto;
}

/**
 * Genera las sesiones de un plan de estudio.
 *
 * - Cada tema necesita `horasEstimadas × factor de dificultad` de estudio y,
 *   con `repaso`, un 25 % más de repaso que se coloca al final, antes del examen.
 * - Los temas ya estudiados se ignoran, o solo se repasan con `incluirEstudiados`.
 * - Lo ya completado en el plan anterior se descuenta de lo que falta.
 * - La capacidad de cada día es `horasPorDia` menos lo que ya ocupan otros
 *   planes (`ocupadas`); los días de descanso no se usan.
 * - Si no da tiempo, se recorta proporcionalmente (con aviso). Si sobra, la
 *   carga se reparte uniformemente en lugar de concentrarla al principio.
 *
 * @param {object} opts
 * @param {Array<{_id, nombre, dificultad, horasEstimadas, estudiado}>} opts.temas En el orden del temario.
 * @param {string} opts.fechaInicio "YYYY-MM-DD" (incluido)
 * @param {string} opts.fechaExamen "YYYY-MM-DD" (excluido: el día del examen no se planifica)
 * @param {Map<string, number>} [opts.ocupadas] Horas ya ocupadas por día.
 * @param {Map<string, number>} [opts.completadas] Horas ya completadas por "temaId:tipo".
 * @returns {{ sesiones: Array<{fecha, temaId, horas, tipo}>, resumen: object }}
 */
export function generarPlan({
  temas,
  fechaInicio,
  fechaExamen,
  horasPorDia,
  diasDescanso = [],
  repaso = true,
  incluirEstudiados = false,
  ocupadas = new Map(),
  completadas = new Map(),
}) {
  const avisos = [];
  const descanso = new Set(diasDescanso);

  // 1. Días y capacidad
  const dias = diasEntre(fechaInicio, fechaExamen).filter((d) => !descanso.has(diaDate(d).getUTCDay()));
  const capacidades = dias.map((d) => Math.max(0, Math.floor((horasPorDia - (ocupadas.get(d) ?? 0)) * CUARTOS)));
  const capacidadTotal = capacidades.reduce((a, b) => a + b, 0);
  if (dias.length === 0) {
    throw new AppError('No quedan días para estudiar antes del examen. Cambia la fecha de inicio o los días de descanso.', 422, {
      code: 'PLAN_SIN_DIAS',
    });
  }
  if (capacidadTotal === 0) {
    throw new AppError('No te quedan horas libres esos días (otros planes ya las ocupan). Aumenta las horas por día.', 422, {
      code: 'PLAN_SIN_HORAS',
    });
  }
  if (capacidades.some((c, i) => c === 0 && (ocupadas.get(dias[i]) ?? 0) > 0)) {
    avisos.push('Algunos días ya están completos con otros planes y no se han usado.');
  }

  // 2. Lo que necesita cada tema
  const estudio = [];
  const repasos = [];
  for (const tema of temas) {
    if (tema.estudiado && !incluirEstudiados) continue;
    const id = String(tema._id);
    const base = Math.max(MINIMO_TEMA, tema.horasEstimadas) * (FACTOR_DIFICULTAD[tema.dificultad] ?? 1);
    if (!tema.estudiado) {
      const hechas = aCuartos(completadas.get(`${id}:estudio`) ?? 0);
      const falta = aCuartos(base) - hechas;
      if (falta > 0) estudio.push({ temaId: id, tipo: 'estudio', cuartos: Math.max(1, falta) });
    }
    if (repaso) {
      const hechas = aCuartos(completadas.get(`${id}:repaso`) ?? 0);
      const falta = Math.max(1, aCuartos(base * PROPORCION_REPASO)) - hechas;
      if (falta > 0) repasos.push({ temaId: id, tipo: 'repaso', cuartos: falta });
    }
  }
  // Primero se estudia todo (en el orden del temario) y al final se repasa.
  const bloques = [...estudio, ...repasos];
  const necesarias = bloques.reduce((a, b) => a + b.cuartos, 0);
  if (bloques.length === 0) {
    throw new AppError('No hay temas pendientes: todos están estudiados o ya completados en el plan.', 422, {
      code: 'PLAN_SIN_TEMAS',
    });
  }

  // 3. Si no da tiempo, recortar proporcionalmente (mínimo 15 min por bloque)
  if (necesarias > capacidadTotal) {
    if (bloques.length > capacidadTotal) {
      throw new AppError(
        `No da tiempo ni a 15 minutos por tema: necesitas al menos ${textoHoras(bloques.length)} y solo hay ${textoHoras(capacidadTotal)}. Aumenta las horas por día o empieza antes.`,
        422,
        { code: 'PLAN_SIN_TIEMPO' },
      );
    }
    const k = capacidadTotal / necesarias;
    const exactos = bloques.map((b) => b.cuartos * k);
    bloques.forEach((b, j) => {
      b.cuartos = Math.max(1, Math.floor(exactos[j]));
    });
    let diferencia = capacidadTotal - bloques.reduce((a, b) => a + b.cuartos, 0);
    // Faltan cuartos por el redondeo: a los bloques que más perdieron (mayor resto).
    const porResto = bloques.map((b, j) => [b, exactos[j] - b.cuartos]).sort((x, y) => y[1] - x[1]);
    for (let j = 0; diferencia > 0; j = (j + 1) % porResto.length) {
      porResto[j][0].cuartos += 1;
      diferencia -= 1;
    }
    // Sobran (por el mínimo de 15 min): se quitan de los bloques más largos.
    while (diferencia < 0) {
      const mayor = bloques.reduce((m, b) => (b.cuartos > m.cuartos ? b : m));
      mayor.cuartos -= 1;
      diferencia += 1;
    }
    const recorte = Math.round((1 - capacidadTotal / necesarias) * 100);
    avisos.push(
      `Necesitarías ${textoHoras(necesarias)} y solo hay ${textoHoras(capacidadTotal)} disponibles: se ha recortado el tiempo de cada tema un ${recorte} %. Si puedes, aumenta las horas por día o empieza antes.`,
    );
  }

  // 4. Repartir uniformemente y rellenar los días en orden
  const total = bloques.reduce((a, b) => a + b.cuartos, 0);
  const presupuesto = repartirUniforme(capacidades, total);
  const sesiones = new Map();
  let i = 0;
  let restante = bloques[0].cuartos;
  dias.forEach((fecha, d) => {
    let libre = presupuesto[d];
    while (libre > 0 && i < bloques.length) {
      const cuartos = Math.min(libre, restante);
      const { temaId, tipo } = bloques[i];
      const key = `${fecha}:${temaId}:${tipo}`;
      const previa = sesiones.get(key);
      if (previa) previa.cuartos += cuartos;
      else sesiones.set(key, { fecha, temaId, tipo, cuartos });
      libre -= cuartos;
      restante -= cuartos;
      if (restante === 0) {
        i += 1;
        restante = bloques[i]?.cuartos ?? 0;
      }
    }
  });

  const diasUsados = new Set([...sesiones.values()].map((s) => s.fecha)).size;
  return {
    sesiones: [...sesiones.values()].map(({ cuartos, ...s }) => ({ ...s, horas: aHoras(cuartos) })),
    resumen: {
      dias: dias.length,
      diasConEstudio: diasUsados,
      horasNecesarias: aHoras(necesarias),
      horasDisponibles: aHoras(capacidadTotal),
      horasPlanificadas: aHoras(total),
      temasEstudio: estudio.length,
      temasRepaso: repasos.length,
      avisos,
    },
  };
}
