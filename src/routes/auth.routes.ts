import { Router } from 'express';
import { registerController, loginController, meController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerController);
router.post('/login', loginController);
router.get('/me', authenticate, meController);

export default router;
