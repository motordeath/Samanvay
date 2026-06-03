import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole } from '../middleware/authorization.middleware';

const router = Router();

// Phase 3.4: Protect audit queries to OWNER and ADMIN only.
router.get(
  '/',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN']),
  auditController.getAuditLogsController
);

export default router;
