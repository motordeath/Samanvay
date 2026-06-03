import { Router } from 'express';
import { registerController, loginController, meController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/register', authRateLimiter, registerController);
router.post('/login', authRateLimiter, loginController);
router.get('/me', authenticate, meController);

export default router;
