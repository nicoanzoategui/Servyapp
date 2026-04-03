import { Router } from 'express';
import { professionalLogin, adminLogin, refresh } from '../controllers/auth.controller';
import { rateLimit } from '../middlewares/rateLimit.middleware';

const router = Router();

const authLimit = rateLimit({ windowMs: 60_000, max: 8, keyPrefix: 'auth' });

router.post('/professional/login', authLimit, professionalLogin);
router.post('/admin/login', authLimit, adminLogin);
router.post('/refresh', authLimit, refresh);

export default router;
