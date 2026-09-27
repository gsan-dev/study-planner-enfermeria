import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// El healthcheck queda fuera del rate limit (Docker lo llama continuamente).
router.get('/health', getHealth);

router.use(apiLimiter);

// Ruta protegida mínima para comprobar el middleware JWT.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Fase 2+: router.use('/auth', authRoutes); router.use('/asignaturas', ...), etc.

export default router;
