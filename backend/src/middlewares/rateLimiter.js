import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const rateLimitResponse = (message) => ({
  error: { message, code: 'RATE_LIMITED' },
});

/**
 * Peticiones hechas desde dentro del propio contenedor (scripts de mantenimiento,
 * como el que recrea la cuenta demo). Todo lo que llega de fuera pasa por Caddy,
 * que viene de otra IP y añade X-Forwarded-For, así que nunca entra aquí.
 */
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const desdeDentro = (req) => LOOPBACK.has(req.socket.remoteAddress) && !req.get('x-forwarded-for');

/** Límite general para toda la API. */
export const apiLimiter = rateLimit({
  skip: desdeDentro,
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse('Demasiadas peticiones, inténtalo de nuevo en unos minutos'),
});

/** Escaneo de horarios: cada llamada cuesta dinero en la API de Anthropic. */
export const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.scanRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse('Has escaneado muchos horarios seguidos, espera un rato antes de volver a intentarlo'),
});

/** Límite estricto para login/registro (fuerza bruta). */
export const authLimiter = rateLimit({
  skip: desdeDentro,
  windowMs: env.rateLimitWindowMs,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: rateLimitResponse('Demasiados intentos de acceso, inténtalo más tarde'),
});
