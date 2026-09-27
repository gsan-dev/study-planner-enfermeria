import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email, type: 'access' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id), type: 'refresh', v: user.tokenVersion ?? 0 },
    env.jwtSecret,
    { expiresIn: env.jwtRefreshExpiresIn },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
