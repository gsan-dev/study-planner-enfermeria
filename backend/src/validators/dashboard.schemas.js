import { z } from 'zod';
import { fechaDia } from './examen.schemas.js';

export const dashboardQuery = z.object({
  // "Hoy" según el calendario del usuario; por defecto, hoy en UTC.
  hoy: fechaDia.optional(),
});

export const mesQuery = z.object({
  mes: z
    .string({ error: 'Indica el mes' })
    .regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/, 'El mes debe tener formato AAAA-MM'),
});
