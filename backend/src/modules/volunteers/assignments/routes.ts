import { Router } from 'express';
import {
  createAssignment,
  getAssignment,
  getAssignments,
  updateAssignmentStatus,
  completeAssignment,
  deleteAssignment,
} from './controller';

const router = Router();

router.post('/', createAssignment);
router.get('/', getAssignments);
router.get('/:id', getAssignment);
router.patch('/:id/status', updateAssignmentStatus);
router.post('/:id/complete', completeAssignment);
router.delete('/:id', deleteAssignment);

export default router;
