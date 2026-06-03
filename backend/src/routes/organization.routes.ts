import { Router } from 'express';
import * as orgController from '../controllers/organization.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole, requireOrganizationAccess } from '../middleware/authorization.middleware';

const router = Router();

// Public — creating an org is open (you can't be a member before the org exists)
router.post('/', orgController.create);
router.get('/', orgController.getAll);
router.get('/:id', orgController.getById);

// Protected — only existing OWNER or ADMIN can modify the organization.
// organizationId must be supplied in the request body because req.params.id is
// the target organization, not an org-context parameter for getOrganizationContext.
router.patch(
  '/:id',
  authenticate,
  requireOrganizationAccess(),
  requireOrganizationRole(['OWNER', 'ADMIN']),
  orgController.update
);

export default router;
