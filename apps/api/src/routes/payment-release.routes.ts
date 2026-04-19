import { Router } from 'express';
import { releasePayment } from '../controllers/payment-release.controller';

const router = Router();

router.get('/jobs/:jobId/release', releasePayment);

export default router;
