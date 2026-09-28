import { Router } from 'express';
import {
  borrarRegistro,
  getPorAsignatura,
  getResumen,
  listRegistros,
  registrarHoras,
} from '../controllers/progreso.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.js';
import { hoyQuery, listRegistrosQuery, porAsignaturaQuery, registrarHorasSchema } from '../validators/progreso.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listRegistrosQuery }), listRegistros);
router.post('/registrar-horas', validate({ body: registrarHorasSchema }), registrarHoras);
router.get('/resumen', validate({ query: hoyQuery }), getResumen);
router.get('/por-asignatura', validate({ query: porAsignaturaQuery }), getPorAsignatura);
router.delete('/:id', validate({ params: idParams }), borrarRegistro);

export default router;
