import mongoose from 'mongoose';

/** Tarea o apunte rápido de la agenda para un día concreto. */
const tareaSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Día de calendario a medianoche UTC (como las fechas de examen).
    fecha: { type: Date, required: [true, 'La fecha es obligatoria'] },
    texto: {
      type: String,
      required: [true, 'Escribe la tarea'],
      trim: true,
      maxlength: [300, 'Máximo 300 caracteres'],
    },
    hora: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora HH:mm'] },
    hecho: { type: Boolean, default: false },
    hechoEn: { type: Date },
  },
  { timestamps: true },
);

tareaSchema.index({ userId: 1, fecha: 1 });
tareaSchema.index({ userId: 1, hecho: 1, fecha: 1 });

export const Tarea = mongoose.model('Tarea', tareaSchema, 'tareas');
