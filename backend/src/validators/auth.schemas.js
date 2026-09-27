import { z } from 'zod';

const email = z
  .string({ error: 'El email es obligatorio' })
  .trim()
  .toLowerCase()
  .pipe(z.email('El email no es válido'));

const nombre = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(80, 'El nombre no puede superar 80 caracteres');

export const registerSchema = z.object({
  nombre,
  email,
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede superar 128 caracteres'),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ error: 'Falta el refresh token' }).min(1, 'Falta el refresh token'),
});

export const updateMeSchema = z
  .object({
    nombre: nombre.optional(),
    horasEstudioDiarias: z
      .number({ error: 'Las horas deben ser un número' })
      .min(0.5, 'Mínimo media hora al día')
      .max(16, 'Máximo 16 horas al día')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'No hay nada que actualizar');
