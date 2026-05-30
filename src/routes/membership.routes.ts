import { Router } from 'express';
import * as membershipController from '../controllers/membership.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole } from '../middleware/authorization.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN']),
  membershipController.create
);

// Read-only — no auth required in this phase
router.get('/org/:id', membershipController.getOrganizationMembers);

export default router;
