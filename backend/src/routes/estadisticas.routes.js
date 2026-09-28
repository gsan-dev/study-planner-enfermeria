import { Router } from 'express';
import { getEvolucion, getPorTema, getPrediccion, getSemana } from '../controllers/estadisticas.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { evolucionQuery, hoyQuery, porTemaQuery } from '../validators/progreso.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/semana-actual', validate({ query: hoyQuery }), getSemana);
router.get('/por-tema', validate({ query: porTemaQuery }), getPorTema);
router.get('/evolucion', validate({ query: evolucionQuery }), getEvolucion);
router.get('/prediccion', validate({ query: hoyQuery }), getPrediccion);

export default router;
