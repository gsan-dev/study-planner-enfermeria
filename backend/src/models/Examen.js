import mongoose from 'mongoose';

export const TIPOS_EXAMEN = ['parcial', 'final', 'practico', 'oral', 'test', 'otro'];

const examenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    asignaturaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asignatura',
      required: [true, 'La asignatura es obligatoria'],
      index: true,
    },
    tipo: {
      type: String,
      enum: { values: TIPOS_EXAMEN, message: 'Tipo de examen no válido' },
      default: 'parcial',
    },
    titulo: { type: String, trim: true, maxlength: 120 },
    fecha: { type: Date, required: [true, 'La fecha es obligatoria'] },
    hora: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora HH:mm'] },
    // Porcentaje de la nota final (0-100).
    peso: { type: Number, min: 0, max: 100 },
    // Temas que entran en el examen.
    temas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tema' }],
    aula: { type: String, trim: true, maxlength: 60 },
    notas: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

examenSchema.index({ userId: 1, fecha: 1 });

export const Examen = mongoose.model('Examen', examenSchema, 'examenes');
