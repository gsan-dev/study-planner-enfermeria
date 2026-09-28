import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { dashboardQuery } from '../validators/dashboard.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: dashboardQuery }), getDashboard);

export default router;
