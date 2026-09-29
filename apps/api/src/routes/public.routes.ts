import { Router } from 'express';
import { confirmCheckin, getCheckin } from '../controllers/public-checkin.controller';
import { rateLimit } from '../middlewares/rateLimit.middleware';

const router = Router();

router.get(
    '/checkin/:token',
    rateLimit({ windowMs: 60_000, max: 40, keyPrefix: 'checkin-get' }),
    getCheckin
);
router.post(
    '/checkin/:token/confirm',
    rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'checkin-post' }),
    confirmCheckin
);

export default router;
