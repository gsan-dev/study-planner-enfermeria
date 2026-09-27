import mongoose from 'mongoose';

const temaSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    asignaturaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asignatura',
      required: [true, 'La asignatura es obligatoria'],
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [160, 'El nombre no puede superar 160 caracteres'],
    },
    dificultad: {
      type: Number,
      min: [1, 'La dificultad mínima es 1'],
      max: [5, 'La dificultad máxima es 5'],
      default: 3,
    },
    horasEstimadas: { type: Number, min: [0, 'Las horas no pueden ser negativas'], default: 2 },
    estudiado: { type: Boolean, default: false },
    fechaEstudiado: { type: Date },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true },
);

temaSchema.index({ asignaturaId: 1, orden: 1 });

export const Tema = mongoose.model('Tema', temaSchema, 'temas');
