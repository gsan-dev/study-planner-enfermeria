import mongoose from 'mongoose';

/**
 * Registro de una sesión de estudio. El progreso agregado (horas por día,
 * por asignatura, etc.) se calcula sumando estos registros.
 */
const progresoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fecha: { type: Date, required: true, default: Date.now },
    horasEstudiadas: {
      type: Number,
      required: [true, 'Las horas estudiadas son obligatorias'],
      min: [0.25, 'Mínimo 15 minutos'],
      max: [24, 'Máximo 24 horas'],
    },
    temasEstudiados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tema' }],
    asignaturaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asignatura' },
    planEstudioId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlanEstudio' },
    notas: { type: String, trim: true, maxlength: 500 },
    // 'manual': registrado a mano. 'plan': creado al completar una sesión del plan
    // (se borra si la sesión se desmarca).
    origen: { type: String, enum: ['manual', 'plan'], default: 'manual' },
    sesionId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true },
);

progresoSchema.index({ userId: 1, fecha: -1 });
progresoSchema.index({ userId: 1, asignaturaId: 1 });
progresoSchema.index({ userId: 1, sesionId: 1 }, { sparse: true });

export const Progreso = mongoose.model('Progreso', progresoSchema, 'progresos');
