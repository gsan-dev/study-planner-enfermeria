import { z } from 'zod';
import { TIPOS_ARCHIVO } from '../services/horarioScanner.js';
import { colorAsignatura, horariosSchema, nombreAsignatura } from './asignatura.schemas.js';
import { objectId } from './common.js';

// ~10 MB de archivo → ~13,4 MB en base64.
const MAX_BASE64 = 14 * 1024 * 1024;

export const escanearSchema = z.object({
  archivo: z.object({
    mediaType: z.enum(TIPOS_ARCHIVO, { error: 'Formato no compatible: usa JPG, PNG, WEBP o PDF' }),
    data: z
      .string({ error: 'Falta el archivo' })
      .min(100, 'El archivo está vacío')
      .max(MAX_BASE64, 'El archivo es demasiado grande (máximo 10 MB)')
      .regex(/^[A-Za-z0-9+/]+=*$/, 'El archivo no está en base64'),
  }),
});

/**
 * Guardado del horario completo: cada elemento actualiza las franjas de una
 * asignatura existente (`_id`) o crea una nueva (`nombre`).
 */
export const guardarHorarioSchema = z.object({
  asignaturas: z
    .array(
      z.union([
        z.object({ _id: objectId, horarios: horariosSchema }),
        z.object({ nombre: nombreAsignatura, color: colorAsignatura, horarios: horariosSchema }),
      ]),
    )
    .max(60, 'Demasiadas asignaturas'),
});
