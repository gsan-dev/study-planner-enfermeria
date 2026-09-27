import { ApiError, GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, USER_PROMPT } from './prompt.js';

const client = env.geminiApiKey ? new GoogleGenAI({ apiKey: env.geminiApiKey }) : null;

export const geminiDisponible = () => client !== null;

// Modelo principal y, si está saturado, los alternativos en orden.
const MODELOS = [...new Set([env.geminiModel, ...env.geminiFallbackModels])];

// Saturación o fallo del servidor: el SDK reintenta con espera y luego se cambia de modelo.
const REINTENTABLES = [408, 500, 502, 503, 504];
// Cuota agotada (el plan gratuito da 20 peticiones al día por modelo): reintentar no sirve,
// se pasa directamente al siguiente modelo, que tiene su propia cuota.
const CUOTA_AGOTADA = 429;
// Modelo retirado o no disponible para esta clave: se pasa directamente al siguiente.
const MODELO_NO_DISPONIBLE = 404;
// Tiempo máximo total probando modelos (el navegador espera hasta 3 minutos).
const PLAZO_MS = 120_000;

// Motivos de parada que indican que Google ha bloqueado el contenido.
const BLOQUEOS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT', 'RECITATION']);

function generar(model, { mediaType, data }) {
  return client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mediaType, data } }, { text: USER_PROMPT }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      // Salida estructurada: la respuesta es JSON que cumple el esquema.
      responseMimeType: 'application/json',
      responseJsonSchema: OUTPUT_SCHEMA,
      httpOptions: {
        timeout: 90_000,
        retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 8, httpStatusCodes: REINTENTABLES },
      },
    },
  });
}

/** Envía el archivo a Gemini y devuelve el JSON (texto) con las clases. */
export async function extraerConGemini(archivo) {
  let response;
  let model;
  let soloCuota = true;
  const inicio = Date.now();
  for (const candidato of MODELOS) {
    if (Date.now() - inicio > PLAZO_MS) break;
    model = candidato;
    try {
      response = await generar(model, archivo);
      break;
    } catch (err) {
      if (!(err instanceof ApiError)) {
        logger.error({ model, err: err.message }, 'No se pudo conectar con Gemini');
        throw new AppError('El servicio de escaneo no responde, inténtalo de nuevo', 502, { code: 'SCAN_FAILED' });
      }
      logger.warn({ model, status: err.status, err: err.message.slice(0, 300) }, 'Error de la API de Gemini');
      if (err.status === 401 || err.status === 403) {
        throw new AppError('El escaneo de horarios no está bien configurado en el servidor', 503, { code: 'SCAN_NOT_CONFIGURED' });
      }
      if (err.status === 400) {
        throw AppError.badRequest('No se pudo leer el archivo. Prueba con una foto más nítida o un PDF.');
      }
      const saltarModelo = [MODELO_NO_DISPONIBLE, CUOTA_AGOTADA, ...REINTENTABLES].includes(err.status);
      if (!saltarModelo) {
        throw new AppError('El servicio de escaneo no responde, inténtalo de nuevo', 502, { code: 'SCAN_FAILED' });
      }
      if (err.status !== CUOTA_AGOTADA && err.status !== MODELO_NO_DISPONIBLE) soloCuota = false;
      // Saturado tras los reintentos, sin cuota o no disponible: se prueba con el siguiente.
    }
  }
  if (!response) {
    if (soloCuota) {
      throw new AppError('Se ha alcanzado el límite diario de escaneos. Podrás volver a escanear mañana; mientras, puedes editar el horario a mano.', 429, { code: 'SCAN_QUOTA' });
    }
    throw new AppError('El servicio de escaneo está saturado ahora mismo, inténtalo en unos minutos', 503, { code: 'SCAN_BUSY' });
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || BLOQUEOS.has(finishReason)) {
    logger.warn({ model, blockReason: response.promptFeedback?.blockReason, finishReason }, 'Gemini bloqueó el escaneo');
    throw new AppError('No se ha podido procesar este archivo', 422, { code: 'SCAN_REFUSED' });
  }
  if (finishReason === 'MAX_TOKENS') {
    throw new AppError('El horario es demasiado extenso para leerlo de una vez', 422, { code: 'SCAN_TOO_LARGE' });
  }

  const usage = response.usageMetadata;
  return {
    texto: response.text ?? '',
    meta: { proveedor: 'gemini', model, input: usage?.promptTokenCount, output: usage?.candidatesTokenCount },
  };
}
