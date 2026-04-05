import { redis } from '../utils/redis';
import { prisma } from '@servy/db';
import { WhatsAppService } from './whatsapp.service';
import { ProfessionalMatchingService } from './matching.service';
import { StorageService } from './storage.service';
import { MercadoPagoService } from './mercadopago.service';
import { GeminiService } from './gemini.service';

const SESSION_TTL = 60 * 60 * 24;
const REDIS_OP_TIMEOUT_MS = 500;

const CATEGORY_EMOJIS: Record<string, string> = {
    Plomería: '🔧',
    Electricidad: '⚡',
    Cerrajería: '🔑',
    Gas: '🔥',
    'Aires acondicionados': '❄️',
};

const EMPATHY_MESSAGES: Record<string, string[]> = {
    alta: [
        'Entiendo, no te preocupes. Estas situaciones son estresantes pero las resolvemos rápido. 💪',
        'Sabemos que no es el mejor momento, pero estamos acá para ayudarte. Ya buscamos el profesional ideal.',
        'Tranquilo/a, esto tiene solución. Estamos en eso.',
        'Qué día difícil debés estar teniendo. No te preocupes, lo resolvemos juntos.',
    ],
    media: [
        'Entendido, lo resolvemos.',
        'Perfecto, ya buscamos quién puede ayudarte.',
        'No te preocupes, tenemos el profesional indicado.',
        'Recibido. Ya estamos buscando la mejor opción para vos.',
    ],
    baja: [
        'Genial, te conseguimos el mejor para el trabajo.',
        'Perfecto, lo coordinamos para que salga impecable.',
        'Buenísimo, ya buscamos el profesional ideal.',
    ],
};

function randomEmpathy(urgency: string): string {
    const u = urgency.toLowerCase();
    const key = u.includes('alta') ? 'alta' : u.includes('baja') ? 'baja' : 'media';
    const msgs = EMPATHY_MESSAGES[key] || EMPATHY_MESSAGES.media;
    return msgs[Math.floor(Math.random() * msgs.length)];
}

function displayName(user: { name: string | null } | null): string {
    return user?.name?.trim() ? `${user.name.trim()}, ` : '';
}

export class ConversationService {
    private static async withRedisTimeout<T>(p: Promise<T>, ms = REDIS_OP_TIMEOUT_MS): Promise<T> {
        let id: ReturnType<typeof setTimeout> | undefined;
        const t = new Promise<T>((_, r) => {
            id = setTimeout(() => r(new Error('timeout')), ms);
        });
        return Promise.race([p, t]).finally(() => {
            if (id) clearTimeout(id);
        });
    }

    private static async getSession(phone: string) {
        try {
            const cached = await this.withRedisTimeout(redis.get(`session:${phone}`));
            if (cached) {
                const p = JSON.parse(cached);
                return { state: String(p.state).trim().toUpperCase(), data: p.data };
            }
        } catch {
            /* fallback DB */
        }
        const row = await prisma.whatsappSession.findUnique({ where: { phone } });
        if (!row) return { state: 'UNKNOWN', data: {} as Record<string, unknown> };
        if (row.expires_at < new Date()) {
            await prisma.whatsappSession.delete({ where: { phone } }).catch(() => {});
            return { state: 'EXPIRED', data: {} as Record<string, unknown> };
        }
        const session = { state: String(row.step).trim().toUpperCase(), data: (row.data_json as Record<string, unknown>) || {} };
        const ttl = Math.max(60, Math.floor((row.expires_at.getTime() - Date.now()) / 1000));
        try {
            await this.withRedisTimeout(redis.set(`session:${phone}`, JSON.stringify(session), 'EX', ttl));
        } catch {
            /* ignore */
        }
        return session;
    }

    private static async saveSession(phone: string, state: string, data: Record<string, unknown> = {}) {
        try {
            await this.withRedisTimeout(redis.set(`session:${phone}`, JSON.stringify({ state, data }), 'EX', SESSION_TTL));
        } catch {
            /* ignore */
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
            /* ignore */
        }
        await prisma.whatsappSession.delete({ where: { phone } }).catch(() => {});
    }

    static async afterQuotationSent(
        userPhone: string,
        payload: { quotationId: string; jobOfferId: string; requestId: string; totalPrice: number }
    ) {
        await this.saveSession(userPhone, 'AWAITING_PAYMENT_DECISION', payload as unknown as Record<string, unknown>);
    }

    /** Tras marcar el trabajo completado (manual o por QR), el usuario puede responder con estrellas. */
    static async beginReviewPrompt(userPhone: string, jobId: string) {
        await this.saveSession(userPhone, 'AWAITING_REVIEW', { jobId });
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
            session = { state: 'IDLE', data: {} };
        }
        if (session.state === 'UNKNOWN') session = { state: 'IDLE', data: {} };

        switch (session.state) {
            case 'IDLE':
                await this.saveSession(phone, 'AWAITING_PROBLEM_DESCRIPTION', {});
                await WhatsAppService.sendTextMessage(
                    phone,
                    `${displayName(user)}contame ¿en qué te puedo ayudar hoy?\n\n_(Describime el problema como puedas, nosotros entendemos todo — cuanto más detalle, mejor puede cotizar el profesional)_`
                );
                break;

            case 'AWAITING_PROBLEM_DESCRIPTION': {
                if (messageType === 'image') {
                    await WhatsAppService.sendTextMessage(phone, 'Recibí la imagen. Contame también con palabras ¿qué está pasando?');
                    return;
                }
                const greetings = [
                    'hola',
                    'hi',
                    'hello',
                    'buenas',
                    'buen dia',
                    'buenas tardes',
                    'buenas noches',
                    'hey',
                ];
                if (greetings.includes(content.toLowerCase().trim())) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        `Hola ${user.name}! 👋 Contame ¿en qué te puedo ayudar hoy?\n\n_(Describime el problema como puedas, nosotros entendemos todo — cuanto más detalle, mejor puede cotizar el profesional)_`
                    );
                    return;
                }
                const classification = await GeminiService.classifyProblem(content);
                if (!classification.understood || !classification.category) {
                    await WhatsAppService.sendTextMessage(phone, 'No entendí bien el problema. ¿Podés contarme con más detalle qué está pasando?');
                    return;
                }
                session.data.description = content;
                session.data.category = classification.category;
                session.data.urgency = classification.urgency;
                await this.saveSession(phone, 'AWAITING_PHOTOS', session.data);
                const empathy = randomEmpathy(String(classification.urgency));
                const emoji = CATEGORY_EMOJIS[classification.category] || '🔧';
                await WhatsAppService.sendTextMessage(phone, empathy);
                await WhatsAppService.sendButtonMessage(
                    phone,
                    `${emoji} Entiendo que necesitás ayuda con *${classification.category}*.\n\n¿Querés adjuntar una foto del problema? Le ayuda al profesional a entender mejor y cotizar con más precisión.`,
                    [
                        { id: 'btn_yes_photos', title: 'Sí, adjuntar foto' },
                        { id: 'btn_no_photos', title: 'No, continuar' },
                    ]
                );
                break;
            }

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
                    await this.saveSession(phone, 'AWAITING_PHOTOS', session.data);
                    await WhatsAppService.sendTextMessage(phone, 'Foto recibida. Podés enviar otra o escribir *listo* para continuar.');
                    return;
                }
                {
                    const normalized = content.toLowerCase().trim();
                    const noPhotos = ['btn_no_photos', 'no', 'no continuar', '2', 'no,continuar', 'no continúar'].includes(normalized);
                    const yesPhotos = ['btn_yes_photos', 'si', 'sí', '1', 'si adjuntar', 'sí adjuntar'].includes(normalized);

                    if (normalized === 'listo' || noPhotos) {
                        if (user.address) {
                            session.data.address = user.address;
                            await this.createRequestAndMatch(phone, session.data, user);
                        } else {
                            await this.saveSession(phone, 'AWAITING_ADDRESS_FOR_SERVICE', session.data);
                            await WhatsAppService.sendTextMessage(
                                phone,
                                '¿Cuál es la dirección para el servicio? (calle, número y ciudad)'
                            );
                        }
                    } else if (yesPhotos) {
                        await WhatsAppService.sendTextMessage(
                            phone,
                            'Mandá las fotos cuando quieras. Cuando termines escribí *listo*.'
                        );
                    } else {
                        await WhatsAppService.sendTextMessage(
                            phone,
                            'Respondé *1* para adjuntar foto o *2* para continuar sin foto.'
                        );
                    }
                }
                break;

            case 'AWAITING_ADDRESS_FOR_SERVICE':
                session.data.serviceAddress = content;
                await this.createRequestAndMatch(phone, session.data, user);
                break;

            case 'AWAITING_PROFESSIONAL_SELECTION': {
                const requestId = session.data.requestId as string;
                if (content === 'btn_urgent' || content === '1') {
                    session.data.selection = 'urgent';
                    await prisma.jobOffer.updateMany({
                        where: { request_id: requestId, priority: 'scheduled' },
                        data: { status: 'cancelled' },
                    });

                    // Notificar al profesional seleccionado
                    const selectedOffer = await prisma.jobOffer.findFirst({
                        where: {
                            request_id: requestId,
                            priority: 'urgent',
                            status: { not: 'cancelled' },
                        },
                        include: {
                            professional: true,
                            service_request: { include: { user: true } },
                        },
                    });

                    if (selectedOffer?.service_request?.user) {
                        const { ProfessionalConversationService } = await import('./professional.conversation.service');
                        await ProfessionalConversationService.notifyNewJob(
                            selectedOffer.professional,
                            selectedOffer,
                            selectedOffer.service_request,
                            selectedOffer.service_request.user
                        );
                    }

                    await this.saveSession(phone, 'AWAITING_SCHEDULE', session.data);

                    const now = new Date();
                    const hour = parseInt(
                        new Intl.DateTimeFormat('es-AR', {
                            hour: 'numeric',
                            hour12: false,
                            timeZone: 'America/Argentina/Buenos_Aires',
                        }).format(now)
                    );

                    const slots: { id: string; title: string }[] = [];

                    if (hour < 18) {
                        if (hour < 12) slots.push({ id: 'sch_9_12', title: '9 a 12hs' });
                        if (hour < 15) slots.push({ id: 'sch_12_15', title: '12 a 15hs' });
                        if (hour < 18) slots.push({ id: 'sch_15_18', title: '15 a 18hs' });
                        slots.push({ id: 'sch_asap', title: 'Lo antes posible' });
                        await WhatsAppService.sendButtonMessage(phone, '¿En qué horario preferís que vaya hoy?', slots);
                    } else {
                        slots.push({ id: 'sch_tomorrow_morning', title: 'Mañana a primera hora (8-10hs)' });
                        slots.push({ id: 'sch_tomorrow_mid', title: 'Mañana a la mañana (10-12hs)' });
                        slots.push({ id: 'sch_tomorrow_afternoon', title: 'Mañana a la tarde (14-18hs)' });
                        await WhatsAppService.sendButtonMessage(
                            phone,
                            'Ya no quedan franjas para hoy. ¿Cuándo preferís que vaya mañana?',
                            slots
                        );
                    }
                } else if (content === 'btn_sched' || content === '2') {
                    session.data.selection = 'scheduled';
                    await prisma.jobOffer.updateMany({ where: { request_id: requestId, priority: 'urgent' }, data: { status: 'cancelled' } });

                    // Notificar al profesional seleccionado
                    const selectedOffer = await prisma.jobOffer.findFirst({
                        where: {
                            request_id: requestId,
                            priority: 'scheduled',
                            status: { not: 'cancelled' },
                        },
                        include: {
                            professional: true,
                            service_request: { include: { user: true } },
                        },
                    });

                    if (selectedOffer?.service_request?.user) {
                        const { ProfessionalConversationService } = await import('./professional.conversation.service');
                        await ProfessionalConversationService.notifyNewJob(
                            selectedOffer.professional,
                            selectedOffer,
                            selectedOffer.service_request,
                            selectedOffer.service_request.user
                        );
                    }

                    await this.saveSession(phone, 'AWAITING_SCHEDULE_DAY', session.data);
                    await WhatsAppService.sendButtonMessage(phone, '¿Qué día preferís?', [
                        { id: 'day_tomorrow', title: 'Mañana' },
                        { id: 'day_after', title: 'Pasado mañana' },
                        { id: 'day_3', title: 'En 3 días' },
                    ]);
                } else {
                    await WhatsAppService.sendTextMessage(phone, 'Por favor seleccioná una de las opciones.');
                }
                break;
            }

            case 'AWAITING_SCHEDULE': {
                const scheduleMap: Record<string, string> = {
                    sch_9_12: 'Hoy 9 a 12hs',
                    sch_12_15: 'Hoy 12 a 15hs',
                    sch_15_18: 'Hoy 15 a 18hs',
                    sch_asap: 'Hoy lo antes posible',
                    sch_tomorrow: 'Mañana a primera hora',
                    sch_tomorrow_morning: 'Mañana 8 a 10hs',
                    sch_tomorrow_mid: 'Mañana 10 a 12hs',
                    sch_tomorrow_afternoon: 'Mañana 14 a 18hs',
                };
                session.data.schedule = scheduleMap[content] || content;
                await prisma.jobOffer.updateMany({
                    where: { request_id: session.data.requestId as string },
                    data: { schedule: session.data.schedule as string },
                });
                await this.saveSession(phone, 'AWAITING_QUOTATION', session.data);
                await WhatsAppService.sendTextMessage(phone, `Perfecto. Le avisamos al profesional. En breve te manda su cotización.`);
                break;
            }

            case 'AWAITING_SCHEDULE_DAY': {
                const dayMap: Record<string, string> = {
                    day_tomorrow: 'Mañana',
                    day_after: 'Pasado mañana',
                    day_3: 'En 3 días',
                };
                session.data.scheduleDay = dayMap[content] || content;
                await this.saveSession(phone, 'AWAITING_SCHEDULE_TIME', session.data);
                await WhatsAppService.sendButtonMessage(phone, '¿En qué horario?', [
                    { id: 'sch_9_12', title: '9 a 12hs' },
                    { id: 'sch_12_15', title: '12 a 15hs' },
                    { id: 'sch_15_18', title: '15 a 18hs' },
                ]);
                break;
            }

            case 'AWAITING_SCHEDULE_TIME': {
                const timeMap: Record<string, string> = {
                    sch_9_12: '9 a 12hs',
                    sch_12_15: '12 a 15hs',
                    sch_15_18: '15 a 18hs',
                };
                session.data.schedule = `${session.data.scheduleDay} ${timeMap[content] || content}`;
                await prisma.jobOffer.updateMany({
                    where: { request_id: session.data.requestId as string },
                    data: { schedule: session.data.schedule as string },
                });
                await this.saveSession(phone, 'AWAITING_QUOTATION', session.data);
                await WhatsAppService.sendTextMessage(phone, `Perfecto. Le avisamos al profesional. En breve te manda su cotización.`);
                break;
            }

            case 'AWAITING_QUOTATION':
                await WhatsAppService.sendTextMessage(phone, 'Todavía estamos esperando la cotización del profesional. En breve te avisamos.');
                break;

            case 'AWAITING_PAYMENT_DECISION': {
                const acceptWords = ['btn_accept', 'aceptar', 'acepto', 'si', 'sí', '1', 'ok', 'dale'];
                const rejectWords = ['btn_reject', 'rechazar', 'rechazo', 'no', '2', 'cancelar'];

                const lc = content.toLowerCase().trim();

                if (acceptWords.includes(lc)) {
                    await this.handleAcceptQuotation(phone, session.data, user);
                } else if (rejectWords.includes(lc)) {
                    await this.handleRejectQuotation(phone, session.data);
                } else {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'Respondé *1* para aceptar o *2* para rechazar la cotización.'
                    );
                }
                break;
            }

            case 'PAYMENT_PENDING':
                await WhatsAppService.sendTextMessage(phone, 'Tu pago está pendiente. Si ya pagaste, en breve recibís la confirmación.');
                break;

            case 'AWAITING_REVIEW':
                await this.handleReview(phone, content, session.data);
                break;

            case 'REVIEW_COMMENT':
                await prisma.job.update({
                    where: { id: session.data.jobId as string },
                    data: { review: content },
                });
                await this.clearSession(phone);
                await WhatsAppService.sendTextMessage(phone, 'Gracias por tu comentario. Lo tendremos en cuenta para mejorar.');
                break;

            case 'COMPLETED':
                await this.clearSession(phone);
                await this.saveSession(phone, 'IDLE', {});
                await WhatsAppService.sendTextMessage(phone, `${displayName(user)}contame ¿en qué te puedo ayudar hoy?`);
                break;

            default:
                await this.saveSession(phone, 'IDLE', {});
                await WhatsAppService.sendTextMessage(phone, 'No entendí tu mensaje. Escribí algo para comenzar.');
        }
    }

    private static async handleGlobalIntents(phone: string, text: string, user: { name: string | null }): Promise<boolean> {
        const t = text.toLowerCase();
        if (t === 'ayuda' || t === '?') {
            await WhatsAppService.sendTextMessage(
                phone,
                `Servy: podés pedir Plomería, Electricidad, Cerrajería, Gas o Aires acondicionados.\n\nComandos:\n• *Estado* — tu pedido actual\n• *Cancelar* — cancelar pedido\n• *Cambiar dirección* — actualizar dirección`
            );
            return true;
        }
        if (t === 'estado' || t === 'mi turno') {
            const session = await this.getSession(phone);
            await WhatsAppService.sendTextMessage(
                phone,
                `Estado actual: ${session.state}.${user.name ? ` ${user.name.trim()},` : ''} si necesitás algo más escribí *Ayuda*.`
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

    private static async handleAcceptQuotation(phone: string, data: Record<string, unknown>, user: { name: string | null } | null) {
        const quotationId = data.quotationId as string;
        await this.saveSession(phone, 'PAYMENT_PENDING', data);

        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: { job_offer: { include: { professional: true } } },
        });
        if (!quotation || !user) {
            await WhatsAppService.sendTextMessage(phone, 'No pudimos generar el pago. Escribí *Ayuda* para soporte.');
            return;
        }

        const proName = quotation.job_offer.professional.name;

        await WhatsAppService.sendTextMessage(
            phone,
            `Genial ${user.name || 'vos'}! Para confirmar el servicio con ${proName} necesitamos el pago total.\n\n💳 Total a pagar: $${quotation.total_price.toLocaleString('es-AR')}\n\n🔒 Tu dinero está protegido:\n• La seña se libera a ${proName} al confirmar\n• El resto se libera cuando termina el trabajo\n• Si ${proName} no aparece, te devolvemos todo`
        );

        try {
            const initPoint = await MercadoPagoService.createPreference(quotation, user);
            await WhatsAppService.sendTextMessage(phone, `Pagá acá:\n👉 ${initPoint}`);
        } catch {
            await WhatsAppService.sendTextMessage(phone, 'Hubo un error al generar el link de pago. Intentá de nuevo o escribí *Ayuda*.');
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
            await WhatsAppService.sendTextMessage(sibling.professional.phone, 'El cliente pidió otra opción. Entrá al portal y enviá tu cotización.');
            await this.saveSession(phone, 'AWAITING_QUOTATION', { requestId });
            await WhatsAppService.sendTextMessage(phone, 'Entendido. Le pedimos cotización al otro profesional. Te avisamos cuando la tengamos.');
        } else {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(phone, 'No hay otra opción disponible. Escribí cuando quieras iniciar un nuevo pedido.');
        }
    }

    private static async handleReview(phone: string, content: string, data: Record<string, unknown>) {
        const ratingMap: Record<string, number> = { '⭐': 1, '⭐⭐': 2, '⭐⭐⭐': 3, '⭐⭐⭐⭐': 4, '⭐⭐⭐⭐⭐': 5 };
        const numMap: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
        const rating = ratingMap[content] || numMap[content];
        if (!rating) return;

        const jobId = data.jobId as string;
        const job = await prisma.job.update({
            where: { id: jobId },
            data: { rating },
            include: { quotation: { include: { job_offer: { include: { professional: true } } } } },
        });

        const proId = job.quotation.job_offer.professional_id;
        const allJobs = await prisma.job.findMany({
            where: { quotation: { job_offer: { professional_id: proId } }, rating: { not: null } },
        });
        const avg = allJobs.reduce((s, j) => s + (j.rating || 0), 0) / allJobs.length;
        await prisma.professional.update({ where: { id: proId }, data: { rating: Math.round(avg * 10) / 10 } });

        if (rating >= 4) {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(phone, `¡Gracias! Nos alegra que haya salido bien. Cuando necesités otro servicio, acá estamos. 🙌`);
        } else {
            await this.saveSession(phone, 'REVIEW_COMMENT', data);
            await WhatsAppService.sendTextMessage(
                phone,
                `Gracias por contarnos. Lamentamos que no haya sido la mejor experiencia. ¿Querés contarnos qué pasó?`
            );
        }
    }

    private static async handleOnboardingFlow(phone: string, messageType: string, content: string, user: { phone: string } | null) {
        const session = await this.getSession(phone);
        if (!user) await prisma.user.create({ data: { phone } });

        if (session.state === 'ONBOARDING_ADDRESS') {
            await prisma.user.update({ where: { phone }, data: { address: content.trim() } });
            await this.clearSession(phone);
            await this.saveSession(phone, 'IDLE', {});
            await WhatsAppService.sendTextMessage(phone, 'Listo, actualicé tu dirección. Escribí cuando quieras pedir un servicio.');
            return;
        }

        if (session.state === 'UNKNOWN' || session.state === 'IDLE') {
            await this.saveSession(phone, 'ONBOARDING_NAME', {});
            await WhatsAppService.sendTextMessage(phone, 'Hola! Soy Servy 👋 Primero necesito un par de datos.\n¿Cuál es tu nombre y apellido?');
            return;
        }

        if (session.state === 'ONBOARDING_NAME') {
            const parts = content.split(' ');
            await prisma.user.update({
                where: { phone },
                data: { name: parts[0], last_name: parts.slice(1).join(' ') || '-' },
            });
            await this.saveSession(phone, 'ONBOARDING_DOMICILE_TYPE', { name: parts[0] });
            await WhatsAppService.sendButtonMessage(phone, `Hola ${parts[0]}! ¿Dónde vas a necesitar el servicio?`, [
                { id: 'dom_casa', title: 'Casa' },
                { id: 'dom_depto', title: 'Departamento' },
                { id: 'dom_barrio', title: 'Barrio cerrado' },
                { id: 'dom_empresa', title: 'Empresa' },
            ]);
            return;
        }

        if (session.state === 'ONBOARDING_DOMICILE_TYPE') {
            const typeMap: Record<string, string> = {
                dom_casa: 'casa',
                dom_depto: 'departamento',
                dom_barrio: 'barrio_cerrado',
                dom_empresa: 'empresa',
            };
            const domType = typeMap[content] || content;
            session.data.domicileType = domType;
            await this.saveSession(phone, 'ONBOARDING_STREET', session.data);

            if (domType === 'barrio_cerrado') {
                await WhatsAppService.sendTextMessage(phone, '¿Cuál es el nombre del barrio y tu lote? (ej: Los Pinos, Lote 42)');
            } else if (domType === 'departamento') {
                await WhatsAppService.sendTextMessage(phone, '¿Cuál es tu calle, número y piso/depto? (ej: Av. Santa Fe 1234, Piso 3 Depto B)');
            } else {
                await WhatsAppService.sendTextMessage(phone, '¿Cuál es tu calle y número?');
            }
            return;
        }

        if (session.state === 'ONBOARDING_STREET') {
            session.data.street = content;
            await this.saveSession(phone, 'ONBOARDING_CITY', session.data);
            await WhatsAppService.sendTextMessage(phone, '¿En qué ciudad?');
            return;
        }

        if (session.state === 'ONBOARDING_CITY') {
            session.data.city = content;
            await this.saveSession(phone, 'ONBOARDING_POSTAL', session.data);
            await WhatsAppService.sendTextMessage(phone, '¿Cuál es tu código postal?');
            return;
        }

        if (session.state === 'ONBOARDING_POSTAL') {
            const postalCode = content.trim();
            const address = `${session.data.street}, ${session.data.city} (${postalCode})`;
            const userName = session.data.name as string;
            await prisma.user.update({
                where: { phone },
                data: {
                    address,
                    onboarding_completed: true,
                    postal_code: postalCode,
                },
            });
            await this.saveSession(phone, 'AWAITING_PROBLEM_DESCRIPTION', {});
            await WhatsAppService.sendTextMessage(
                phone,
                `¡Perfecto ${userName}! Ya tenés tu perfil completo.\n\nContame ¿en qué te puedo ayudar hoy?\n\n_(Describime el problema como puedas, nosotros entendemos todo — cuanto más detalle, mejor puede cotizar el profesional)_`
            );
            return;
        }
    }

    private static async createRequestAndMatch(phone: string, sessionData: Record<string, unknown>, user: { name: string | null; address: string | null }) {
        const address = (sessionData.serviceAddress as string) || user.address || '';

        const request = await prisma.serviceRequest.create({
            data: {
                user_phone: phone,
                category: sessionData.category as string,
                description: sessionData.description as string,
                photos: (sessionData.photos as string[]) || [],
                address,
            },
        });

        const matchRes = await ProfessionalMatchingService.findProfessionalsAndCreateOffers(request.id);

        if (!matchRes.urgent && !matchRes.scheduled) {
            await WhatsAppService.sendTextMessage(phone, 'No encontramos profesionales disponibles en tu zona en este momento. Lo sentimos.');
            await this.clearSession(phone);
            return;
        }

        await this.saveSession(phone, 'AWAITING_PROFESSIONAL_SELECTION', { requestId: request.id, ...sessionData });

        let text = `${displayName(user)}encontré estas opciones para vos:\n\n`;

        if (matchRes.urgent) {
            const p = matchRes.urgent;
            text += `⚡ *OPCIÓN 1 — Urgente*\n👤 ${p.name} ${p.last_name}\n⭐ ${p.rating} · servicios realizados\n🕐 Disponible hoy en menos de 24hs\n💰 Tarifa urgente (precio mayor por rapidez)\n\n`;
        }
        if (matchRes.scheduled) {
            const p = matchRes.scheduled;
            text += `📅 *OPCIÓN 2 — Programado*\n👤 ${p.name} ${p.last_name}\n⭐ ${p.rating} · servicios realizados\n🕐 Disponible en hasta 72hs\n💰 Tarifa estándar (precio más económico)\n\n`;
        }

        text += '¿Con cuál preferís continuar?';

        await WhatsAppService.sendButtonMessage(phone, text, [
            ...(matchRes.urgent ? [{ id: 'btn_urgent', title: 'Opción urgente' }] : []),
            ...(matchRes.scheduled ? [{ id: 'btn_sched', title: 'Opción programada' }] : []),
        ]);
    }
}
