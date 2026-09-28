import mongoose from 'mongoose';

/** Suscripción Web Push de un dispositivo (navegador o app instalada). */
const pushSuscripcionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 1000 },
    keys: {
      p256dh: { type: String, required: true, maxlength: 200 },
      auth: { type: String, required: true, maxlength: 100 },
    },
    dispositivo: { type: String, trim: true, maxlength: 200 },
    ultimoEnvio: { type: Date },
  },
  { timestamps: true },
);

export const PushSuscripcion = mongoose.model('PushSuscripcion', pushSuscripcionSchema, 'push_suscripciones');
