import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

mongoose.set('strictQuery', true);

mongoose.connection.on('disconnected', () => logger.warn('MongoDB desconectado'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconectado'));
mongoose.connection.on('error', (err) => logger.error({ err }, 'Error en la conexión con MongoDB'));

/**
 * Conecta con MongoDB reintentando, ya que en Docker la base de datos
 * puede tardar unos segundos más que la API en estar lista.
 */
export async function connectDatabase() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      logger.info({ host: mongoose.connection.host, db: mongoose.connection.name }, 'MongoDB conectado');
      return mongoose.connection;
    } catch (err) {
      logger.warn({ attempt, err: err.message }, 'No se pudo conectar con MongoDB');
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
