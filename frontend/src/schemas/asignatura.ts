import { z } from 'zod'
import { solapan } from '../lib/horario'
import type { DiaSemana } from '../types/models'
import { numberFromInput } from './validation'

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora no válida')

// Las franjas ya llegan validadas desde el editor de la tabla; esto es la red de seguridad.
const horarioSchema = z
  .object({
    dia: z.number().int().min(0).max(6).transform((d) => d as DiaSemana),
    horaInicio: hora,
    horaFin: hora,
    aula: z.string().trim().max(60, 'Máximo 60 caracteres').optional(),
  })
  .refine((h) => h.horaFin > h.horaInicio, { message: 'La hora de fin debe ser posterior a la de inicio', path: ['horaFin'] })

export const asignaturaFormSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre de la asignatura').max(120, 'Máximo 120 caracteres'),
  profesor: z
    .string()
    .trim()
    .max(120, 'Máximo 120 caracteres')
    .transform((v) => v || undefined),
  creditos: numberFromInput('Introduce un número').pipe(
    z.number().min(0, 'No puede ser negativo').max(30, 'Máximo 30 créditos').nullable(),
  ),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  horarios: z
    .array(horarioSchema)
    .max(20, 'Máximo 20 clases por asignatura')
    .superRefine((horarios, ctx) => {
      horarios.forEach((h, i) => {
        if (horarios.slice(0, i).some((p) => solapan(p, h))) {
          ctx.addIssue({ code: 'custom', message: 'Hay dos clases que se solapan', path: [] })
        }
      })
    }),
})

export type AsignaturaFormValues = z.input<typeof asignaturaFormSchema>
