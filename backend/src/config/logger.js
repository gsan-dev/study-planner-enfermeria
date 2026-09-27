import pino from 'pino';
import { env } from './env.js';

// En desarrollo se usa pino-pretty si está instalado; en producción, JSON
// estructurado por stdout (lo recoge `docker compose logs`).
const transport = env.isProduction
  ? undefined
  : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } };

export const logger = pino({
  level: env.logLevel,
  transport,
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
});
