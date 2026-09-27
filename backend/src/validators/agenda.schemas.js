import { z } from 'zod';
import { hora } from './common.js';
import { fechaDia } from './examen.schemas.js';

const DIA_MS = 24 * 60 * 60 * 1000;
/** Rango máximo de una consulta: la cuadrícula de un mes (6 semanas) con margen. */
const MAX_DIAS = 62;

export const agendaQuery = z
  .object({
    desde: fechaDia,
    hasta: fechaDia,
    // "Hoy" del usuario: con él se devuelven las tareas sin hacer de días anteriores.
    hoy: fechaDia.optional(),
  })
  .refine((q) => q.hasta >= q.desde, { message: 'La fecha final debe ser posterior a la inicial', path: ['hasta'] })
  .refine((q) => (q.hasta - q.desde) / DIA_MS <= MAX_DIAS, {
    message: `Como mucho ${MAX_DIAS} días por consulta`,
    path: ['hasta'],
  });

const textoTarea = z
  .string({ error: 'Escribe la tarea' })
  .trim()
  .min(1, 'Escribe la tarea')
  .max(300, 'Máximo 300 caracteres');

// "" = sin hora.
const horaOpcional = z.union([hora, z.literal('')]).optional();

export const crearTareaSchema = z.object({
  fecha: fechaDia,
  texto: textoTarea,
  hora: horaOpcional.transform((v) => v || undefined),
});

export const actualizarTareaSchema = z
  .object({
    fecha: fechaDia.optional(),
    texto: textoTarea.optional(),
    // "" quita la hora.
    hora: horaOpcional,
    hecho: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'No hay nada que cambiar' });

export const fechaParams = z.object({ fecha: fechaDia });

export const diarioSchema = z.object({
  texto: z.string().max(20000, 'Máximo 20.000 caracteres').default(''),
  animo: z.number().int().min(1).max(5).nullish(),
});
