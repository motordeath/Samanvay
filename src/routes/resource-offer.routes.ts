import { Router } from 'express';
import { createResourceOfferController, getResourceOffersController, getResourceOfferController, acceptOfferController, rejectOfferController, withdrawOfferController } from '../controllers/resource-offer.controller';

const router = Router();

import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole } from '../middleware/authorization.middleware';

router.post('/', authenticate, requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']), createResourceOfferController);
router.get('/', getResourceOffersController);
router.get('/:id', getResourceOfferController);

router.post(
  '/:id/accept',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  acceptOfferController
);

router.post(
  '/:id/reject',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  rejectOfferController
);

router.post(
  '/:id/withdraw',
  authenticate,
  requireOrganizationRole(['OWNER', 'ADMIN', 'COORDINATOR']),
  withdrawOfferController
);

export default router;
