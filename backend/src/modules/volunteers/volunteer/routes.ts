import { Router } from 'express';
import {
  createVolunteer,
  getVolunteer,
  getVolunteers,
  updateVolunteer,
  deleteVolunteer,
} from './controller';

const router = Router();

router.post('/', createVolunteer);
router.get('/', getVolunteers);
router.get('/:id', getVolunteer);
router.patch('/:id', updateVolunteer);
router.delete('/:id', deleteVolunteer);

export default router;
