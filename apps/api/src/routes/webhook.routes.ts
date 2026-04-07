import express, { Router } from 'express';
import { verifyWebhook, handleWhatsAppMessage, handleTwilioMessage } from '../controllers/webhook.controller';
import { whatsappRateLimit } from '../middlewares/rate-limit';

const router = Router();

router.get('/whatsapp', verifyWebhook);
router.post('/whatsapp', whatsappRateLimit, express.raw({ type: 'application/json' }), handleWhatsAppMessage);
router.post('/twilio', express.urlencoded({ extended: false }), handleTwilioMessage);

export default router;
