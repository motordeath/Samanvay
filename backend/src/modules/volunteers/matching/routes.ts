import { Router } from 'express';
import { computeMatches } from './controller';

const router = Router();

router.post('/volunteer-needs/:needId', computeMatches);

export default router;
