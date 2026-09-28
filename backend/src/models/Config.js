import mongoose from 'mongoose';

/** Ajustes internos del servidor (p. ej. las claves VAPID de Web Push). */
const configSchema = new mongoose.Schema(
  {
    clave: { type: String, required: true, unique: true },
    valor: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Config = mongoose.model('Config', configSchema, 'config');
