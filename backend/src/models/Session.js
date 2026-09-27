import mongoose from 'mongoose';

/**
 * Sesión abierta en un dispositivo. Cada refresh token lleva el `jti` de su
 * sesión; al renovar se rota el jti y al cerrar sesión se borra el documento,
 * así que un refresh token robado deja de valer en cuanto se usa o se cierra
 * la sesión. MongoDB borra solas las sesiones caducadas (índice TTL).
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema, 'sessions');
