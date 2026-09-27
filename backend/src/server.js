import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

async function start() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, 'API escuchando');
  });

  // Parada limpia: `docker stop` envía SIGTERM.
  const shutdown = (signal) => {
    logger.info({ signal }, 'Cerrando servidor...');
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Servidor cerrado');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Promesa rechazada sin manejar');
  process.exit(1);
});

start().catch((err) => {
  logger.fatal({ err }, 'No se pudo arrancar la API');
  process.exit(1);
});
