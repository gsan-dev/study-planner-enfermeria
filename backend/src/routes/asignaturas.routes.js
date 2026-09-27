import { Router } from 'express';
import {
  archivarAsignatura,
  createAsignatura,
  deleteAsignatura,
  getAsignatura,
  listAsignaturas,
  updateAsignatura,
} from '../controllers/asignaturas.controller.js';
import { createTema, listTemas } from '../controllers/temas.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { archivarSchema, asignaturaSchema, listAsignaturasQuery } from '../validators/asignatura.schemas.js';
import { idParams } from '../validators/common.js';
import { temaSchema } from '../validators/tema.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listAsignaturasQuery }), listAsignaturas);
router.post('/', validate({ body: asignaturaSchema }), createAsignatura);
router.get('/:id', validate({ params: idParams }), getAsignatura);
router.put('/:id', validate({ params: idParams, body: asignaturaSchema }), updateAsignatura);
router.delete('/:id', validate({ params: idParams }), deleteAsignatura);
router.patch('/:id/archivar', validate({ params: idParams, body: archivarSchema }), archivarAsignatura);

// Temario de la asignatura
router.get('/:id/temas', validate({ params: idParams }), listTemas);
router.post('/:id/temas', validate({ params: idParams, body: temaSchema }), createTema);

export default router;
