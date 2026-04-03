import { redis } from '../utils/redis';
import { prisma } from '@servy/db';
import { WhatsAppService } from './whatsapp.service';
import { ProfessionalMatchingService } from './matching.service';
import { StorageService } from './storage.service';
import { env } from '../utils/env';
import { MercadoPagoService } from './mercadopago.service';

const SESSION_TTL = 60 * 60 * 24; // 24 hours
const REDIS_OP_TIMEOUT_MS = 500;

/** IDs de lista de WhatsApp → valor en `professionals.categories` / matching */
const CATEGORY_MAP: Record<string, string> = {
    cat_plomeria: 'Plomería',
    cat_electricidad: 'Electricidad',
    cat_cerrajeria: 'Cerrajería',
};

function normalizeCategory(raw: string): string {
    const t = raw.trim();
    if (CATEGORY_MAP[t]) return CATEGORY_MAP[t];
    return t;
}

export class ConversationService {
    private static async withRedisTimeout<T>(p: Promise<T>, ms: number = REDIS_OP_TIMEOUT_MS): Promise<T> {
        let timeoutId: any;
        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`Redis op timeout after ${ms}ms`)), ms);
        });

        return Promise.race([p, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    }

    private static async getSession(phone: string) {
        // Redis es "memoria rápida" del bot. Si no está disponible (dev/errores),
        // fallamos hacia Postgres (`whatsapp_sessions`) para que el flujo siga funcionando.
        try {
            const cached = await this.withRedisTimeout(redis.get(`session:${phone}`));
            if (cached) {
                const parsed = JSON.parse(cached) as { state: string; data: Record<string, unknown> };
                const normalizedState = String(parsed.state).trim().toUpperCase();
                return { state: normalizedState, data: parsed.data };
            }
        } catch (err) {
            console.warn('[ConversationService] Redis no disponible, usando Postgres como fallback.');
        }

        const row = await prisma.whatsappSession.findUnique({ where: { phone } });
        if (!row) {
            return { state: 'UNKNOWN', data: {} as Record<string, unknown> };
        }
        if (row.expires_at < new Date()) {
            await prisma.whatsappSession.delete({ where: { phone } }).catch(() => {});
            return { state: 'EXPIRED', data: {} as Record<string, unknown> };
        }

        const session = {
            state: String(row.step).trim().toUpperCase(),
            data: (row.data_json as Record<string, unknown>) || {},
        };
        const ttlSec = Math.max(60, Math.floor((row.expires_at.getTime() - Date.now()) / 1000));
        try {
            await this.withRedisTimeout(redis.set(`session:${phone}`, JSON.stringify(session), 'EX', ttlSec));
        } catch {
            // ignorar (fallback ya cargó desde DB)
        }
        return session;
    }

    private static async saveSession(phone: string, state: string, data: Record<string, unknown> = {}) {
        try {
            await this.withRedisTimeout(redis.set(`session:${phone}`, JSON.stringify({ state, data }), 'EX', SESSION_TTL));
        } catch {
            // ignorar (persistimos igual en DB)
        }

        await prisma.whatsappSession.upsert({
            where: { phone },
            update: { step: state, data_json: data as object, expires_at: new Date(Date.now() + SESSION_TTL * 1000) },
            create: { phone, step: state, data_json: data as object, expires_at: new Date(Date.now() + SESSION_TTL * 1000) },
        });
    }

    private static async clearSession(phone: string) {
        try {
            await this.withRedisTimeout(redis.del(`session:${phone}`));
        } catch {
            // ignorar
        }
        await prisma.whatsappSession.delete({ where: { phone } }).catch(() => {});
    }

    /**
     * Llamar desde API al enviar cotización: alinea sesión del usuario para Aceptar/Rechazar.
     */
    static async afterQuotationSent(
        userPhone: string,
        payload: { quotationId: string; jobOfferId: string; requestId: string; totalPrice: number }
    ) {
        await this.saveSession(userPhone, 'AWAITING_PAYMENT_DECISION', {
            quotationId: payload.quotationId,
            jobOfferId: payload.jobOfferId,
            requestId: payload.requestId,
            totalPrice: payload.totalPrice,
        });
    }

    static async processMessage(phone: string, messageType: string, content: string) {
        const user = await prisma.user.findUnique({ where: { phone } });

        if (messageType === 'text' && content.toLowerCase().includes('cambiar dirección')) {
            await this.saveSession(phone, 'ONBOARDING_ADDRESS', { isChange: true });
            await WhatsAppService.sendTextMessage(phone, '¿Cuál es tu nueva dirección? (calle, número y ciudad)');
            return;
        }

        if (!user || !user.onboarding_completed) {
            await this.handleOnboardingFlow(phone, messageType, content, user);
            return;
        }

        if (messageType === 'text') {
            const hit = await this.handleGlobalIntents(phone, content.trim(), user);
            if (hit) return;
        }

        let session = await this.getSession(phone);
        if (session.state === 'EXPIRED') {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(
                phone,
                'Tu conversación anterior expiró por inactividad. Continuamos desde el inicio.'
            );
            session = { state: 'IDLE', data: {} };
        }
        if (session.state === 'UNKNOWN') {
            session = { state: 'IDLE', data: {} };
        }

        switch (session.state) {
            case 'IDLE':
                await this.saveSession(phone, 'AWAITING_CATEGORY');
                await WhatsAppService.sendListMessage(phone, 'Hola! Soy Servy 👋 ¿En qué te puedo ayudar hoy?', [
                    {
                        title: 'Servicios',
                        rows: [
                            { id: 'cat_plomeria', title: 'Plomería' },
                            { id: 'cat_electricidad', title: 'Electricidad' },
                            { id: 'cat_cerrajeria', title: 'Cerrajería' },
                        ],
                    },
                ]);
                break;

            case 'AWAITING_CATEGORY': {
                session.data.category = normalizeCategory(content);
                await this.saveSession(phone, 'AWAITING_DESCRIPTION', session.data);
                await WhatsAppService.sendTextMessage(phone, 'Perfecto. Contame un poco más detallado cuál es el problema.');
                break;
            }

            case 'AWAITING_DESCRIPTION':
                if (messageType === 'image') {
                    session.data.photos = (session.data.photos as string[] | undefined) || [];
                    const buffer = await WhatsAppService.downloadMedia(content);
                    if (buffer) {
                        const key = `requests/temp_${phone}_${Date.now()}.jpg`;
                        await StorageService.uploadFile(key, buffer);
                        const url = await StorageService.getSignedUrl(key);
                        (session.data.photos as string[]).push(url);
                    }
                } else {
                    session.data.description = content;
                }

                await this.saveSession(phone, 'AWAITING_PHOTOS', session.data);
                await WhatsAppService.sendButtonMessage(phone, '¿Querés agregar fotos del problema?', [
                    { id: 'btn_yes_photos', title: 'Sí, enviar foto' },
                    { id: 'btn_no_photos', title: 'No, continuar' },
                ]);
                break;

            case 'AWAITING_PHOTOS':
                if (messageType === 'image') {
                    session.data.photos = (session.data.photos as string[] | undefined) || [];
                    const buffer = await WhatsAppService.downloadMedia(content);
                    if (buffer) {
                        const key = `requests/temp_${phone}_${Date.now()}.jpg`;
                        await StorageService.uploadFile(key, buffer);
                        const url = await StorageService.getSignedUrl(key);
                        (session.data.photos as string[]).push(url);
                    }
                    await WhatsAppService.sendTextMessage(phone, 'Foto recibida. Podés enviar otra, o escribir "listo" para continuar.');
                    return;
                }

                if (content.toLowerCase() === 'listo' || content === 'btn_no_photos') {
                    if (user.address) {
                        session.data.address = user.address;
                        await this.createRequestAndMatch(phone, session.data);
                    } else {
                        await this.saveSession(phone, 'AWAITING_ADDRESS', session.data);
                        await WhatsAppService.sendTextMessage(phone, '¿Cuál es la dirección para el servicio? (calle, número y ciudad)');
                    }
                } else if (content === 'btn_yes_photos') {
                    await WhatsAppService.sendTextMessage(phone, 'Por favor, enviá la foto ahora.');
                } else {
                    await WhatsAppService.sendTextMessage(phone, 'No entendí. Respondé "listo" para continuar.');
                }
                break;

            case 'AWAITING_ADDRESS':
                session.data.address = content;
                await this.createRequestAndMatch(phone, session.data);
                break;

            case 'AWAITING_PROFESSIONAL_SELECTION': {
                const requestId = session.data.requestId as string;
                if (content === 'btn_urgent' || content === '1' || content.toLowerCase() === 'urgente') {
                    session.data.selection = 'urgent';
                    await prisma.jobOffer.updateMany({
                        where: { request_id: requestId, priority: 'scheduled' },
                        data: { status: 'cancelled' },
                    });
                    await this.saveSession(phone, 'AWAITING_QUOTATION', session.data);
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'Genial. Solicitamos la cotización urgente. Te avisaremos en cuanto el profesional responda.'
                    );
                } else if (content === 'btn_sched' || content === '2' || content.toLowerCase() === 'programado') {
                    session.data.selection = 'scheduled';
                    await prisma.jobOffer.updateMany({
                        where: { request_id: requestId, priority: 'urgent' },
                        data: { status: 'cancelled' },
                    });
                    await this.saveSession(phone, 'AWAITING_QUOTATION', session.data);
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'Genial. Solicitamos la cotización de forma programada. Te avisaremos en cuanto el profesional responda.'
                    );
                } else {
                    await WhatsAppService.sendTextMessage(phone, 'Por favor, seleccioná una opción válida (1 o 2).');
                }
                break;
            }

            case 'AWAITING_QUOTATION':
                await WhatsAppService.sendTextMessage(phone, 'Aún estamos esperando la cotización del profesional. En breve te contactamos.');
                break;

            case 'AWAITING_PAYMENT_DECISION':
                if (content === 'btn_accept') {
                    await this.handleAcceptQuotation(phone, session.data);
                } else if (content === 'btn_reject') {
                    await this.handleRejectQuotation(phone, session.data);
                } else {
                    await WhatsAppService.sendTextMessage(phone, 'Respondé con los botones Aceptar o Rechazar en el mensaje de la cotización.');
                }
                break;

            case 'PAYMENT_PENDING':
                await WhatsAppService.sendTextMessage(phone, 'Tu pago está pendiente. Si ya pagaste, en breve recibirás la confirmación.');
                break;

            case 'COMPLETED':
                await WhatsAppService.sendTextMessage(phone, 'Este servicio ya está completado.');
                await this.clearSession(phone);
                break;

            default:
                await this.saveSession(phone, 'IDLE');
                await WhatsAppService.sendTextMessage(phone, 'No entendí tu mensaje. ¿Empezamos de nuevo? Escribí algo para comenzar.');
                break;
        }
    }

    private static async handleGlobalIntents(phone: string, text: string, user: { name: string | null }): Promise<boolean> {
        const t = text.toLowerCase();
        if (t === 'ayuda' || t === '?') {
            await WhatsAppService.sendTextMessage(
                phone,
                'Servy: podés pedir Plomería, Electricidad o Cerrajería desde el menú. Comandos: *Estado* (tu pedido), *Cancelar* (reiniciar), *Cambiar dirección*.'
            );
            return true;
        }
        if (t === 'estado' || t === 'mi turno') {
            const session = await this.getSession(phone);
            await WhatsAppService.sendTextMessage(
                phone,
                `Estado actual: ${session.state}. ${user.name ? `${user.name}, ` : ''}si necesitás algo más escribí *Ayuda*.`
            );
            return true;
        }
        if (t === 'cancelar') {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(phone, 'Listo, cancelamos el pedido en curso. Escribí cuando quieras iniciar uno nuevo.');
            return true;
        }
        return false;
    }

    private static async handleAcceptQuotation(phone: string, data: Record<string, unknown>) {
        const quotationId = data.quotationId as string;
        await this.saveSession(phone, 'PAYMENT_PENDING', data);

        if (!env.PAYMENTS_ENABLED) {
            await WhatsAppService.sendTextMessage(
                phone,
                'Aceptaste la cotización. Los pagos con Mercado Pago se habilitan próximamente; un operador te contactará para coordinar el pago.'
            );
            return;
        }

        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: { job_offer: true },
        });
        const user = await prisma.user.findUnique({ where: { phone } });
        if (!quotation || !user) {
            await WhatsAppService.sendTextMessage(phone, 'No pudimos generar el pago. Escribí *Ayuda* para soporte.');
            return;
        }

        try {
            const initPoint = await MercadoPagoService.createPreference(quotation, user);
            await WhatsAppService.sendTextMessage(phone, `Podés abonar aquí: ${initPoint}`);
        } catch {
            await WhatsAppService.sendTextMessage(phone, 'Hubo un error al generar el link de pago. Intentá de nuevo en unos minutos o escribí *Ayuda*.');
        }
    }

    private static async handleRejectQuotation(phone: string, data: Record<string, unknown>) {
        const quotationId = data.quotationId as string;
        const jobOfferId = data.jobOfferId as string;
        const requestId = data.requestId as string;

        await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'rejected' } }).catch(() => {});
        await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'rejected' } }).catch(() => {});

        const sibling = await prisma.jobOffer.findFirst({
            where: { request_id: requestId, id: { not: jobOfferId }, status: 'cancelled' },
            include: { professional: true },
        });

        if (sibling) {
            await prisma.jobOffer.update({ where: { id: sibling.id }, data: { status: 'pending' } });
            await WhatsAppService.sendTextMessage(
                sibling.professional.phone,
                'El cliente pidió otra opción. Entrá al portal y enviá tu cotización si aún podés tomar el trabajo.'
            );
            await this.saveSession(phone, 'AWAITING_QUOTATION', { requestId });
            await WhatsAppService.sendTextMessage(phone, 'Entendido. Le pedimos cotización al otro profesional disponible. Te avisamos cuando la tengamos.');
        } else {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(phone, 'No hay otra opción disponible para este pedido. Escribí un mensaje cuando quieras iniciar uno nuevo.');
        }
    }

    private static async handleOnboardingFlow(phone: string, messageType: string, content: string, user: { id?: string } | null) {
        const session = await this.getSession(phone);
        if (!user) {
            await prisma.user.create({ data: { phone } });
        }

        if (session.state === 'UNKNOWN' || session.state === 'IDLE') {
            await this.saveSession(phone, 'ONBOARDING_NAME');
            await WhatsAppService.sendTextMessage(phone, 'Hola! Soy Servy 👋 Primero necesito un par de datos. ¿Cuál es tu nombre y apellido?');
            return;
        }

        if (session.state === 'ONBOARDING_NAME') {
            const parts = content.split(' ');
            const name = parts[0];
            const last_name = parts.slice(1).join(' ');

            await prisma.user.update({
                where: { phone },
                data: { name, last_name },
            });

            await this.saveSession(phone, 'ONBOARDING_ADDRESS');
            await WhatsAppService.sendTextMessage(phone, '¿Cuál es tu dirección? (calle, número y ciudad)');
            return;
        }

        if (session.state === 'ONBOARDING_ADDRESS') {
            await prisma.user.update({
                where: { phone },
                data: { address: content, onboarding_completed: true },
            });

            if (session.data?.isChange) {
                await this.saveSession(phone, 'IDLE');
                await WhatsAppService.sendTextMessage(phone, '¡Dirección actualizada!');
            } else {
                await this.saveSession(phone, 'IDLE');
                await WhatsAppService.sendTextMessage(phone, '¡Gracias! Perfil completado. Mandame un mensaje cuando necesites un servicio.');
            }
        }
    }

    private static async createRequestAndMatch(phone: string, sessionData: Record<string, unknown>) {
        const request = await prisma.serviceRequest.create({
            data: {
                user_phone: phone,
                category: sessionData.category as string,
                description: sessionData.description as string,
                photos: (sessionData.photos as string[]) || [],
                address: sessionData.address as string,
            },
        });

        const matchRes = await ProfessionalMatchingService.findProfessionalsAndCreateOffers(request.id);

        if (!matchRes.urgent && !matchRes.scheduled) {
            await WhatsAppService.sendTextMessage(
                phone,
                'No encontramos profesionales disponibles en tu zona para esa categoría en este momento. Lo sentimos.'
            );
            await this.clearSession(phone);
            return;
        }

        await this.saveSession(phone, 'AWAITING_PROFESSIONAL_SELECTION', { requestId: request.id });

        let text = `Encontramos profesionales disponibles. Elegí una opción:\n\n`;
        if (matchRes.urgent) text += `1) Urgente (más caro, rating: ${matchRes.urgent.rating}⭐)\n`;
        if (matchRes.scheduled) text += `2) Programado (rating: ${matchRes.scheduled.rating}⭐)\n`;

        await WhatsAppService.sendButtonMessage(phone, text, [
            ...(matchRes.urgent ? [{ id: 'btn_urgent', title: '1' }] : []),
            ...(matchRes.scheduled ? [{ id: 'btn_sched', title: '2' }] : []),
        ]);
    }
}
