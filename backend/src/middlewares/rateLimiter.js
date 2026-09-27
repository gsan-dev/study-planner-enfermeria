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

/** Límite estricto para login/registro (fuerza bruta). */
export const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: rateLimitResponse('Demasiados intentos de acceso, inténtalo más tarde'),
});
