import { Router } from 'express';
import { createResourceLotController, getResourceLotsController, getResourceLotController } from '../controllers/resource-lot.controller';

const router = Router();
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole } from '../middleware/authorization.middleware';

router.post('/', authenticate, requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']), createResourceLotController);
router.get('/', getResourceLotsController);
router.get('/:id', getResourceLotController);

export default router;
