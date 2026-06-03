import { Router } from 'express';
import { createSkill, getSkills, associateSkill } from './controller';

const router = Router();

router.post('/', createSkill);
router.get('/', getSkills);
router.post('/volunteers/:volunteerId', associateSkill);

export default router;
