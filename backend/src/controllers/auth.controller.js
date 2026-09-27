import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Session, User } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';

/** Abre una sesión nueva y devuelve el par de tokens. */
async function createSession(user, req) {
  const jti = randomUUID();
  const refreshToken = signRefreshToken(user._id, jti);
  const { exp } = jwt.decode(refreshToken);
  await Session.create({
    userId: user._id,
    jti,
    expiresAt: new Date(exp * 1000),
    userAgent: req.get('user-agent')?.slice(0, 300),
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

/** Devuelve el payload de un refresh token válido, o null. */
function readRefreshToken(token) {
  try {
    const payload = verifyToken(token);
    return payload.type === 'refresh' && payload.jti ? payload : null;
  } catch {
    return null;
  }
}

/** POST /api/auth/register */
export async function register(req, res) {
  const { nombre, email, password } = req.body;

  if (await User.exists({ email })) {
    throw AppError.conflict('Ya existe una cuenta con ese email');
  }

  const user = await User.create({ nombre, email, password });
  const tokens = await createSession(user, req);
  res.status(201).json({ user, ...tokens });
}

/** POST /api/auth/login */
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  // Mismo mensaje si el email no existe o la contraseña falla (no revela cuentas).
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Email o contraseña incorrectos', 401, { code: 'INVALID_CREDENTIALS' });
  }

  const tokens = await createSession(user, req);
  res.json({ user, ...tokens });
}

/**
 * POST /api/auth/refresh-token
 * Rota el refresh token: el usado deja de valer y se entrega uno nuevo.
 */
export async function refreshToken(req, res) {
  const payload = readRefreshToken(req.body.refreshToken);
  const session = payload && (await Session.findOneAndDelete({ jti: payload.jti, userId: payload.sub }));
  if (!session) {
    throw new AppError('La sesión ha caducado, vuelve a iniciar sesión', 401, { code: 'SESSION_EXPIRED' });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError('La cuenta ya no existe', 401, { code: 'SESSION_EXPIRED' });
  }

  const tokens = await createSession(user, req);
  res.json({ user, ...tokens });
}

/** POST /api/auth/logout — cierra la sesión de este dispositivo. */
export async function logout(req, res) {
  const payload = readRefreshToken(req.body.refreshToken);
  if (payload) {
    await Session.deleteOne({ jti: payload.jti, userId: payload.sub });
  }
  res.status(204).end();
}

/** GET /api/auth/me */
export async function getMe(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('Usuario no encontrado');
  res.json({ user });
}

/** PATCH /api/auth/me — nombre y horas de estudio diarias. */
export async function updateMe(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('Usuario no encontrado');
  user.set(req.body);
  await user.save();
  res.json({ user });
}
