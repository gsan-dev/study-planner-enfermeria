import { z } from 'zod';
import { env } from '../config/env.js';
import { hora } from './common.js';

// Servicios de push de los navegadores. Solo se aceptan suscripciones hacia
// ellos: así nadie puede usar el servidor para hacer peticiones a otras webs.
const HOSTS_PUSH = [
  /(^|\.)push\.apple\.com$/,
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
];

function endpointPermitido(valor) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  // Orígenes extra solo para pruebas (PUSH_ENDPOINTS_EXTRA).
  if (env.pushEndpointsExtra.some((origen) => valor.startsWith(origen))) return true;
  return url.protocol === 'https:' && HOSTS_PUSH.some((re) => re.test(url.hostname));
}

const zonaHoraria = z
  .string()
  .max(60)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Zona horaria no válida');

export const listNotificacionesQuery = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(30),
  soloNoLeidas: z.enum(['true', 'false']).default('false'),
});

export const crearNotificacionSchema = z.object({
  titulo: z.string({ error: 'Escribe un título' }).trim().min(1, 'Escribe un título').max(120, 'Máximo 120 caracteres'),
  mensaje: z.string({ error: 'Escribe el mensaje' }).trim().min(1, 'Escribe el mensaje').max(500, 'Máximo 500 caracteres'),
  // Solo rutas de la propia app.
  url: z
    .string()
    .regex(/^\/[^/]/, 'Debe ser una ruta de la app')
    .max(200)
    .optional()
    .or(z.literal('/')),
});

export const leerSchema = z.object({
  leida: z.boolean().default(true),
});

export const suscripcionSchema = z.object({
  endpoint: z.string().max(1000).refine(endpointPermitido, 'Servicio de notificaciones no admitido'),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
  dispositivo: z.string().trim().max(200).optional(),
  zonaHoraria: zonaHoraria.optional(),
});

export const bajaSuscripcionSchema = z.object({
  endpoint: z.string().max(1000),
});

export const preferenciasSchema = z.object({
  examenes: z.boolean(),
  planDiario: z.boolean(),
  retraso: z.boolean(),
  logros: z.boolean(),
  horaDiaria: hora,
  zonaHoraria,
});
