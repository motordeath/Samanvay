import { Router } from 'express';
import { createResourceNeedController, getResourceNeedsController, getResourceNeedController, cancelResourceNeedController, getResourceNeedMatchesController } from '../controllers/resource-need.controller';

const router = Router();

import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole } from '../middleware/authorization.middleware';

// resource-need.routes.ts
router.post('/', authenticate, requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR', 'VOLUNTEER_MANAGER']), createResourceNeedController);
router.get('/', getResourceNeedsController);
router.get('/:id', getResourceNeedController);
router.get('/:id/matches', authenticate, getResourceNeedMatchesController);
router.post(
  '/:id/cancel',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  cancelResourceNeedController
);

export default router;
