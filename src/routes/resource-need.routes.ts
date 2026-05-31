import { Router } from 'express';
import { createResourceNeedController, getResourceNeedsController, getResourceNeedController, cancelResourceNeedController } from '../controllers/resource-need.controller';

const router = Router();

import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole } from '../middleware/authorization.middleware';

router.post('/', authenticate, requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']), createResourceNeedController);
router.get('/', getResourceNeedsController);
router.get('/:id', getResourceNeedController);
router.post(
  '/:id/cancel',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  cancelResourceNeedController
);

export default router;
