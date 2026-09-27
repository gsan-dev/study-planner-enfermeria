import { Router } from 'express';
import {
  createExamen,
  deleteExamen,
  getDetalles,
  getExamen,
  listExamenes,
  setTemasExamen,
  updateExamen,
} from '../controllers/examenes.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.js';
import { examenSchema, listExamenesQuery, temasExamenSchema } from '../validators/examen.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listExamenesQuery }), listExamenes);
router.post('/', validate({ body: examenSchema }), createExamen);
router.get('/:id', validate({ params: idParams }), getExamen);
router.put('/:id', validate({ params: idParams, body: examenSchema }), updateExamen);
router.delete('/:id', validate({ params: idParams }), deleteExamen);
router.get('/:id/detalles', validate({ params: idParams }), getDetalles);
router.post('/:id/temas', validate({ params: idParams, body: temasExamenSchema }), setTemasExamen);

export default router;
