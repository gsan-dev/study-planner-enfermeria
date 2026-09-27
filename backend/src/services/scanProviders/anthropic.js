import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, USER_PROMPT } from './prompt.js';

const client = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey, timeout: 150_000, maxRetries: 1 }) : null;

export const anthropicDisponible = () => client !== null;

/** Envía el archivo a Claude y devuelve el JSON (texto) con las clases. */
export async function extraerConClaude({ mediaType, data }) {
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
      messages: [{ role: 'user', content: [archivo, { type: 'text', text: USER_PROMPT }] }],
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
    if (err instanceof Anthropic.APIError) {
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

  return {
    texto: response.content.find((block) => block.type === 'text')?.text ?? '',
    meta: { proveedor: 'anthropic', model: response.model, input: response.usage.input_tokens, output: response.usage.output_tokens },
  };
}
