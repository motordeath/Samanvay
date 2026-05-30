import { Router } from 'express';
import { createResourceNeedController, getResourceNeedsController, getResourceNeedController, cancelResourceNeedController } from '../controllers/resource-need.controller';

const router = Router();

router.post('/', createResourceNeedController);
router.get('/', getResourceNeedsController);
router.get('/:id', getResourceNeedController);
router.post('/:id/cancel', cancelResourceNeedController);

export default router;
