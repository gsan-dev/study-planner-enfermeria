import { Router } from 'express';
import { getMe, login, logout, refreshToken, register, updateMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, refreshSchema, registerSchema, updateMeSchema } from '../validators/auth.schemas.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/refresh-token', validate({ body: refreshSchema }), refreshToken);
router.post('/logout', validate({ body: refreshSchema }), logout);

router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, validate({ body: updateMeSchema }), updateMe);

export default router;
