import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/** Traduce errores conocidos (Mongoose, body-parser...) a AppError. */
function normalizeError(err) {
  if (err instanceof AppError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message]),
    );
    return AppError.badRequest('Datos inválidos', details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Valor inválido para "${err.path}"`);
  }

  if (err?.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    return AppError.conflict(fields ? `Ya existe un registro con ese ${fields}` : undefined);
  }

  if (err?.type === 'entity.parse.failed') {
    return AppError.badRequest('El cuerpo de la petición no es JSON válido');
  }

  if (err?.type === 'entity.too.large') {
    return new AppError('El cuerpo de la petición es demasiado grande', 413, { code: 'PAYLOAD_TOO_LARGE' });
  }

  return null;
}

// Express reconoce el manejador de errores por tener 4 argumentos.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const known = normalizeError(err);
  const statusCode = known?.statusCode ?? 500;

  if (statusCode >= 500) {
    req.log?.error({ err }, 'Error no controlado');
  } else {
    req.log?.warn({ statusCode, message: known.message }, 'Error de cliente');
  }

  const body = {
    error: {
      message: known?.message ?? 'Error interno del servidor',
      code: known?.code ?? 'INTERNAL_ERROR',
    },
  };
  if (known?.details) body.error.details = known.details;
  if (!known && !env.isProduction) body.error.stack = err?.stack;

  res.status(statusCode).json(body);
}
