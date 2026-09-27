import cors from 'cors';
import { env } from '../config/env.js';

const allowAll = env.corsOrigins.includes('*');

/**
 * CORS: con CORS_ORIGINS="*" se acepta cualquier origen (la autenticación va
 * por cabecera Bearer, no por cookies, así que no hacen falta credenciales).
 * Con una lista de dominios, solo se aceptan esos.
 */
export const corsMiddleware = cors({
  origin: allowAll ? '*' : env.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
  maxAge: 86400,
});
