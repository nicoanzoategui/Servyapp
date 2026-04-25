import { Router } from 'express';
import {
    registerProfessional,
    forgotPassword,
    resetPassword,
    setPassword,
    magicVerify,
} from '../controllers/auth.professional.controller';
import { rateLimit } from '../middlewares/rateLimit.middleware';

const router = Router();
const authProfLimit = rateLimit({ windowMs: 60_000, max: 12, keyPrefix: 'auth_pro' });

router.post('/register', authProfLimit, registerProfessional);
router.post('/forgot-password', authProfLimit, forgotPassword);
router.post('/reset-password', authProfLimit, resetPassword);
router.post('/set-password', authProfLimit, setPassword);
router.get('/magic-verify', authProfLimit, magicVerify);

export default router;
