import { Router } from 'express';
import {
    getDashboard,
    getConversations,
    getConversationMessages,
    sendManualMessage,
    getProfessionals,
    getProfessionalDetail,
    createProfessional,
    updateProfessional,
    updateProfessionalStatus,
    deleteProfessional,
    getUsers,
    getUserDetail,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,
    listAdminProfessionalDocuments,
    uploadAdminProfessionalDocument,
    deleteAdminProfessionalDocument,
    getJobs,
    getJobDetail,
    reassignJob,
    refundJob,
    getFinanceSummary,
    getPendingEarnings,
    processEarning,
    getConfig,
    updateConfig,
    getUnassignedServiceRequests,
    assignTechnician,
} from '../controllers/admin.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);
router.use(requireRole('admin'));

// Dashboard & Conversations
router.get('/dashboard', getDashboard);
router.get('/conversations', getConversations);
router.post('/conversations/:phone/send', sendManualMessage);
router.get('/conversations/:phone', getConversationMessages);

// Professionals
router.get('/professionals', getProfessionals);
router.post('/professionals', createProfessional);
router.get('/professionals/:id', getProfessionalDetail);
router.put('/professionals/:id', updateProfessional);
router.put('/professionals/:id/status', updateProfessionalStatus);
router.delete('/professionals/:id', deleteProfessional);
router.get('/professionals/:id/documents', listAdminProfessionalDocuments);
router.post('/professionals/:id/documents', uploadAdminProfessionalDocument);
router.delete('/professionals/:id/documents/:docId', deleteAdminProfessionalDocument);

// Users
router.get('/users', getUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserDetail);
router.put('/users/:id', updateUser);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/service-requests/unassigned', getUnassignedServiceRequests);
router.post('/service-requests/:id/assign-technician', assignTechnician);

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
