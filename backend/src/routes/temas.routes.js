import { Router } from 'express';
import { deleteTema, marcarEstudiado, updateTema } from '../controllers/temas.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.js';
import { marcarEstudiadoSchema, temaSchema } from '../validators/tema.schemas.js';

const router = Router();

router.use(requireAuth);

router.put('/:id', validate({ params: idParams, body: temaSchema }), updateTema);
router.delete('/:id', validate({ params: idParams }), deleteTema);
router.patch('/:id/marcar-estudiado', validate({ params: idParams, body: marcarEstudiadoSchema }), marcarEstudiado);

export default router;
