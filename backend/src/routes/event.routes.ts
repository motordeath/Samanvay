import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole, requireEventAccess } from '../middleware/authorization.middleware';
import { getEventReadinessController } from '../controllers/event.controller';

const router = Router();

// Public reads
router.get(
  '/:id/readiness',
  authenticate,
  getEventReadinessController
);
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);
router.get('/:id/coordination-status', eventController.getCoordinationStatus);

// Protected writes
// organizationId flows through req.body (it's a required field in createEventSchema)
// so getOrganizationContext resolves it automatically.
router.post(
  '/',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  eventController.create
);

router.patch(
  '/:id',
  authenticate,
  requireEventAccess(),
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  eventController.update
);

export default router;
