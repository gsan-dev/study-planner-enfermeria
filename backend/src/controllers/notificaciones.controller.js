import { Notificacion, PushSuscripcion, User } from '../models/index.js';
import { crearNotificacion, revisarUsuaria } from '../services/notificaciones.js';
import { getClavePublica } from '../services/push.js';
import { AppError } from '../utils/AppError.js';
import { findOwned } from '../utils/ownership.js';

const NOT_FOUND = 'Notificación no encontrada';

/** GET /api/notificaciones?limite=&soloNoLeidas= — recientes primero, con el total sin leer. */
export async function listNotificaciones(req, res) {
  const userId = req.user.id;
  const { limite, soloNoLeidas } = req.validatedQuery;
  const filtro = { userId, ...(soloNoLeidas === 'true' ? { leida: false } : {}) };
  const [notificaciones, noLeidas] = await Promise.all([
    Notificacion.find(filtro).sort({ createdAt: -1 }).limit(limite),
    Notificacion.countDocuments({ userId, leida: false }),
  ]);
  res.json({ notificaciones, noLeidas });
}

/** POST /api/notificaciones — recordatorio propio (se envía también por push). */
export async function postNotificacion(req, res) {
  const notificacion = await crearNotificacion(req.user.id, { ...req.body, tipo: 'general' });
  res.status(201).json({ notificacion });
}

/** POST /api/notificaciones/prueba — para comprobar que llegan a los dispositivos. */
export async function postPrueba(req, res) {
  const dispositivos = await PushSuscripcion.countDocuments({ userId: req.user.id });
  const notificacion = await crearNotificacion(req.user.id, {
    tipo: 'prueba',
    titulo: 'Notificación de prueba',
    mensaje: dispositivos
      ? '¡Funciona! Así te llegarán los avisos de exámenes y del plan de estudio.'
      : 'Esta notificación solo se ve en la app: activa las notificaciones en este dispositivo para recibirlas fuera.',
    url: '/notificaciones',
  });
  res.status(201).json({ notificacion, dispositivos });
}

/** POST /api/notificaciones/comprobar — revisa ya los avisos programados (sin esperar al temporizador). */
export async function postComprobar(req, res) {
  const user = await User.findById(req.user.id);
  await revisarUsuaria(user);
  const noLeidas = await Notificacion.countDocuments({ userId: req.user.id, leida: false });
  res.json({ noLeidas });
}

/** PATCH /api/notificaciones/:id/leer */
export async function leerNotificacion(req, res) {
  const notificacion = await findOwned(Notificacion, req.params.id, req.user.id, NOT_FOUND);
  notificacion.leida = req.body.leida;
  notificacion.leidaEn = req.body.leida ? new Date() : undefined;
  await notificacion.save();
  res.json({ notificacion });
}

/** PATCH /api/notificaciones/leer-todas */
export async function leerTodas(req, res) {
  const { modifiedCount } = await Notificacion.updateMany(
    { userId: req.user.id, leida: false },
    { leida: true, leidaEn: new Date() },
  );
  res.json({ marcadas: modifiedCount });
}

/** DELETE /api/notificaciones/:id */
export async function borrarNotificacion(req, res) {
  const notificacion = await findOwned(Notificacion, req.params.id, req.user.id, NOT_FOUND);
  await notificacion.deleteOne();
  res.status(204).end();
}

/** GET /api/notificaciones/push/clave — clave pública VAPID para suscribirse. */
export async function getClave(_req, res) {
  const clavePublica = getClavePublica();
  if (!clavePublica) throw new AppError('Las notificaciones push no están disponibles', 503, { code: 'PUSH_NO_DISPONIBLE' });
  res.json({ clavePublica });
}

/** GET /api/notificaciones/push/suscripciones — dispositivos que reciben avisos. */
export async function listSuscripciones(req, res) {
  const suscripciones = await PushSuscripcion.find({ userId: req.user.id })
    .select('endpoint dispositivo createdAt ultimoEnvio')
    .sort({ createdAt: -1 });
  res.json({ suscripciones });
}

/**
 * POST /api/notificaciones/push/suscripciones — alta (o actualización) del
 * dispositivo. Si el navegador estaba suscrito con otra cuenta, pasa a esta.
 */
export async function postSuscripcion(req, res) {
  const userId = req.user.id;
  const { endpoint, keys, dispositivo, zonaHoraria } = req.body;
  const suscripcion = await PushSuscripcion.findOneAndUpdate(
    { endpoint },
    { userId, endpoint, keys, dispositivo },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
  );
  // La zona horaria del dispositivo decide a qué hora llegan los avisos diarios.
  if (zonaHoraria) await User.updateOne({ _id: userId }, { 'notificaciones.zonaHoraria': zonaHoraria });
  res.status(201).json({ suscripcion: { _id: suscripcion._id, dispositivo: suscripcion.dispositivo } });
}

/** DELETE /api/notificaciones/push/suscripciones — baja del dispositivo. */
export async function deleteSuscripcion(req, res) {
  await PushSuscripcion.deleteOne({ userId: req.user.id, endpoint: req.body.endpoint });
  res.status(204).end();
}

/** GET /api/notificaciones/preferencias */
export async function getPreferencias(req, res) {
  const user = await User.findById(req.user.id).select('notificaciones');
  res.json({ preferencias: user.notificaciones });
}

/** PUT /api/notificaciones/preferencias */
export async function putPreferencias(req, res) {
  const user = await User.findById(req.user.id);
  user.notificaciones = req.body;
  await user.save();
  res.json({ preferencias: user.notificaciones });
}
