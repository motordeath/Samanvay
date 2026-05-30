import { Router } from 'express';
import { createResourceLotController, getResourceLotsController, getResourceLotController } from '../controllers/resource-lot.controller';

const router = Router();

router.post('/', createResourceLotController);
router.get('/', getResourceLotsController);
router.get('/:id', getResourceLotController);

export default router;
