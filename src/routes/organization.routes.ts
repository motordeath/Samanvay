import { Router } from 'express';
import * as orgController from '../controllers/organization.controller';

const router = Router();

router.post('/', orgController.create);
router.get('/', orgController.getAll);
router.get('/:id', orgController.getById);
router.patch('/:id', orgController.update);

export default router;
