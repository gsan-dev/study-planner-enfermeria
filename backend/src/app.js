import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { corsMiddleware } from './middlewares/cors.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // Detrás de Caddy, para que el rate limit vea la IP real del cliente.
  app.set('trust proxy', env.trustProxy);
  app.disable('x-powered-by');

  app.use(requestLogger);
  app.use(helmet());
  app.use(corsMiddleware);
  // El escaneo de horarios recibe la imagen/PDF en base64: necesita un límite mayor.
  app.use('/api/horario/escanear', express.json({ limit: '15mb' }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
