import express, { Router } from 'express';
import { env } from '../utils/env';
import { verifyWebhook, handleWhatsAppMessage, handleTwilioMessage } from '../controllers/webhook.controller';

const router = Router();

if (env.WHATSAPP_CLOUD_ENABLED) {
    router.get('/whatsapp', verifyWebhook);
    router.post('/whatsapp', express.raw({ type: 'application/json' }), handleWhatsAppMessage);
} else {
    router.get('/whatsapp', (_req, res) => {
        res.status(410).json({
            error: 'WhatsApp Cloud API deshabilitado. Producción usa Twilio en POST /webhook/twilio.',
        });
    });
}

router.post('/twilio', handleTwilioMessage);

export default router;
