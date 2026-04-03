import express, { Router } from 'express';
import { verifyWebhook, handleWhatsAppMessage } from '../controllers/webhook.controller';

const router = Router();

router.get('/whatsapp', verifyWebhook);
router.post('/whatsapp', express.raw({ type: 'application/json' }), handleWhatsAppMessage);

export default router;
