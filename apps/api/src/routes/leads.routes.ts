import { Router } from 'express';
import { createProfessionalLead } from '../controllers/leads.controller';
import { rateLimit } from '../middlewares/rateLimit.middleware';

const router = Router();

router.post(
    '/professional',
    rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'lead' }),
    createProfessionalLead
);

export default router;
