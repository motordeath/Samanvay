import { Router } from 'express';
import { createResourceOfferController, getResourceOffersController, getResourceOfferController, acceptOfferController, rejectOfferController, withdrawOfferController } from '../controllers/resource-offer.controller';

const router = Router();

router.post('/', createResourceOfferController);
router.get('/', getResourceOffersController);
router.get('/:id', getResourceOfferController);
router.post('/:id/accept', acceptOfferController);
router.post('/:id/reject', rejectOfferController);
router.post('/:id/withdraw', withdrawOfferController);

export default router;
