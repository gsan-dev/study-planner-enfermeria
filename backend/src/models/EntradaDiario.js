import mongoose from 'mongoose';

/** Entrada del diario: una por día. */
const entradaDiarioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fecha: { type: Date, required: true },
    texto: { type: String, trim: true, maxlength: [20000, 'Máximo 20.000 caracteres'], default: '' },
    // Cómo ha ido el día: 1 (muy mal) … 5 (muy bien).
    animo: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

entradaDiarioSchema.index({ userId: 1, fecha: 1 }, { unique: true });

export const EntradaDiario = mongoose.model('EntradaDiario', entradaDiarioSchema, 'diario');
