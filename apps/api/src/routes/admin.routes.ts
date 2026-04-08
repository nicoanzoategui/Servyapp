import { Router } from 'express';
import {
    getDashboard,
    getConversations,
    getConversationDetail,
    sendManualMessage,
    getProfessionals,
    getProfessionalDetail,
    createProfessional,
    updateProfessional,
    updateProfessionalStatus,
    getJobs,
    getJobDetail,
    reassignJob,
    refundJob,
    getFinanceSummary,
    getPendingEarnings,
    processEarning,
    getConfig,
    updateConfig
} from '../controllers/admin.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);
router.use(requireRole('admin'));

// Dashboard & Conversations
router.get('/dashboard', getDashboard);
router.get('/conversations', getConversations);
router.get('/conversations/:phone', getConversationDetail);
router.post('/conversations/:phone/send', sendManualMessage);

// Professionals
router.get('/professionals', getProfessionals);
router.post('/professionals', createProfessional);
router.get('/professionals/:id', getProfessionalDetail);
router.put('/professionals/:id', updateProfessional);
router.put('/professionals/:id/status', updateProfessionalStatus);

// Jobs
router.get('/jobs', getJobs);
router.get('/jobs/:id', getJobDetail);
router.put('/jobs/:id/reassign', reassignJob);
router.post('/jobs/:id/refund', refundJob);

// Finance
router.get('/finance/summary', getFinanceSummary);
router.get('/finance/earnings', getPendingEarnings);
router.post('/finance/earnings/:id/process', processEarning);

// Config
router.get('/config', getConfig);
router.put('/config', updateConfig);

export default router;
