import { Router } from 'express';
import { createResourceController, getResourcesController, getResourceController } from '../controllers/resource.controller';

const router = Router();

router.post('/', createResourceController);
router.get('/', getResourcesController);
router.get('/:id', getResourceController);

export default router;
