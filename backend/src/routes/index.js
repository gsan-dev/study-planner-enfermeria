import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';
import asignaturasRoutes from './asignaturas.routes.js';
import authRoutes from './auth.routes.js';
import examenesRoutes from './examenes.routes.js';
import horarioRoutes from './horario.routes.js';
import planRoutes from './plan.routes.js';
import temasRoutes from './temas.routes.js';

const router = Router();

// El healthcheck queda fuera del rate limit (Docker lo llama continuamente).
router.get('/health', getHealth);

router.use(apiLimiter);

router.use('/auth', authRoutes);
router.use('/asignaturas', asignaturasRoutes);
router.use('/temas', temasRoutes);
router.use('/horario', horarioRoutes);
router.use('/examenes', examenesRoutes);
router.use('/plan-estudio', planRoutes);

export default router;
