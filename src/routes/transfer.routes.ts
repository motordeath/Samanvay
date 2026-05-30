import { Router } from 'express';
import { getTransfersController, getTransferController, completeTransferController, cancelTransferController, startTransfer } from '../controllers/transfer.controller';

const router = Router();

router.get('/', getTransfersController);
router.get('/:id', getTransferController);
router.post('/:id/start', startTransfer);
router.post('/:id/complete', completeTransferController);
router.post('/:id/cancel', cancelTransferController);

export default router;
