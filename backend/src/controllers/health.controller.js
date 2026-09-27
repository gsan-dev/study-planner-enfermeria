import { isDatabaseConnected } from '../config/database.js';

const startedAt = new Date();

/** GET /api/health — lo usan Docker y el frontend para saber si la API está viva. */
export function getHealth(_req, res) {
  const dbConnected = isDatabaseConnected();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    startedAt: startedAt.toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
}
