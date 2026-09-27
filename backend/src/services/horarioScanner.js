import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { anthropicDisponible, extraerConClaude } from './scanProviders/anthropic.js';
import { extraerConGemini, geminiDisponible } from './scanProviders/gemini.js';

export const TIPOS_ARCHIVO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

/**
 * Proveedor de IA para leer horarios: el indicado en SCAN_PROVIDER o, si no,
 * el primero con clave configurada (Gemini, luego Claude). null = desactivado.
 */
function elegirProveedor() {
  const proveedores = { gemini: [geminiDisponible, extraerConGemini], anthropic: [anthropicDisponible, extraerConClaude] };
  if (env.scanProvider) {
    const elegido = proveedores[env.scanProvider];
    return elegido?.[0]() ? { nombre: env.scanProvider, extraer: elegido[1] } : null;
  }
  for (const [nombre, [disponible, extraer]] of Object.entries(proveedores)) {
    if (disponible()) return { nombre, extraer };
  }
  return null;
}

const proveedor = elegirProveedor();
logger.info({ proveedor: proveedor?.nombre ?? 'ninguno' }, 'Escaneo de horarios');

export const escaneoDisponible = () => proveedor !== null;

const claseSchema = z.object({
  asignatura: z.string(),
  dia: z.number().int().min(0).max(6),
  horaInicio: z.string(),
  horaFin: z.string(),
  aula: z.string(),
  profesor: z.string(),
});
const resultadoSchema = z.object({ clases: z.array(z.unknown()), avisos: z.string() });

/** "9:00", "09.00", "9h" → "09:00"; null si no es una hora válida. */
function normalizarHora(valor) {
  const match = /^(\d{1,2})(?:[:.h](\d{2}))?h?$/i.exec(valor.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2] ?? 0);
  if (horas > 23 || minutos > 59) return null;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/**
 * Limpia la salida del modelo: descarta entradas inválidas, quita duplicados
 * y une bloques contiguos de la misma asignatura (tablas con una fila por hora).
 */
export function limpiarClases(clasesCrudas) {
  const validas = [];
  for (const cruda of clasesCrudas) {
    const parsed = claseSchema.safeParse(cruda);
    if (!parsed.success) continue;
    const c = parsed.data;
    const horaInicio = normalizarHora(c.horaInicio);
    const horaFin = normalizarHora(c.horaFin);
    const asignatura = c.asignatura.trim().replace(/\s+/g, ' ');
    if (!asignatura || !horaInicio || !horaFin || horaFin <= horaInicio) continue;
    validas.push({ ...c, asignatura, horaInicio, horaFin, aula: c.aula.trim(), profesor: c.profesor.trim() });
  }

  validas.sort(
    (a, b) => a.asignatura.localeCompare(b.asignatura) || a.dia - b.dia || a.horaInicio.localeCompare(b.horaInicio),
  );

  const resultado = [];
  for (const clase of validas) {
    const prev = resultado.at(-1);
    const mismaSerie = prev && prev.asignatura === clase.asignatura && prev.dia === clase.dia;
    if (mismaSerie && clase.horaInicio <= prev.horaFin) {
      // Solapado o contiguo: se une en un solo bloque.
      if (clase.horaFin > prev.horaFin) prev.horaFin = clase.horaFin;
      prev.aula ||= clase.aula;
      prev.profesor ||= clase.profesor;
      continue;
    }
    resultado.push({ ...clase });
  }
  return resultado;
}

/**
 * Lee un horario (imagen o PDF en base64) y devuelve las clases detectadas.
 * No guarda nada: el usuario revisa el resultado antes.
 */
export async function escanearHorario(archivo) {
  if (!proveedor) {
    throw new AppError('El escaneo de horarios no está configurado en el servidor', 503, { code: 'SCAN_NOT_CONFIGURED' });
  }

  const { texto, meta } = await proveedor.extraer(archivo);

  let parsed;
  try {
    parsed = resultadoSchema.parse(JSON.parse(texto));
  } catch {
    logger.error({ proveedor: meta.proveedor, texto: texto.slice(0, 500) }, 'Respuesta de escaneo con formato inesperado');
    throw new AppError('No se pudo interpretar el horario, inténtalo de nuevo', 502, { code: 'SCAN_FAILED' });
  }

  logger.info(meta, 'Horario escaneado');
  return { clases: limpiarClases(parsed.clases), avisos: parsed.avisos.trim() };
}
