import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';
import agendaRoutes from './agenda.routes.js';
import asignaturasRoutes from './asignaturas.routes.js';
import authRoutes from './auth.routes.js';
import calendarioRoutes from './calendario.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import estadisticasRoutes from './estadisticas.routes.js';
import examenesRoutes from './examenes.routes.js';
import horarioRoutes from './horario.routes.js';
import planRoutes from './plan.routes.js';
import progresoRoutes from './progreso.routes.js';
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
router.use('/agenda', agendaRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/calendario', calendarioRoutes);
router.use('/progreso', progresoRoutes);
router.use('/estadisticas', estadisticasRoutes);

export default router;
