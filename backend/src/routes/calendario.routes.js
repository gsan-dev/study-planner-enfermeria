import { Router } from 'express';
import { getMes } from '../controllers/calendario.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { mesQuery } from '../validators/dashboard.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/mes', validate({ query: mesQuery }), getMes);

export default router;
