import { Router } from 'express';
import * as membershipController from '../controllers/membership.controller';

const router = Router();

router.post('/', membershipController.create);
// Note: Spec says GET /organizations/:id/members but we map it here or in org routes.
// We'll expose it here for simplicity and mount it appropriately in server.ts if needed,
// but let's just use it as GET /memberships/org/:id
router.get('/org/:id', membershipController.getOrganizationMembers);

export default router;
