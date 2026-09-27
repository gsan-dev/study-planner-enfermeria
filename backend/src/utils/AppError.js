/**
 * Error operacional con código HTTP. Los errores de este tipo se devuelven
 * tal cual al cliente; el resto se ocultan como 500.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, { code, details } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message = 'Petición inválida', details) {
    return new AppError(message, 400, { code: 'BAD_REQUEST', details });
  }

  static unauthorized(message = 'No autenticado') {
    return new AppError(message, 401, { code: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'No tienes permiso para esta acción') {
    return new AppError(message, 403, { code: 'FORBIDDEN' });
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(message, 404, { code: 'NOT_FOUND' });
  }

  static conflict(message = 'El recurso ya existe') {
    return new AppError(message, 409, { code: 'CONFLICT' });
  }
}
