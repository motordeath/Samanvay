import { Router } from 'express';
import { createResourceController, getResourcesController, getResourceController } from '../controllers/resource.controller';

const router = Router();
import { authenticate } from '../middleware/auth.middleware';

router.post('/', authenticate, createResourceController);
router.get('/', getResourcesController);
router.get('/:id', getResourceController);

export default router;
