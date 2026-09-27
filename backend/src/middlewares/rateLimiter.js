import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const rateLimitResponse = (message) => ({
  error: { message, code: 'RATE_LIMITED' },
});

/** Límite general para toda la API. */
export const apiLimiter = rateLimit({
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
  windowMs: env.rateLimitWindowMs,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: rateLimitResponse('Demasiados intentos de acceso, inténtalo más tarde'),
});
