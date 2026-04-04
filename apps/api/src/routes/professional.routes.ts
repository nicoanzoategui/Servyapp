import { Router } from 'express';
import {
    getDashboard,
    getJobs,
    getJobDetail,
    getJobOffers,
    getJobOfferDetail,
    createQuote,
    getProfile,
    completeOnboarding,
    updateProfile,
    getEarnings,
    getEarningsSummary,
    generateReceipt,
    completeJob,
    completeJobByQr,
} from '../controllers/professional.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware for all professional routes
router.use(authenticateJWT);
router.use(requireRole('professional'));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/onboarding/complete', completeOnboarding);
router.get('/offers', getJobOffers);
router.get('/offers/:offerId', getJobOfferDetail);
router.post('/offers/:jobOfferId/quote', createQuote);
router.get('/jobs', getJobs);
router.get('/jobs/:jobId', getJobDetail);
/** @deprecated usar POST /offers/:jobOfferId/quote */
router.post('/jobs/:jobOfferId/quote', createQuote);
router.put('/profile', updateProfile);
router.get('/earnings', getEarnings);
router.get('/earnings/summary', getEarningsSummary);
router.get('/earnings/:earningId/receipt', generateReceipt);
router.post('/jobs/:jobId/complete-qr', completeJobByQr);
router.put('/jobs/:jobId/complete', completeJob);

export default router;
