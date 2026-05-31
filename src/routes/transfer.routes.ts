import { Router } from 'express';
import { getTransfersController, getTransferController, completeTransferController, cancelTransferController, startTransfer } from '../controllers/transfer.controller';

const router = Router();

import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole, requireTransferOwnership } from '../middleware/authorization.middleware';

router.get('/', authenticate, getTransfersController);
router.get('/:id', authenticate, requireTransferOwnership(), getTransferController);
router.post('/:id/start', authenticate, requireTransferOwnership(), startTransfer);

router.post(
  '/:id/complete',
  authenticate,
  requireTransferOwnership(),
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  completeTransferController
);

router.post(
  '/:id/cancel',
  authenticate,
  requireTransferOwnership(),
  requireOrganizationRole(['OWNER', 'ADMIN']),
  cancelTransferController
);

export default router;
