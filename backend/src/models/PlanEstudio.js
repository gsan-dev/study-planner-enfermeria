import mongoose from 'mongoose';

const diaPlanSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  temaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tema', required: true },
  horas: { type: Number, required: true, min: [0.25, 'Mínimo 15 minutos'], max: 16 },
  // Primera vuelta al tema o repaso final.
  tipo: { type: String, enum: ['estudio', 'repaso'], default: 'estudio' },
  completado: { type: Boolean, default: false },
  completadoEn: { type: Date },
  notas: { type: String, trim: true, maxlength: 500 },
});

const planEstudioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examen',
      required: [true, 'El examen es obligatorio'],
    },
    tipo: { type: String, enum: ['automatico', 'manual'], default: 'automatico' },
    // Parámetros con los que se generó (para poder regenerar).
    horasPorDia: { type: Number, min: 0.5, max: 16 },
    fechaInicio: { type: Date },
    // 0 = domingo ... 6 = sábado.
    diasDescanso: { type: [Number], default: [] },
    repaso: { type: Boolean, default: true },
    incluirEstudiados: { type: Boolean, default: false },
    diasPlan: { type: [diaPlanSchema], default: [] },
  },
  { timestamps: true },
);

// Un plan por examen y usuario.
planEstudioSchema.index({ userId: 1, examenId: 1 }, { unique: true });

planEstudioSchema.virtual('porcentajeCompletado').get(function porcentaje() {
  if (!this.diasPlan?.length) return 0;
  const hechos = this.diasPlan.filter((d) => d.completado).length;
  return Math.round((hechos / this.diasPlan.length) * 100);
});

planEstudioSchema.set('toJSON', { virtuals: true });

export const PlanEstudio = mongoose.model('PlanEstudio', planEstudioSchema, 'planes_estudio');
