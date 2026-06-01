import { Router } from 'express';
import { checkIn, checkOut, getAttendance } from './controller';

const router = Router();

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/:assignmentId', getAttendance);

export default router;
