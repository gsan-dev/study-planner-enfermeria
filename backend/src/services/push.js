import webpush from 'web-push';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Config, PushSuscripcion } from '../models/index.js';

let clavePublica = null;

/**
 * Prepara Web Push. Las claves VAPID salen de VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY
 * si están definidas; si no, se generan una vez y se guardan en la base de
 * datos, así sobreviven a reinicios y despliegues sin configurar nada.
 * (Si las claves cambiasen, las suscripciones existentes dejarían de valer.)
 */
export async function iniciarPush() {
  let claves;
  if (env.vapidPublicKey && env.vapidPrivateKey) {
    claves = { publicKey: env.vapidPublicKey, privateKey: env.vapidPrivateKey };
  } else {
    const guardadas = await Config.findOne({ clave: 'vapid' });
    if (guardadas) {
      claves = guardadas.valor;
    } else {
      claves = webpush.generateVAPIDKeys();
      // upsert: si dos arranques coinciden, se queda la primera.
      await Config.updateOne({ clave: 'vapid' }, { $setOnInsert: { valor: claves } }, { upsert: true });
      claves = (await Config.findOne({ clave: 'vapid' })).valor;
      logger.info('Claves VAPID generadas y guardadas');
    }
  }
  webpush.setVapidDetails(env.vapidSubject, claves.publicKey, claves.privateKey);
  clavePublica = claves.publicKey;
}

export const getClavePublica = () => clavePublica;

/**
 * Envía una notificación a todos los dispositivos de la usuaria. Las
 * suscripciones caducadas o revocadas (404/410) se borran.
 * Devuelve cuántos dispositivos la recibieron.
 */
export async function enviarPush(userId, notificacion) {
  if (!clavePublica) return 0;
  const suscripciones = await PushSuscripcion.find({ userId });
  if (suscripciones.length === 0) return 0;

  const payload = JSON.stringify({
    id: notificacion._id,
    titulo: notificacion.titulo,
    mensaje: notificacion.mensaje,
    url: notificacion.url,
    tag: notificacion.clave ?? notificacion.tipo,
  });

  const resultados = await Promise.allSettled(
    suscripciones.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, {
        // Si el dispositivo está apagado, el aviso espera hasta 12 h.
        TTL: 12 * 60 * 60,
        urgency: 'normal',
        timeout: 10_000,
      }),
    ),
  );

  let enviados = 0;
  const caducadas = [];
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      enviados += 1;
    } else if (r.reason?.statusCode === 404 || r.reason?.statusCode === 410) {
      caducadas.push(suscripciones[i]._id);
    } else {
      logger.warn({ status: r.reason?.statusCode, err: r.reason?.message }, 'No se pudo enviar una notificación push');
    }
  });
  await Promise.all([
    caducadas.length ? PushSuscripcion.deleteMany({ _id: { $in: caducadas } }) : null,
    enviados
      ? PushSuscripcion.updateMany(
          { _id: { $in: suscripciones.filter((_, i) => resultados[i].status === 'fulfilled').map((s) => s._id) } },
          { ultimoEnvio: new Date() },
        )
      : null,
  ]);
  return enviados;
}
