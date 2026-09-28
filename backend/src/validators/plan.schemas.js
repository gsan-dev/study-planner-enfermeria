import { z } from 'zod';
import { objectId, optionalText } from './common.js';
import { fechaDia } from './examen.schemas.js';

const horas = z
  .number({ error: 'Las horas deben ser un número' })
  .min(0.25, 'Mínimo 15 minutos')
  .max(16, 'Máximo 16 horas')
  .refine((h) => Number.isInteger(h * 4), 'Las horas van de 15 en 15 minutos');

const parametros = {
  horasPorDia: z
    .number({ error: 'Las horas por día deben ser un número' })
    .min(0.5, 'Mínimo media hora al día')
    .max(16, 'Máximo 16 horas al día')
    .optional(),
  // Primer día del plan ("hoy" del usuario); por defecto, hoy.
  fechaInicio: fechaDia.optional(),
  diasDescanso: z
    .array(z.number().int().min(0).max(6))
    .max(6, 'Deja al menos un día de la semana para estudiar')
    .transform((dias) => [...new Set(dias)].sort())
    .default([]),
  repaso: z.boolean().default(true),
  incluirEstudiados: z.boolean().default(false),
};

export const examenIdParams = z.object({ examenId: objectId });

export const generarSchema = z.object({
  examenId: objectId,
  ...parametros,
  // false = solo vista previa.
  guardar: z.boolean().default(false),
});

const sesionSchema = z.object({
  // Id de una sesión ya existente: se conserva para no perder su registro de horas.
  _id: objectId.optional(),
  fecha: fechaDia,
  temaId: objectId,
  horas,
  tipo: z.enum(['estudio', 'repaso']).default('estudio'),
  completado: z.boolean().default(false),
  notas: optionalText(500, 'Las notas'),
});

export const crearManualSchema = z
  .object({
    examenId: objectId,
    // "automatico" al guardar una vista previa del generador tal cual.
    tipo: z.enum(['manual', 'automatico']).default('manual'),
    ...parametros,
    diasPlan: z.array(sesionSchema).min(1, 'Añade al menos una sesión de estudio').max(1000, 'Demasiadas sesiones'),
  })
  .superRefine(({ diasPlan }, ctx) => {
    const vistas = new Set();
    const porDia = new Map();
    diasPlan.forEach((s, i) => {
      const dia = s.fecha.toISOString().slice(0, 10);
      // Una sesión hecha y otra pendiente del mismo tema pueden coincidir (al regenerar).
      const clave = `${dia}:${s.temaId}:${s.tipo}:${s.completado}`;
      if (vistas.has(clave)) {
        ctx.addIssue({ code: 'custom', message: 'Hay un tema repetido el mismo día', path: ['diasPlan', i, 'temaId'] });
      }
      vistas.add(clave);
      porDia.set(dia, (porDia.get(dia) ?? 0) + s.horas);
    });
    for (const [dia, total] of porDia) {
      if (total > 16) ctx.addIssue({ code: 'custom', message: `El ${dia} tiene más de 16 horas de estudio`, path: ['diasPlan'] });
    }
  });

export const actualizarDiaSchema = z
  .object({
    diaId: objectId,
    completado: z.boolean().optional(),
    temaId: objectId.optional(),
    horas: horas.optional(),
    fecha: fechaDia.optional(),
    tipo: z.enum(['estudio', 'repaso']).optional(),
    notas: z.string().trim().max(500, 'Las notas no pueden superar 500 caracteres').optional(),
  })
  .refine((body) => Object.keys(body).length > 1, { message: 'No hay nada que cambiar', path: ['diaId'] });
