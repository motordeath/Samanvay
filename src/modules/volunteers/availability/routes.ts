import { Router } from 'express';
import {
  createAvailability,
  getVolunteerAvailability,
  updateAvailability,
  deleteAvailability,
} from './controller';

const router = Router();

router.post('/', createAvailability);
router.get('/:volunteerId', getVolunteerAvailability);
router.patch('/:id', updateAvailability);
router.delete('/:id', deleteAvailability);

export default router;
