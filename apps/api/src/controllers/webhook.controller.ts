import { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../utils/env';
import { prisma } from '@servy/db';
import { ConversationService } from '../services/conversation.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { MercadoPagoService } from '../services/mercadopago.service';
import { QRService } from '../services/qr.service';
import { redis } from '../utils/redis';
import { processAvailabilityMessage } from '../agents/availability-agent';
import { processQualityUserReply } from '../agents/quality-agent';
import { tryExperimentWaitlist } from '../agents/experiments-agent';

export const verifyWebhook = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WA_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
};

function verifyWhatsAppSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (env.WA_SKIP_SIGNATURE) return true;
    if (!signatureHeader || !env.WA_APP_SECRET) return false;
    const expected = `sha256=${crypto.createHmac('sha256', env.WA_APP_SECRET).update(rawBody).digest('hex')}`;
    if (signatureHeader.length !== expected.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
    } catch {
        return false;
    }
}

export const handleWhatsAppMessage = async (req: Request, res: Response) => {
    res.sendStatus(200);

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = req.headers['x-hub-signature-256'] as string | undefined;

    if (!verifyWhatsAppSignature(rawBody, signature)) {
        console.error('[WA webhook] Firma inválida o ausente');
        return;
    }

    let body: any;
    try {
        body = JSON.parse(rawBody.toString('utf8'));
    } catch {
        console.error('[WA webhook] JSON inválido');
        return;
    }

    try {
        const { entry } = body;
        if (!entry || entry.length === 0) return;

        for (const ent of entry) {
            if (!ent.changes || ent.changes.length === 0) continue;
            const change = ent.changes[0].value;

            if (change.messages && change.messages.length > 0) {
                const message = change.messages[0];
                const phone = message.from;
                const messageType = message.type;

                let content = '';
                if (messageType === 'text') {
                    content = message.text.body;
                } else if (messageType === 'image') {
                    content = message.image.id;
                } else if (messageType === 'interactive') {
                    const interactive = message.interactive;
                    if (interactive.type === 'button_reply') {
                        content = interactive.button_reply.id;
                    } else if (interactive.type === 'list_reply') {
                        content = interactive.list_reply.id;
                    }
                }

                if (phone && content) {
                    await ConversationService.processMessage(phone, messageType, content).catch(console.error);
                }
            }
        }
    } catch (error) {
        console.error('Webhook error:', error);
    }
};

export const handleMPWebhook = async (req: Request, res: Response) => {
    res.sendStatus(200);

    try {
        void req.headers['x-signature'];

        const { type, data } = req.body || {};
        if (type !== 'payment' || !data?.id) return;

        const paymentData = await MercadoPagoService.getPayment(String(data.id));
        const status = paymentData.status;
        const metadata = paymentData.metadata as { quotation_id?: string; user_phone?: string };

        const quotationId = metadata.quotation_id;
        if (!quotationId) return;

        if (status === 'approved') {
            const existing = await prisma.job.findUnique({ where: { quotation_id: quotationId } });
            if (existing) return;

            const payUp = await prisma.payment.updateMany({
                where: { quotation_id: quotationId },
                data: { status: 'approved', mp_payment_id: String(data.id), paid_at: new Date() },
            });
            if (payUp.count === 0) return;

            const job = await prisma.job.create({
                data: {
                    quotation_id: quotationId,
                    status: 'confirmed',
                },
                include: { quotation: { include: { job_offer: { include: { professional: true } } } } },
            });

            const userPhone = String(metadata.user_phone);
            let qrUrl: string | null = null;
            try {
                qrUrl = await QRService.generateAndUpload(job.id);
            } catch (e) {
                console.error('[MP webhook] QR generation failed:', e);
            }

            await WhatsAppService.sendTextMessage(
                userPhone,
                `✅ ¡Pago confirmado!\n\nTu servicio quedó agendado.${qrUrl ? ' Guardá este código QR — cuando el profesional termine el trabajo te lo va a pedir para liberar el pago final. 🔒' : ' El profesional se pondrá en contacto pronto.'}`
            );
            if (qrUrl) {
                await WhatsAppService.sendImageMessage(userPhone, qrUrl);
            }

            await WhatsAppService.sendTextMessage(
                job.quotation.job_offer.professional.phone,
                '¡Pago aprobado! El trabajo ha sido confirmado. Revisá el portal para los detalles.'
            );
        } else if (status === 'rejected' || status === 'cancelled') {
            await prisma.payment.updateMany({
                where: { quotation_id: quotationId },
                data: { status, mp_payment_id: String(data.id) },
            });

            if (metadata.user_phone) {
                await WhatsAppService.sendTextMessage(
                    String(metadata.user_phone),
                    'El pago falló o fue cancelado. ¿Querés intentar de nuevo?'
                );
            }
        }
    } catch (error) {
        console.error('MP Webhook Error:', error);
    }
};

export const handleTwilioMessage = async (req: Request, res: Response) => {
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');

    try {
        const phone = (req.body.From as string)?.replace(/whatsapp:/i, '').replace('+', '').trim();
        const messageType = req.body.NumMedia && parseInt(req.body.NumMedia) > 0 ? 'image' : 'text';
        const latRaw = req.body.Latitude;
        const lngRaw = req.body.Longitude;
        const lat =
            latRaw != null && String(latRaw).trim() !== '' && !Number.isNaN(parseFloat(String(latRaw)))
                ? parseFloat(String(latRaw))
                : undefined;
        const lng =
            lngRaw != null && String(lngRaw).trim() !== '' && !Number.isNaN(parseFloat(String(lngRaw)))
                ? parseFloat(String(lngRaw))
                : undefined;

        let content =
            messageType === 'image'
                ? String(req.body.MediaUrl0 || '')
                : String(req.body.Body || '').trim();

        if (!content && lat != null && lng != null) {
            content = '__LOCATION__';
        }

        if (!phone || !content) return;

        // Comando global cancelar para ambos flujos
        if (content.toLowerCase().trim() === 'cancelar') {
            // Limpiar sesión de usuario
            try {
                await redis.del(`session:${phone}`);
                await prisma.whatsappSession.delete({ where: { phone } }).catch(() => {});
            } catch {
                /* ignore */
            }
            // Limpiar sesión de profesional
            try {
                await redis.del(`pro_session:${phone}`);
                await prisma.professionalSession.delete({ where: { phone } }).catch(() => {});
            } catch {
                /* ignore */
            }
            await WhatsAppService.sendTextMessage(phone, 'Listo, sesión cancelada. Escribí cuando quieras empezar de nuevo.');
            return;
        }

        // Verificar primero si es un profesional
        const professional = await prisma.professional.findUnique({ where: { phone } });
        if (professional) {
            const handledAvail = await processAvailabilityMessage({
                professional,
                body: content,
                messageType,
                lat,
                lng,
            }).catch(() => false);
            if (handledAvail) return;

            const { ProfessionalConversationService } = await import('../services/professional.conversation.service');
            await ProfessionalConversationService.processMessage(phone, content).catch(console.error);
            return;
        }

        const userRow = await prisma.user.findUnique({ where: { phone } });
        const qHandled = await processQualityUserReply(phone, content).catch(() => false);
        if (qHandled) return;

        const expHandled = await tryExperimentWaitlist(phone, content, userRow?.name).catch(() => false);
        if (expHandled) return;

        await ConversationService.processMessage(phone, messageType, content).catch(console.error);
    } catch (error) {
        console.error('Twilio webhook error:', error);
    }
};
