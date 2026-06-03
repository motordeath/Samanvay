import { Router } from 'express';
import {
  createNeed,
  getNeed,
  getNeeds,
  updateNeed,
  deleteNeed,
} from './controller';

const router = Router();

router.post('/', createNeed);
router.get('/', getNeeds);
router.get('/:id', getNeed);
router.patch('/:id', updateNeed);
router.delete('/:id', deleteNeed);

export default router;
