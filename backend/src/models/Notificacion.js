import mongoose from 'mongoose';

export const TIPOS_NOTIFICACION = [
  'examen_7d',
  'examen_3d',
  'examen_1d',
  'plan_diario',
  'plan_retraso',
  'plan_completado',
  'prueba',
  'general',
];

const notificacionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tipo: { type: String, enum: TIPOS_NOTIFICACION, default: 'general' },
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    mensaje: { type: String, required: true, trim: true, maxlength: 500 },
    // Ruta de la app que se abre al tocarla (p. ej. "/plan/<examenId>").
    url: { type: String, trim: true, maxlength: 200, default: '/' },
    leida: { type: Boolean, default: false },
    leidaEn: { type: Date },
    // Evita repetir el mismo aviso (p. ej. "examen_7d:<examenId>" o "plan_diario:2026-10-14").
    clave: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

notificacionSchema.index({ userId: 1, createdAt: -1 });
notificacionSchema.index({ userId: 1, leida: 1 });
notificacionSchema.index({ userId: 1, clave: 1 }, { unique: true, partialFilterExpression: { clave: { $type: 'string' } } });
// Se borran solas a los 90 días.
notificacionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notificacion = mongoose.model('Notificacion', notificacionSchema, 'notificaciones');
