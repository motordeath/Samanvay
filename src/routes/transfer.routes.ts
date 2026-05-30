import { Router } from 'express';
import { getTransfersController, getTransferController, completeTransferController, cancelTransferController, startTransfer } from '../controllers/transfer.controller';

const router = Router();

import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole } from '../middleware/authorization.middleware';

router.get('/', getTransfersController);
router.get('/:id', getTransferController);
router.post('/:id/start', startTransfer);

router.post(
  '/:id/complete',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  completeTransferController
);

router.post(
  '/:id/cancel',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN']),
  cancelTransferController
);

export default router;
