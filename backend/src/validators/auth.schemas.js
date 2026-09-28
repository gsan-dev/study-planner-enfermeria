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

// El nombre y el email se cambian aparte, con la contraseña (ver más abajo).
export const updateMeSchema = z
  .object({
    horasEstudioDiarias: z
      .number({ error: 'Las horas deben ser un número' })
      .min(0.5, 'Mínimo media hora al día')
      .max(16, 'Máximo 16 horas al día')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'No hay nada que actualizar');

const passwordActual = z
  .string({ error: 'Escribe tu contraseña' })
  .min(1, 'Escribe tu contraseña')
  .max(128, 'Contraseña no válida');

export const cambiarNombreSchema = z.object({ nombre, password: passwordActual });

export const cambiarEmailSchema = z.object({ email, password: passwordActual });

// ~150 KB de imagen como mucho (la app la reduce a 256 px, unos 20-30 KB).
const MAX_FOTO = 200_000;

export const fotoSchema = z.object({
  foto: z
    .string({ error: 'Falta la imagen' })
    .max(MAX_FOTO, 'La imagen es demasiado grande')
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'La imagen debe ser JPEG, PNG o WebP'),
});
