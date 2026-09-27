import mongoose from 'mongoose';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const horarioSchema = new mongoose.Schema(
  {
    // 0 = domingo ... 6 = sábado (igual que Date#getDay y date-fns).
    dia: { type: Number, required: true, min: 0, max: 6 },
    horaInicio: { type: String, required: true, match: [HORA_REGEX, 'Formato de hora HH:mm'] },
    horaFin: { type: String, required: true, match: [HORA_REGEX, 'Formato de hora HH:mm'] },
    aula: { type: String, trim: true, maxlength: 60 },
  },
  { _id: false },
);

horarioSchema.path('horaFin').validate(function validateFin(value) {
  return !this.horaInicio || value > this.horaInicio;
}, 'La hora de fin debe ser posterior a la de inicio');

const asignaturaSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [120, 'El nombre no puede superar 120 caracteres'],
    },
    profesor: { type: String, trim: true, maxlength: 120 },
    creditos: { type: Number, min: [0, 'Los créditos no pueden ser negativos'], max: 30 },
    horarios: { type: [horarioSchema], default: [] },
    color: {
      type: String,
      default: '#0d9488',
      match: [/^#[0-9a-fA-F]{6}$/, 'El color debe ser hexadecimal (#rrggbb)'],
    },
    archivada: { type: Boolean, default: false },
  },
  { timestamps: true },
);

asignaturaSchema.index({ userId: 1, archivada: 1, nombre: 1 });

export const Asignatura = mongoose.model('Asignatura', asignaturaSchema, 'asignaturas');
