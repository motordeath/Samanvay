import { Router } from 'express';
import * as membershipController from '../controllers/membership.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole, requireMembershipAccess } from '../middleware/authorization.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN']),
  membershipController.create
);

// Protected — only organization members can read memberships
router.get(
  '/org/:id',
  authenticate,
  requireMembershipAccess(),
  membershipController.getOrganizationMembers
);

export default router;
