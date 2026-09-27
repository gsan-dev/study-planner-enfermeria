import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';

export const TIPOS_ARCHIVO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const client = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey, timeout: 150_000, maxRetries: 1 }) : null;

export const escaneoDisponible = () => client !== null;

const SYSTEM_PROMPT = `Extraes horarios de clase a partir de fotos, capturas o PDF de horarios universitarios (normalmente del Grado en Enfermería, en España). La persona revisará el resultado en una tabla antes de guardarlo, así que prioriza la fidelidad a lo que aparece en el documento.

Devuelve una entrada en "clases" por cada bloque de clase que aparezca en la semana:
- "asignatura": el nombre tal como aparece. Si el horario usa siglas y tiene una leyenda que las explica, usa el nombre completo de la leyenda; si no, deja las siglas. Usa el mismo texto exacto para todos los bloques de una misma asignatura, aunque sean de teoría, prácticas o seminario; si el tipo de sesión aparece, no lo incluyas en el nombre.
- "dia": 1 = lunes, 2 = martes, 3 = miércoles, 4 = jueves, 5 = viernes, 6 = sábado, 0 = domingo.
- "horaInicio" y "horaFin": formato 24 h "HH:mm". Si un bloque ocupa varias filas de la tabla, usa la hora de inicio de la primera y la de fin de la última.
- "aula" y "profesor": el texto si aparece junto al bloque; si no, cadena vacía.

Si el documento tiene varias semanas o grupos distintos, extrae la semana o grupo más completo o el primero, y explícalo en "avisos". Usa también "avisos" para cualquier cosa dudosa (texto ilegible, horas que no se leen bien). Si la imagen no es un horario de clases, devuelve "clases" vacío y explica el motivo en "avisos". Escribe los avisos en español, en frases breves; deja "avisos" vacío si no hay nada que señalar.`;

// Esquema de salida estructurada (JSON Schema): la respuesta siempre lo cumple.
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    clases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          asignatura: { type: 'string' },
          dia: { type: 'integer', enum: [0, 1, 2, 3, 4, 5, 6] },
          horaInicio: { type: 'string' },
          horaFin: { type: 'string' },
          aula: { type: 'string' },
          profesor: { type: 'string' },
        },
        required: ['asignatura', 'dia', 'horaInicio', 'horaFin', 'aula', 'profesor'],
        additionalProperties: false,
      },
    },
    avisos: { type: 'string' },
  },
  required: ['clases', 'avisos'],
  additionalProperties: false,
};

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
export async function escanearHorario({ mediaType, data }) {
  if (!client) {
    throw new AppError('El escaneo de horarios no está configurado en el servidor', 503, { code: 'SCAN_NOT_CONFIGURED' });
  }

  const archivo =
    mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data } };

  let response;
  try {
    response = await client.beta.messages.create({
      model: env.anthropicModel,
      max_tokens: 16000,
      // Si el modelo rechaza la petición, la API la reintenta con el modelo alternativo recomendado.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [archivo, { type: 'text', text: 'Extrae las clases de este horario.' }],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      logger.error({ err: err.message }, 'Clave de Anthropic inválida');
      throw new AppError('El escaneo de horarios no está bien configurado en el servidor', 503, { code: 'SCAN_NOT_CONFIGURED' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AppError('El servicio de escaneo está saturado, inténtalo en unos minutos', 429, { code: 'SCAN_BUSY' });
    }
    if (err instanceof Anthropic.BadRequestError) {
      logger.warn({ err: err.message }, 'Petición de escaneo rechazada');
      throw AppError.badRequest('No se pudo leer el archivo. Prueba con una foto más nítida o un PDF.');
    }
    if (err instanceof Anthropic.APIError || err instanceof Anthropic.APIConnectionError) {
      logger.error({ err: err.message, status: err.status }, 'Error llamando a la API de Anthropic');
      throw new AppError('El servicio de escaneo no responde, inténtalo de nuevo', 502, { code: 'SCAN_FAILED' });
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    throw new AppError('No se ha podido procesar este archivo', 422, { code: 'SCAN_REFUSED' });
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AppError('El horario es demasiado extenso para leerlo de una vez', 422, { code: 'SCAN_TOO_LARGE' });
  }

  const texto = response.content.find((block) => block.type === 'text')?.text ?? '';
  let parsed;
  try {
    parsed = resultadoSchema.parse(JSON.parse(texto));
  } catch {
    logger.error({ texto: texto.slice(0, 500) }, 'Respuesta de escaneo con formato inesperado');
    throw new AppError('No se pudo interpretar el horario, inténtalo de nuevo', 502, { code: 'SCAN_FAILED' });
  }

  logger.info(
    { model: response.model, input: response.usage.input_tokens, output: response.usage.output_tokens },
    'Horario escaneado',
  );

  return { clases: limpiarClases(parsed.clases), avisos: parsed.avisos.trim() };
}
