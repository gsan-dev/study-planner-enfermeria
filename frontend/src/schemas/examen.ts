import { z } from 'zod'
import type { TipoExamen } from '../types/models'
import { numberFromInput } from './validation'

const TIPOS = ['parcial', 'final', 'practico', 'oral', 'test', 'otro'] as const satisfies readonly TipoExamen[]

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => v || undefined)

export const examenFormSchema = z.object({
  asignaturaId: z.string().min(1, 'Elige la asignatura'),
  tipo: z.enum(TIPOS),
  titulo: textoOpcional(120),
  fecha: z
    .string()
    .min(1, 'Elige la fecha del examen')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida'),
  hora: z
    .string()
    .regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Hora no válida')
    .transform((v) => v || undefined),
  peso: numberFromInput('Introduce un porcentaje').pipe(
    z.number().min(0, 'No puede ser negativo').max(100, 'Máximo 100%').nullable(),
  ),
  aula: textoOpcional(60),
  notas: textoOpcional(1000),
  temas: z.array(z.string()),
})

export type ExamenFormValues = z.input<typeof examenFormSchema>
