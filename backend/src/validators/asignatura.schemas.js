import { z } from 'zod';
import { hora, optionalText } from './common.js';

export const horarioSchema = z
  .object({
    dia: z
      .number({ error: 'El día es obligatorio' })
      .int()
      .min(0, 'Día no válido')
      .max(6, 'Día no válido'),
    horaInicio: hora,
    horaFin: hora,
    aula: optionalText(60, 'El aula'),
  })
  .refine((h) => h.horaFin > h.horaInicio, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['horaFin'],
  });

const solapan = (a, b) => a.dia === b.dia && a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;

/** Franjas de una asignatura: máximo 20 y sin solapes entre ellas. */
export const horariosSchema = z
  .array(horarioSchema)
  .max(20, 'Máximo 20 franjas horarias')
  .default([])
  .superRefine((horarios, ctx) => {
    horarios.forEach((h, i) => {
      if (horarios.slice(0, i).some((prev) => solapan(prev, h))) {
        ctx.addIssue({ code: 'custom', message: 'Hay dos franjas horarias que se solapan', path: [i, 'horaInicio'] });
      }
    });
  });

export const nombreAsignatura = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(120, 'El nombre no puede superar 120 caracteres');

export const colorAsignatura = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser hexadecimal (#rrggbb)')
  .default('#0d9488');

export const asignaturaSchema = z.object({
  nombre: nombreAsignatura,
  profesor: optionalText(120, 'El profesor'),
  creditos: z
    .number({ error: 'Los créditos deben ser un número' })
    .min(0, 'Los créditos no pueden ser negativos')
    .max(30, 'Máximo 30 créditos')
    .nullish()
    .transform((value) => value ?? undefined),
  horarios: horariosSchema,
  color: colorAsignatura,
});

export const archivarSchema = z.object({
  archivada: z.boolean().default(true),
});

export const listAsignaturasQuery = z.object({
  archivadas: z.enum(['true', 'false', 'todas']).default('false'),
});
