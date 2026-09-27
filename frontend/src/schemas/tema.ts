import { z } from 'zod'
import type { Dificultad } from '../types/models'
import { numberFromInput } from './validation'

export const temaFormSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre del tema').max(160, 'Máximo 160 caracteres'),
  dificultad: z.coerce
    .number()
    .int()
    .min(1)
    .max(5)
    .transform((d) => d as Dificultad),
  horasEstimadas: numberFromInput('Introduce un número de horas').pipe(
    z.number({ error: 'Indica las horas estimadas' }).min(0, 'No puede ser negativo').max(200, 'Máximo 200 horas'),
  ),
})

export type TemaFormValues = z.input<typeof temaFormSchema>
