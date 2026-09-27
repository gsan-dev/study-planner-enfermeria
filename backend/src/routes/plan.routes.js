import { Router } from 'express';
import {
  actualizarDia,
  crearManual,
  deletePlan,
  generarAutomatico,
  getPlan,
  listPlanes,
} from '../controllers/plan.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.js';
import { actualizarDiaSchema, crearManualSchema, examenIdParams, generarSchema } from '../validators/plan.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', listPlanes);
router.post('/generar-automatico', validate({ body: generarSchema }), generarAutomatico);
router.post('/crear-manual', validate({ body: crearManualSchema }), crearManual);
router.get('/:examenId', validate({ params: examenIdParams }), getPlan);
router.put('/:id/dia', validate({ params: idParams, body: actualizarDiaSchema }), actualizarDia);
router.delete('/:id', validate({ params: idParams }), deletePlan);

export default router;
