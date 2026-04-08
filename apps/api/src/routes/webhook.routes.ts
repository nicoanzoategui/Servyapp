import express, { Router } from 'express';
import { verifyWebhook, handleWhatsAppMessage, handleTwilioMessage } from '../controllers/webhook.controller';

const router = Router();

router.get('/whatsapp', verifyWebhook);
router.post('/whatsapp', express.raw({ type: 'application/json' }), handleWhatsAppMessage);
router.post('/twilio', handleTwilioMessage);

export default router;
