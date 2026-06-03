import { Router } from 'express';
import { createCertification, getCertifications, associateCertification } from './controller';

const router = Router();

router.post('/', createCertification);
router.get('/', getCertifications);
router.post('/volunteers/:volunteerId', associateCertification);

export default router;
