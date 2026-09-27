import { Router } from 'express';
import { actualizarTarea, borrarTarea, crearTarea, getAgenda, guardarDiario } from '../controllers/agenda.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  actualizarTareaSchema,
  agendaQuery,
  crearTareaSchema,
  diarioSchema,
  fechaParams,
} from '../validators/agenda.schemas.js';
import { idParams } from '../validators/common.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: agendaQuery }), getAgenda);
router.post('/tareas', validate({ body: crearTareaSchema }), crearTarea);
router.patch('/tareas/:id', validate({ params: idParams, body: actualizarTareaSchema }), actualizarTarea);
router.delete('/tareas/:id', validate({ params: idParams }), borrarTarea);
router.put('/diario/:fecha', validate({ params: fechaParams, body: diarioSchema }), guardarDiario);

export default router;
