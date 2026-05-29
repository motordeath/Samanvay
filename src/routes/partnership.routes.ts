import { Router } from 'express';
import * as partnershipController from '../controllers/partnership.controller';

const router = Router();

router.post('/', partnershipController.create);
router.patch('/:id', partnershipController.update);

export default router;
