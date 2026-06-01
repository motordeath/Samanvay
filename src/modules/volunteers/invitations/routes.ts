import { Router } from 'express';
import { sendInvitation, respondInvitation, getInvitations } from './controller';

const router = Router();

router.post('/', sendInvitation);
router.get('/', getInvitations);
router.patch('/:id/respond', respondInvitation);

export default router;
