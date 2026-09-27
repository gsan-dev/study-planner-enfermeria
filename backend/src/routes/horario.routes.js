import { Router } from 'express';
import { getEscaneo, guardarHorario, postEscaneo } from '../controllers/horario.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { scanLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { escanearSchema, guardarHorarioSchema } from '../validators/horario.schemas.js';

const router = Router();

router.use(requireAuth);

router.put('/', validate({ body: guardarHorarioSchema }), guardarHorario);
router.get('/escanear', getEscaneo);
router.post('/escanear', scanLimiter, validate({ body: escanearSchema }), postEscaneo);

export default router;
