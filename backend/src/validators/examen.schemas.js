import { z } from 'zod';
import { TIPOS_EXAMEN } from '../models/Examen.js';
import { hora, objectId, optionalText } from './common.js';

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha de calendario "YYYY-MM-DD" → Date a medianoche UTC. Así el día no
 * cambia según la zona horaria del servidor o del navegador.
 */
export const fechaDia = z
  .string({ error: 'La fecha es obligatoria' })
  .regex(FECHA_REGEX, 'La fecha debe tener formato AAAA-MM-DD')
  .transform((value, ctx) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    // new Date acepta "2026-02-30" y lo convierte en 2 de marzo: se rechaza.
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      ctx.addIssue({ code: 'custom', message: 'La fecha no es válida' });
      return z.NEVER;
    }
    const year = date.getUTCFullYear();
    if (year < 2000 || year > 2100) {
      ctx.addIssue({ code: 'custom', message: 'La fecha no es válida' });
      return z.NEVER;
    }
    return date;
  });

/** Lista de temas sin repetidos (el orden lo decide el temario). */
export const temasIds = z
  .array(objectId)
  .max(300, 'Demasiados temas')
  .transform((ids) => [...new Set(ids)]);

export const examenSchema = z.object({
  asignaturaId: objectId,
  tipo: z.enum(TIPOS_EXAMEN, { error: 'Tipo de examen no válido' }).default('parcial'),
  titulo: optionalText(120, 'El título'),
  fecha: fechaDia,
  // "" = sin hora.
  hora: z
    .union([hora, z.literal('')])
    .optional()
    .transform((value) => value || undefined),
  peso: z
    .number({ error: 'El peso debe ser un número' })
    .min(0, 'El peso no puede ser negativo')
    .max(100, 'El peso máximo es 100%')
    .nullish()
    .transform((value) => value ?? undefined),
  // Si no se indica al crear, entran todos los temas de la asignatura.
  temas: temasIds.optional(),
  aula: optionalText(60, 'El aula'),
  notas: optionalText(1000, 'Las notas'),
});

export const temasExamenSchema = z.object({
  temas: temasIds,
});

export const listExamenesQuery = z.object({
  estado: z.enum(['proximos', 'pasados', 'todos']).default('proximos'),
  // "Hoy" según el calendario del usuario; por defecto, hoy en UTC.
  desde: fechaDia.optional(),
  asignaturaId: objectId.optional(),
});
