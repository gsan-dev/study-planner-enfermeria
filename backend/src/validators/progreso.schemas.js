import { z } from 'zod';
import { objectId, optionalText } from './common.js';
import { fechaDia } from './examen.schemas.js';

const DIA_MS = 24 * 60 * 60 * 1000;

export const registrarHorasSchema = z
  .object({
    fecha: fechaDia,
    horas: z
      .number({ error: 'Indica cuántas horas has estudiado' })
      .min(0.25, 'Mínimo 15 minutos')
      .max(16, 'Máximo 16 horas')
      .refine((h) => Number.isInteger(h * 4), 'Las horas van de 15 en 15 minutos'),
    temaId: objectId.optional(),
    asignaturaId: objectId.optional(),
    notas: optionalText(500, 'Las notas'),
  })
  .refine((b) => b.temaId || b.asignaturaId, { message: 'Elige la asignatura', path: ['asignaturaId'] });

export const listRegistrosQuery = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export const hoyQuery = z.object({
  // "Hoy" según el calendario del usuario; por defecto, hoy en UTC.
  hoy: fechaDia.optional(),
});

export const porAsignaturaQuery = hoyQuery.extend({
  periodo: z.enum(['semana', 'mes', 'todo']).default('todo'),
});

export const porTemaQuery = z.object({
  asignaturaId: objectId,
});

export const evolucionQuery = z
  .object({
    desde: fechaDia.optional(),
    hasta: fechaDia.optional(),
  })
  .refine((q) => !q.desde || !q.hasta || q.hasta >= q.desde, {
    message: 'La fecha final debe ser posterior a la inicial',
    path: ['hasta'],
  })
  .refine((q) => !q.desde || !q.hasta || (q.hasta - q.desde) / DIA_MS <= 366, {
    message: 'Como mucho un año',
    path: ['hasta'],
  });
