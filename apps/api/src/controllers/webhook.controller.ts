import { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../utils/env';
import { prisma } from '@servy/db';
import { ConversationService } from '../services/conversation.service';
import { ProfessionalConversationService } from '../services/professional.conversation.service';
import { getServiceType } from '../constants/pricing';
import { WhatsAppService } from '../services/whatsapp.service';
import { MercadoPagoService } from '../services/mercadopago.service';
import { QRService } from '../services/qr.service';
import { redis } from '../utils/redis';
import { processAvailabilityMessage } from '../agents/availability-agent';
import { processQualityUserReply } from '../agents/quality-agent';
import { tryExperimentWaitlist } from '../agents/experiments-agent';
import { twilioWebhookAls } from '../lib/twilio-request-context';
import {
    maskPhoneDigitsTail,
    mediationDirectionRedisKey,
    normalizeTwilioWhatsAppFrom,
    professionalGreetedRedisKey,
    userRelayPauseRedisKey,
} from '../utils/twilio-phone';

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
                include: {
                    quotation: {
                        include: {
                            job_offer: {
                                include: {
                                    professional: {
                                        select: {
                                            id: true,
                                            name: true,
                                            last_name: true,
                                            phone: true,
                                            dni: true,
                                            bio: true,
                                            skills: true,
                                            categories: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            const userPhone = String(metadata.user_phone);
            let qrUrl: string | null = null;
            try {
                qrUrl = await QRService.generateAndUpload(job.id);
            } catch (e) {
                console.error('[MP webhook] QR generation failed:', e);
            }

            const proJob = job.quotation.job_offer;
            const serviceRequest = await prisma.serviceRequest.findUnique({
                where: { id: proJob.request_id },
                include: { user: true },
            });
            const franja = serviceRequest?.scheduled_slot ?? 'a confirmar';
            const fecha = serviceRequest?.scheduled_date
                ? new Date(serviceRequest.scheduled_date).toLocaleDateString('es-AR')
                : 'a confirmar';
            const addr = serviceRequest?.address ?? 'Ver portal';

            const qrCopy = qrUrl
                ? '🔒 *QR de liberación de pago*\nGuardá la imagen que te mandamos ahora. El técnico la escanea al terminar — ahí se libera el pago. Si algo no quedó bien, no lo muestres antes.'
                : '🔒 *QR de liberación de pago*\nEn breve te enviamos el código. El técnico lo escanea al terminar para liberar el pago.';

            const pro = job.quotation.job_offer.professional;
            const proFullName = `${pro.name}${pro.last_name ? ' ' + pro.last_name : ''}`;
            const proPhone = pro.phone;
            const proPhoneFormatted = proPhone.startsWith('549')
                ? `+${proPhone.slice(0, 2)} ${proPhone.slice(2, 4)} ${proPhone.slice(4)}`
                : proPhone;
            const proBio = pro.bio
                ? `\n📝 ${pro.bio.slice(0, 150)}${pro.bio.length > 150 ? '...' : ''}`
                : '';
            const proSkills =
                pro.skills && pro.skills.length > 0 ? `\n🔧 ${pro.skills.slice(0, 3).join(', ')}` : '';
            const proCategories =
                pro.categories && pro.categories.length > 0 ? `\n✅ ${pro.categories.join(', ')}` : '';

            await WhatsAppService.sendTextMessage(
                userPhone,
                `✅ *¡Pago confirmado!*\n\nTu técnico está reservado 🎉\n\n━━━━━━━━━━━━━━━\n*DATOS DEL TÉCNICO*\n━━━━━━━━━━━━━━━\n👤 ${proFullName}\n📞 ${proPhoneFormatted}${pro.dni ? `\n🆔 DNI: ${pro.dni}` : ''}${proBio}${proSkills}${proCategories}\n━━━━━━━━━━━━━━━\n📅 ${fecha} · ${franja}\n📍 ${addr}\n━━━━━━━━━━━━━━━\n\n${qrCopy}\n\n_En breve te enviamos la documentación del técnico._`
            );
            if (qrUrl) {
                await WhatsAppService.sendImageMessage(userPhone, qrUrl);
            }

            const totalStr = job.quotation.total_price.toLocaleString('es-AR');
            await WhatsAppService.sendTextMessage(
                job.quotation.job_offer.professional.phone,
                `💼 *Nuevo trabajo confirmado*\n\n━━━━━━━━━━━━━━━\n📍 ${serviceRequest?.address ?? 'Ver portal'}\n🔧 ${serviceRequest?.description?.slice(0, 80) ?? 'Ver portal'}\n📅 ${fecha} · turno ${franja}\n💰 *$${totalStr}*\n━━━━━━━━━━━━━━━\n\nEl pago se libera cuando el cliente te muestre el QR al terminar.\n\n🔗 _portal.servy.lat/jobs/${job.id}_\n\n━━━━━━━━━━━━━━━\n*Comandos disponibles*\n━━━━━━━━━━━━━━━\n_estoy yendo_ → avisamos al cliente\n_llego en X minutos_ → se lo reenviamos\n_no encuentro la dirección_ → le pedimos referencias\n_tuve un imprevisto_ → notificamos al cliente`
            );

            // Si es diagnóstico, preparar sesión para pedir presupuesto del arreglo
            const serviceType = getServiceType(serviceRequest?.category || '');

            if (serviceType === 'diagnostic' && serviceRequest) {
                await ProfessionalConversationService.setRepairQuoteAwaitingSession(
                    job.quotation.job_offer.professional.phone,
                    {
                        jobId: job.id,
                        userPhone,
                        requestId: serviceRequest.id,
                    }
                );

                await WhatsAppService.sendTextMessage(
                    job.quotation.job_offer.professional.phone,
                    `\n📋 *Después de la visita*\n\nCuando termines de evaluar el problema, enviame el presupuesto del arreglo:\n\n*Precio: [monto]*\n\nEjemplo: Precio: 100000\n\nSi el cliente no quiere hacer el arreglo, escribí: *SOLO VISITA*`
                );
            }
        } else if (status === 'rejected' || status === 'cancelled') {
            await prisma.payment.updateMany({
                where: { quotation_id: quotationId },
                data: { status, mp_payment_id: String(data.id) },
            });

            if (metadata.user_phone) {
                await WhatsAppService.sendTextMessage(
                    String(metadata.user_phone),
                    '⚠️ El pago no se pudo procesar.\n\n¿Querés intentar de nuevo? Escribí _ayuda_ si necesitás asistencia.'
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
        if (env.TWILIO_WEBHOOK_DEBUG) {
            console.log('[twilio] DEBUG body:', JSON.stringify(req.body));
        }

        const phone = normalizeTwilioWhatsAppFrom(req.body.From as string | undefined);
        const inboundMessageSid = String(
            (req.body as Record<string, string>).MessageSid ||
                (req.body as Record<string, string>).SmsMessageSid ||
                ''
        );
        const fromTail = phone.length >= 4 ? phone.slice(-4) : '';

        await twilioWebhookAls.run({ inboundMessageSid, fromTail }, async () => {
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

        if (!phone || !content) {
            console.warn('[twilio] skip: falta phone o content', {
                phoneMask: maskPhoneDigitsTail(phone),
                contentLen: content?.length ?? 0,
                bodyKeys: Object.keys(req.body || {}),
                messageType,
            });
            return;
        }

        console.log('[twilio] mensaje', {
            phoneMask: maskPhoneDigitsTail(phone),
            messageType,
            contentPreview: content.slice(0, 120),
        });

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
            try {
                await redis.del(mediationDirectionRedisKey(phone));
            } catch {
                /* ignore */
            }
            // Con job activo, sin esto cada mensaje se reenvía al técnico (tryForward) y el bot no te responde.
            try {
                await redis.set(userRelayPauseRedisKey(phone), '1', 'EX', 7 * 24 * 60 * 60);
            } catch {
                /* ignore */
            }
            await WhatsAppService.sendTextMessage(phone, 'Listo, sesión cancelada. Escribí cuando quieras empezar de nuevo.');
            return;
        }

        // Verificar primero si es un profesional
        const professional = await prisma.professional.findUnique({ where: { phone } });
        if (professional) {
            console.log('[twilio] flujo profesional', { phoneMask: maskPhoneDigitsTail(phone) });
            const PRO_GREETED_TTL = 8 * 60 * 60;
            const greetKey = professionalGreetedRedisKey(phone);
            try {
                const alreadyGreeted = await redis.get(greetKey);
                if (!alreadyGreeted) {
                    await redis.set(greetKey, '1', 'EX', PRO_GREETED_TTL);
                    const nm = professional.name.trim() || 'vos';
                    await WhatsAppService.sendTextMessage(
                        phone,
                        `Hola *${nm}* 👋\n\n¿En qué te puedo ayudar hoy?`
                    );
                }
            } catch {
                /* no bloquear flujo si Redis falla */
            }
            const handledAvail = await processAvailabilityMessage({
                professional,
                body: content,
                messageType,
                lat,
                lng,
            }).catch(() => false);
            if (handledAvail) {
                console.log('[twilio] availability agent handled');
                return;
            }

            const mediated = await ConversationService.handleProfessionalMediatedMessaging({
                professional,
                phone,
                body: content,
                messageType,
            }).catch(() => false);
            if (mediated) {
                console.log('[twilio] mediación pro↔cliente handled');
                return;
            }

            const { ProfessionalConversationService } = await import('../services/professional.conversation.service');
            await ProfessionalConversationService.processMessage(phone, content).catch(console.error);
            console.log('[twilio] ProfessionalConversationService.processMessage fin');
            return;
        }

        console.log('[twilio] flujo usuario', { phoneMask: maskPhoneDigitsTail(phone) });
        const userRow = await prisma.user.findUnique({ where: { phone } });
        const qHandled = await processQualityUserReply(phone, content).catch(() => false);
        if (qHandled) {
            console.log('[twilio] quality agent handled');
            return;
        }

        const expHandled = await tryExperimentWaitlist(phone, content, userRow?.name).catch(() => false);
        if (expHandled) {
            console.log('[twilio] experiment/waitlist handled');
            return;
        }

        // Sin User ni Professional: ROLE_SELECTION y onboarding técnico (PRO_ONBOARDING_*) viven en ConversationService.processMessage.
        console.log('[twilio] ConversationService.processMessage…', { messageType });
        await ConversationService.processMessage(phone, messageType, content).catch((err) => {
            console.error('[twilio] ConversationService.processMessage error:', err);
        });
        console.log('[twilio] ConversationService.processMessage hecho', { inboundMessageSid });
        });
    } catch (error) {
        console.error('Twilio webhook error:', error);
    }
};
