import { Router } from 'express';
import { getTransfersController, getTransferController, createDirectTransferController, acceptTransferController, startTransitController, deliverTransferController, cancelTransferController } from '../controllers/transfer.controller';

const router = Router();

import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole, requireTransferOwnership } from '../middleware/authorization.middleware';

router.get('/', authenticate, getTransfersController);
router.get('/:id', authenticate, requireTransferOwnership(), getTransferController);
router.post('/direct', authenticate, requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']), createDirectTransferController);
router.patch('/:id/accept', authenticate, requireTransferOwnership(), acceptTransferController);
router.patch('/:id/start-transit', authenticate, requireTransferOwnership(), startTransitController);
router.patch('/:id/deliver', authenticate, requireTransferOwnership(), deliverTransferController);
router.patch('/:id/cancel', authenticate, requireTransferOwnership(), cancelTransferController);

// Legacy/Test Aliases
router.post('/:id/start', authenticate, requireTransferOwnership(), startTransitController);
router.post('/:id/complete', authenticate, requireTransferOwnership(), deliverTransferController);
router.post('/:id/cancel', authenticate, requireTransferOwnership(), cancelTransferController);

export default router;
