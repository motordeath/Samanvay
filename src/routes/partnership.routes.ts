import { Router } from 'express';
import * as partnershipController from '../controllers/partnership.controller';

const router = Router();

import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizationRole, requirePartnershipOwnership } from '../middleware/authorization.middleware';

router.post('/', authenticate, requireOrganizationRole(['OWNER', 'ADMIN']), partnershipController.create);
router.patch('/:id', authenticate, requirePartnershipOwnership(), requireOrganizationRole(['OWNER', 'ADMIN']), partnershipController.update);

export default router;
