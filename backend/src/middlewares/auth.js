import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Exige un access token válido en `Authorization: Bearer <token>`.
 * Deja el usuario autenticado en `req.user = { id, email }`.
 */
export function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Falta el token de autenticación'));
  }

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      return next(AppError.unauthorized('Tipo de token inválido'));
    }
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('El token ha expirado', 401, { code: 'TOKEN_EXPIRED' }));
    }
    return next(AppError.unauthorized('Token inválido'));
  }
}
