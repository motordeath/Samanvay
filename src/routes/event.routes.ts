import { Router } from 'express';
import * as eventController from '../controllers/event.controller';

const router = Router();

router.post('/', eventController.create);
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);
router.patch('/:id', eventController.update);

export default router;
