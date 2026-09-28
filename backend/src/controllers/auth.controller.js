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

/** PATCH /api/auth/me — horas de estudio diarias (el nombre y el email, con contraseña). */
export async function updateMe(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('Usuario no encontrado');
  user.set(req.body);
  await user.save();
  res.json({ user });
}

/**
 * Comprueba la contraseña actual antes de un cambio sensible (nombre, email).
 * Responde 400 y no 401: un 401 haría que la app intentase renovar la sesión.
 */
async function usuarioConPassword(userId, password) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw AppError.notFound('Usuario no encontrado');
  if (!(await user.comparePassword(password))) {
    throw new AppError('La contraseña no es correcta', 400, {
      code: 'PASSWORD_INCORRECTA',
      details: { password: 'La contraseña no es correcta' },
    });
  }
  return user;
}

/** PATCH /api/auth/me/nombre — `{ nombre, password }` */
export async function cambiarNombre(req, res) {
  const user = await usuarioConPassword(req.user.id, req.body.password);
  user.nombre = req.body.nombre;
  await user.save();
  res.json({ user });
}

/** PATCH /api/auth/me/email — `{ email, password }` */
export async function cambiarEmail(req, res) {
  const user = await usuarioConPassword(req.user.id, req.body.password);
  const { email } = req.body;
  if (email === user.email) {
    throw AppError.badRequest('Ese ya es tu email', { email: 'Ese ya es tu email' });
  }
  if (await User.exists({ email })) {
    throw new AppError('Ya hay una cuenta con ese email', 409, {
      code: 'CONFLICT',
      details: { email: 'Ya hay una cuenta con ese email' },
    });
  }
  user.email = email;
  try {
    await user.save();
  } catch (err) {
    // Otra cuenta lo ha cogido justo ahora (índice único).
    if (err.code === 11000) throw new AppError('Ya hay una cuenta con ese email', 409, { code: 'CONFLICT' });
    throw err;
  }
  res.json({ user });
}

// Primeros bytes de cada formato: el data URL tiene que ser de verdad la imagen que dice ser.
const FIRMAS = {
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

/** PUT /api/auth/me/foto — `{ foto }` (data URL de una imagen pequeña). */
export async function cambiarFoto(req, res) {
  const [, tipo, base64] = req.body.foto.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  if (!FIRMAS[tipo](Buffer.from(base64.slice(0, 32), 'base64'))) {
    throw AppError.badRequest('El archivo no es una imagen válida', { foto: 'El archivo no es una imagen válida' });
  }
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('Usuario no encontrado');
  user.foto = req.body.foto;
  await user.save();
  res.json({ user });
}

/** DELETE /api/auth/me/foto */
export async function quitarFoto(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw AppError.notFound('Usuario no encontrado');
  user.foto = undefined;
  await user.save();
  res.json({ user });
}
