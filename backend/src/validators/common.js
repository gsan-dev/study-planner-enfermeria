import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador no válido');

export const idParams = z.object({ id: objectId });

export const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:mm');

/** Texto opcional: recorta espacios y convierte "" en undefined. */
export const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} no puede superar ${max} caracteres`)
    .optional()
    .transform((value) => (value ? value : undefined));
