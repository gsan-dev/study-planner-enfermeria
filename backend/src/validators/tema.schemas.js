import { z } from 'zod';

export const temaSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(160, 'El nombre no puede superar 160 caracteres'),
  dificultad: z
    .number({ error: 'La dificultad debe ser un número' })
    .int('La dificultad debe ser un número entero')
    .min(1, 'La dificultad mínima es 1')
    .max(5, 'La dificultad máxima es 5')
    .default(3),
  horasEstimadas: z
    .number({ error: 'Las horas deben ser un número' })
    .min(0, 'Las horas no pueden ser negativas')
    .max(200, 'Máximo 200 horas')
    .default(2),
});

export const marcarEstudiadoSchema = z.object({
  estudiado: z.boolean().default(true),
});
