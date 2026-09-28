import { Router } from 'express';
import {
  cambiarEmail,
  cambiarFoto,
  cambiarNombre,
  getMe,
  login,
  logout,
  quitarFoto,
  refreshToken,
  register,
  updateMe,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import {
  cambiarEmailSchema,
  cambiarNombreSchema,
  fotoSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateMeSchema,
} from '../validators/auth.schemas.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/refresh-token', validate({ body: refreshSchema }), refreshToken);
router.post('/logout', validate({ body: refreshSchema }), logout);

router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, validate({ body: updateMeSchema }), updateMe);
// Con la contraseña (y el mismo límite de intentos que el login).
router.patch('/me/nombre', requireAuth, authLimiter, validate({ body: cambiarNombreSchema }), cambiarNombre);
router.patch('/me/email', requireAuth, authLimiter, validate({ body: cambiarEmailSchema }), cambiarEmail);
router.put('/me/foto', requireAuth, validate({ body: fotoSchema }), cambiarFoto);
router.delete('/me/foto', requireAuth, quitarFoto);

export default router;
