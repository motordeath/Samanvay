import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole, requireEventAccess } from '../middleware/authorization.middleware';

const router = Router();

// Public reads
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);

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
