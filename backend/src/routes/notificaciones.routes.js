import { Router } from 'express';
import {
  borrarNotificacion,
  deleteSuscripcion,
  getClave,
  getPreferencias,
  leerNotificacion,
  leerTodas,
  listNotificaciones,
  listSuscripciones,
  postComprobar,
  postNotificacion,
  postPrueba,
  postSuscripcion,
  putPreferencias,
} from '../controllers/notificaciones.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.js';
import {
  bajaSuscripcionSchema,
  crearNotificacionSchema,
  leerSchema,
  listNotificacionesQuery,
  preferenciasSchema,
  suscripcionSchema,
} from '../validators/notificacion.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listNotificacionesQuery }), listNotificaciones);
router.post('/', validate({ body: crearNotificacionSchema }), postNotificacion);
router.post('/prueba', postPrueba);
router.post('/comprobar', postComprobar);
router.patch('/leer-todas', leerTodas);

router.get('/preferencias', getPreferencias);
router.put('/preferencias', validate({ body: preferenciasSchema }), putPreferencias);

router.get('/push/clave', getClave);
router.get('/push/suscripciones', listSuscripciones);
router.post('/push/suscripciones', validate({ body: suscripcionSchema }), postSuscripcion);
router.delete('/push/suscripciones', validate({ body: bajaSuscripcionSchema }), deleteSuscripcion);

router.patch('/:id/leer', validate({ params: idParams, body: leerSchema }), leerNotificacion);
router.delete('/:id', validate({ params: idParams }), borrarNotificacion);

export default router;
