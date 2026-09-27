import { z } from 'zod'
import { numberFromInput } from './validation'

const email = z
  .string()
  .trim()
  .min(1, 'Escribe tu email')
  .pipe(z.email('El email no es válido'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Escribe tu contraseña'),
})

const nombre = z.string().trim().min(1, 'Escribe tu nombre').max(80, 'Máximo 80 caracteres')

export const registerSchema = z
  .object({
    nombre,
    email,
    password: z.string().min(8, 'Mínimo 8 caracteres').max(128, 'Máximo 128 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const perfilSchema = z.object({
  nombre,
  horasEstudioDiarias: numberFromInput('Introduce un número de horas').pipe(
    z
      .number({ error: 'Indica cuántas horas puedes estudiar al día' })
      .min(0.5, 'Mínimo media hora')
      .max(16, 'Máximo 16 horas'),
  ),
})
