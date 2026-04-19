import { redis } from '../utils/redis';
import { prisma } from '@servy/db';
import type { Professional, User } from '@servy/db';
import { insertAgentLog } from '../lib/agent-log';
import { WhatsAppService } from './whatsapp.service';
import { ProfessionalMatchingService } from './matching.service';
import { StorageService } from './storage.service';
import { MercadoPagoService } from './mercadopago.service';
import { GeminiService } from './gemini.service';
import { mediationDirectionRedisKey, normalizeTwilioWhatsAppFrom, userRelayPauseRedisKey } from '../utils/twilio-phone';
import { env } from '../utils/env';
import { createProfessionalFromWhatsAppWizard } from './professional-registration.internal';

const SESSION_TTL = 60 * 60 * 24;
const REDIS_OP_TIMEOUT_MS = 500;

const MEDIATION_DIRECTION_TTL_SEC = 86400;

// Comandos del profesional con job activo (fuzzy Levenshtein ≤ 2, igual que availability-agent)
const PROFESSIONAL_COMMANDS: { phrases: string[]; key: 'en_camino' | 'imprevisto' | 'direccion' }[] = [
    {
        phrases: ['estoy yendo', 'voy para alla', 'salgo ahora', 'estoy saliendo'],
        key: 'en_camino',
    },
    {
        phrases: ['tuve un imprevisto', 'no puedo ir', 'surgio algo', 'me surgio un problema'],
        key: 'imprevisto',
    },
    {
        phrases: [
            'no encuentro la direccion',
            'no encuentro el domicilio',
            'donde es',
            'cual es la direccion',
        ],
        key: 'direccion',
    },
];

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i]![0] = i;
    for (let j = 0; j <= n; j++) dp[0]![j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
        }
    }
    return dp[m]![n]!;
}

function fuzzyPhrase(text: string, phrase: string): boolean {
    if (text.includes(phrase)) return true;
    const words = text.split(/\s+/).filter(Boolean);
    for (const w of words) {
        if (w.length >= phrase.length - 2 && levenshtein(w, phrase) <= 2) return true;
    }
    if (text.length <= phrase.length + 6 && levenshtein(text, phrase) <= 2) return true;
    return false;
}

function normalizeTextForCommands(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchProfessionalCommandKey(normalized: string): 'en_camino' | 'imprevisto' | 'direccion' | null {
    for (const cmd of PROFESSIONAL_COMMANDS) {
        for (const phrase of cmd.phrases) {
            if (fuzzyPhrase(normalized, phrase)) return cmd.key;
        }
    }
    return null;
}

const CATEGORY_EMOJIS: Record<string, string> = {
    Plomería: '🔧',
    Electricidad: '⚡',
    Cerrajería: '🔑',
    Gas: '🔥',
    'Aires acondicionados': '❄️',
};

/** Rubros para onboarding técnico por WhatsApp (mismo criterio que matching / portal). */
const PRO_ONBOARDING_CATEGORY_OPTIONS = [
    'Plomería',
    'Electricidad',
    'Cerrajería',
    'Gas',
    'Aires acondicionados',
] as const;

const PRO_ONBOARDING_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_SELECTION_PROMPT =
    'Hola, soy Servy 👋\n\n¿Cómo puedo ayudarte?\n\n1. Necesito un técnico\n2. Soy técnico y quiero registrarme';

const CLIENT_ONBOARDING_NAME_PROMPT =
    'Hola, soy Servy 👋\n\nTe conecto con técnicos verificados para tu hogar — plomeros, electricistas, gasistas y más.\n\nAntes de empezar necesito un par de datos rápidos.\n\n¿Cuál es tu nombre y apellido?';

function parseProOnboardingCategorySelection(raw: string): string[] | null {
    const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const indices = new Set<number>();
    for (const p of parts) {
        const n = parseInt(p, 10);
        if (Number.isNaN(n) || n < 1 || n > PRO_ONBOARDING_CATEGORY_OPTIONS.length) {
            return null;
        }
        indices.add(n - 1);
    }
    if (indices.size === 0) return null;
    return [...indices].sort((a, b) => a - b).map((i) => PRO_ONBOARDING_CATEGORY_OPTIONS[i]!);
}

function zonesFromFreeText(raw: string): string[] {
    return raw
        .split(',')
        .map((z) => z.trim())
        .filter((z) => z.length > 0);
}

function dniDigitsOnly(raw: string): string {
    return raw.replace(/\D/g, '');
}

async function countJobsForProfessional(professionalId: string): Promise<number> {
    return prisma.job.count({
        where: { quotation: { job_offer: { professional_id: professionalId } } },
    });
}

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
        const offer = await prisma.jobOffer.findUnique({
            where: { id: payload.jobOfferId },
            include: { professional: true },
        });
        const proName = offer?.professional?.name?.trim() || 'Tu técnico';
        const priceStr = payload.totalPrice.toLocaleString('es-AR');
        await WhatsAppService.sendTextMessage(
            userPhone,
            `💰 *Cotización recibida*\n\n━━━━━━━━━━━━━━━\n👤 *${proName}*\n💵 *$${priceStr}*\n⚠️ _Precio no incluye materiales_\n━━━━━━━━━━━━━━━\n\n🔒 _Tu dinero está protegido: el pago se retiene hasta que el trabajo esté terminado y vos lo confirmés._\n\n¿Aceptás?\n\n1. Sí, acepto\n2. No, prefiero otra opción`
        );
        await this.saveSession(userPhone, 'AWAITING_PAYMENT_DECISION', payload as unknown as Record<string, unknown>);
    }

    /** Tras marcar el trabajo completado (manual o por QR), el usuario puede responder con estrellas. */
    static async beginReviewPrompt(userPhone: string, jobId: string) {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { quotation: { include: { job_offer: { include: { professional: true } } } } },
        });
        if (!job?.quotation?.job_offer?.professional) {
            return;
        }
        const proName = job.quotation.job_offer.professional.name.trim() || 'el técnico';
        await WhatsAppService.sendTextMessage(
            userPhone,
            `🎉 *¡Trabajo completado!*\n\n¿Cómo te fue con *${proName}*?\n\n⭐ 1 — Muy malo\n⭐⭐ 2 — Malo\n⭐⭐⭐ 3 — Regular\n⭐⭐⭐⭐ 4 — Bueno\n⭐⭐⭐⭐⭐ 5 — Excelente\n\n_Respondé con el número._`
        );
        await this.saveSession(userPhone, 'AWAITING_REVIEW', { jobId });
    }

    static async processMessage(phone: string, messageType: string, content: string) {
        const user = await prisma.user.findUnique({ where: { phone } });

        let session = await this.getSession(phone);
        if (session.state === 'EXPIRED') {
            await this.clearSession(phone);
            session = { state: 'UNKNOWN', data: {} };
        }

        if (session.state.startsWith('PRO_ONBOARDING_')) {
            await this.handleProOnboardingFlow(phone, messageType, content, session);
            return;
        }

        if (session.state === 'ROLE_SELECTION') {
            await this.handleRoleSelection(phone, messageType, content);
            return;
        }

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

        session = await this.getSession(phone);
        if (session.state === 'EXPIRED') {
            await this.clearSession(phone);
            session = { state: 'IDLE', data: {} };
        }
        if (session.state === 'UNKNOWN') session = { state: 'IDLE', data: {} };

        if (messageType === 'text' && user) {
            const mediationKey = mediationDirectionRedisKey(phone);
            const pendingDir = await redis.get(mediationKey);
            if (pendingDir) {
                try {
                    const { proPhone, jobId } = JSON.parse(pendingDir) as { proPhone: string; jobId: string };
                    console.log(
                        '[conversation] mediación: reenvío al técnico (Referencia del cliente…). Tras esto se borra la clave Redis.',
                        { jobId, userTail: phone.slice(-4), proTail: String(proPhone).replace(/\D/g, '').slice(-4) }
                    );
                    const safeRef = content.trim().replace(/"/g, '“');
                    await WhatsAppService.sendTextMessage(
                        proPhone,
                        `📍 *Referencia del cliente*\n\n_${safeRef}_`
                    );
                    await insertAgentLog({
                        agent: 'messaging',
                        event: 'user_direction_reply',
                        level: 'info',
                        details: { jobId, userPhone: phone, preview: content.trim().slice(0, 200) },
                    });
                } catch {
                    /* ignore */
                }
                const removed = await redis.del(mediationKey);
                console.log('[conversation] mediación: redis DEL', { redisKeysRemoved: removed, mediationKey });
                return;
            }
        }

        if (messageType === 'text' && user) {
            const forwarded = await ConversationService.tryForwardUserMessageToProfessional(phone, content.trim(), session);
            if (forwarded) return;
        }

        switch (session.state) {
            case 'IDLE': {
                await redis.del(userRelayPauseRedisKey(phone));
                await this.saveSession(phone, 'AWAITING_PROBLEM_DESCRIPTION', {});
                const nm = user.name?.trim();
                const line = nm
                    ? `*${nm}*, contame ¿qué necesitás?\n\n_Describime el problema — cuanto más detalle, mejor cotiza el técnico._`
                    : `Contame ¿qué necesitás?\n\n_Describime el problema — cuanto más detalle, mejor cotiza el técnico._`;
                await WhatsAppService.sendTextMessage(phone, line);
                break;
            }

            case 'AWAITING_PROBLEM_DESCRIPTION': {
                if (messageType === 'image') {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        '📸 Foto recibida.\n\nContame también con palabras qué está pasando, así el técnico entiende bien el problema.'
                    );
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
                    const nm = user.name?.trim() || '';
                    const greetLine = nm ? `Hola *${nm}* 👋\n\n` : `Hola 👋\n\n`;
                    await WhatsAppService.sendTextMessage(
                        phone,
                        `${greetLine}Contame ¿qué necesitás?\n\n_Describime el problema — cuanto más detalle, mejor cotiza el técnico._`
                    );
                    return;
                }
                const classification = await GeminiService.classifyProblem(content);
                if (!classification.understood || !classification.category) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'No entendí bien el problema. ¿Podés contarme con más detalle qué está pasando?'
                    );
                    return;
                }
                session.data.description = content;
                session.data.category = classification.category;
                session.data.urgency = classification.urgency;
                await this.saveSession(phone, 'AWAITING_PHOTOS', session.data);
                const empathy = randomEmpathy(String(classification.urgency));
                const emoji = CATEGORY_EMOJIS[classification.category] || '🔧';
                await WhatsAppService.sendTextMessage(phone, empathy);
                await WhatsAppService.sendTextMessage(
                    phone,
                    `${emoji} *${classification.category}*\n\n¿Tenés una foto del problema? Le ayuda al técnico a cotizar mejor.\n\n1. Sí, mando una foto\n2. No, continuamos`
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
                    await WhatsAppService.sendTextMessage(
                        phone,
                        '📸 Foto guardada.\n\nPodés mandar otra o escribir _listo_ cuando termines.'
                    );
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
                            'Mandá las fotos cuando quieras. Cuando termines escribí _listo_.'
                        );
                    } else {
                        await WhatsAppService.sendTextMessage(phone, 'Respondé *1* para mandar foto o *2* para continuar sin foto.');
                    }
                }
                break;

            case 'AWAITING_ADDRESS_FOR_SERVICE':
                session.data.serviceAddress = content;
                await this.createRequestAndMatch(phone, session.data, user);
                break;

            case 'AWAITING_PROFESSIONAL_SELECTION': {
                const requestId = session.data.requestId as string;
                const hasUrgent = Boolean(session.data.hasUrgent);
                const hasScheduled = Boolean(session.data.hasScheduled);
                const raw = content.trim();
                const lc = raw.toLowerCase();

                const pickUrgent =
                    (hasUrgent && hasScheduled && (raw === 'btn_urgent' || raw === '1')) ||
                    (hasUrgent && !hasScheduled && (raw === 'btn_urgent' || raw === '1' || lc === 'si' || lc === 'sí'));
                const pickScheduled =
                    (hasScheduled && hasUrgent && (raw === 'btn_sched' || raw === '2')) ||
                    (hasScheduled && !hasUrgent && (raw === 'btn_sched' || raw === '1' || lc === 'si' || lc === 'sí'));

                if (pickUrgent) {
                    session.data.selection = 'urgent';
                    await prisma.jobOffer.updateMany({
                        where: { request_id: requestId, priority: 'scheduled' },
                        data: { status: 'cancelled' },
                    });

                    await ConversationService.notifyProfessionalJobSelected(requestId, 'urgent');

                    const now = new Date();
                    const hour = parseInt(
                        new Intl.DateTimeFormat('es-AR', {
                            hour: 'numeric',
                            hour12: false,
                            timeZone: 'America/Argentina/Buenos_Aires',
                        }).format(now),
                        10
                    );

                    let scheduleOptionIds: string[] = [];
                    let scheduleLabels: string[] = [];
                    let scheduleMsg = '';

                    if (hour < 18) {
                        if (hour < 12) {
                            scheduleOptionIds.push('sch_9_12');
                            scheduleLabels.push('9 a 12hs');
                        }
                        if (hour < 15) {
                            scheduleOptionIds.push('sch_12_15');
                            scheduleLabels.push('12 a 15hs');
                        }
                        if (hour < 18) {
                            scheduleOptionIds.push('sch_15_18');
                            scheduleLabels.push('15 a 18hs');
                        }
                        scheduleOptionIds.push('sch_asap');
                        scheduleLabels.push('Lo antes posible');
                        const lines = scheduleOptionIds.map((_, i) => `${i + 1}. ${scheduleLabels[i]}`).join('\n');
                        scheduleMsg = `¿En qué horario preferís que vaya hoy?\n\n${lines}`;
                    } else {
                        scheduleOptionIds = ['sch_tomorrow_morning', 'sch_tomorrow_mid', 'sch_tomorrow_afternoon'];
                        scheduleMsg =
                            'Ya es tarde para coordinar para hoy.\n\n¿A qué horario preferís mañana?\n\n1. Mañana temprano (8 a 10hs)\n2. Mañana a la mañana (10 a 12hs)\n3. Mañana a la tarde (14 a 18hs)';
                    }

                    session.data.scheduleOptionIds = scheduleOptionIds;
                    await this.saveSession(phone, 'AWAITING_SCHEDULE', session.data);
                    await WhatsAppService.sendTextMessage(phone, scheduleMsg);
                } else if (pickScheduled) {
                    session.data.selection = 'scheduled';
                    await prisma.jobOffer.updateMany({ where: { request_id: requestId, priority: 'urgent' }, data: { status: 'cancelled' } });

                    await ConversationService.notifyProfessionalJobSelected(requestId, 'scheduled');

                    await this.saveSession(phone, 'AWAITING_SCHEDULE_DAY', session.data);
                    await WhatsAppService.sendTextMessage(
                        phone,
                        '¿Qué día preferís?\n\n1. Mañana\n2. Pasado mañana\n3. En 3 días'
                    );
                } else {
                    const hint =
                        hasUrgent && hasScheduled
                            ? 'Solo hay dos opciones: *1* (urgente) o *2* (programado).'
                            : hasUrgent || hasScheduled
                              ? 'Escribí *sí* o *1* para seguir con la opción que te mostramos.'
                              : 'Por favor respondé *1* o *2* para elegir una opción.';
                    await WhatsAppService.sendTextMessage(phone, hint);
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
                const optionIds = session.data.scheduleOptionIds as string[] | undefined;
                const trimmed = content.trim();
                let slotId: string | null = Object.prototype.hasOwnProperty.call(scheduleMap, trimmed) ? trimmed : null;
                if (!slotId && optionIds?.includes(trimmed)) slotId = trimmed;
                if (!slotId && /^\d+$/.test(trimmed) && optionIds?.length) {
                    const idx = parseInt(trimmed, 10) - 1;
                    if (idx >= 0 && idx < optionIds.length) slotId = optionIds[idx]!;
                }
                if (!slotId) {
                    await WhatsAppService.sendTextMessage(phone, 'Elegí una opción válida escribiendo el número.');
                    break;
                }
                session.data.schedule = scheduleMap[slotId] ?? trimmed;
                await prisma.jobOffer.updateMany({
                    where: { request_id: session.data.requestId as string },
                    data: { schedule: session.data.schedule as string },
                });
                await this.saveSession(phone, 'AWAITING_QUOTATION', session.data);
                await WhatsAppService.sendTextMessage(
                    phone,
                    '*Perfecto.* Le avisamos al técnico ahora mismo.\n\n⏳ En breve te llega su cotización — normalmente en menos de 30 minutos.\n\n_Si no recibís nada en una hora, escribí *ayuda*._'
                );
                break;
            }

            case 'AWAITING_SCHEDULE_DAY': {
                const dayMap: Record<string, string> = {
                    day_tomorrow: 'Mañana',
                    day_after: 'Pasado mañana',
                    day_3: 'En 3 días',
                };
                const dayKeys = ['day_tomorrow', 'day_after', 'day_3'] as const;
                let dayKey: string | null = dayMap[content] ? content : null;
                if (!dayKey && /^[123]$/.test(content.trim())) {
                    dayKey = dayKeys[parseInt(content.trim(), 10) - 1] ?? null;
                }
                if (!dayKey || !dayMap[dayKey]) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'Escribí *1*, *2* o *3* para elegir el día.'
                    );
                    break;
                }
                session.data.scheduleDay = dayMap[dayKey];
                await this.saveSession(phone, 'AWAITING_SCHEDULE_TIME', session.data);
                await WhatsAppService.sendTextMessage(phone, '¿En qué horario?\n\n1. 9 a 12hs\n2. 12 a 15hs\n3. 15 a 18hs');
                break;
            }

            case 'AWAITING_SCHEDULE_TIME': {
                const timeMap: Record<string, string> = {
                    sch_9_12: '9 a 12hs',
                    sch_12_15: '12 a 15hs',
                    sch_15_18: '15 a 18hs',
                };
                const timeKeys = ['sch_9_12', 'sch_12_15', 'sch_15_18'] as const;
                const trimmedT = content.trim();
                let tk: string | null = Object.prototype.hasOwnProperty.call(timeMap, trimmedT) ? trimmedT : null;
                if (!tk && /^[123]$/.test(trimmedT)) {
                    tk = timeKeys[parseInt(trimmedT, 10) - 1] ?? null;
                }
                if (!tk || !timeMap[tk]) {
                    await WhatsAppService.sendTextMessage(phone, 'Escribí *1*, *2* o *3* para el horario.');
                    break;
                }
                session.data.schedule = `${session.data.scheduleDay} ${timeMap[tk]}`;
                await prisma.jobOffer.updateMany({
                    where: { request_id: session.data.requestId as string },
                    data: { schedule: session.data.schedule as string },
                });
                await this.saveSession(phone, 'AWAITING_QUOTATION', session.data);
                await WhatsAppService.sendTextMessage(
                    phone,
                    '*Perfecto.* Le avisamos al técnico ahora mismo.\n\n⏳ En breve te llega su cotización — normalmente en menos de 30 minutos.\n\n_Si no recibís nada en una hora, escribí *ayuda*._'
                );
                break;
            }

            case 'AWAITING_QUOTATION':
                await WhatsAppService.sendTextMessage(
                    phone,
                    '⏳ Todavía estamos esperando la cotización del técnico.\n\nTe avisamos en cuanto la tengamos. _Normalmente llega en menos de 30 minutos._'
                );
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
                    await WhatsAppService.sendTextMessage(phone, 'Respondé *1* para aceptar o *2* para rechazar la cotización.');
                }
                break;
            }

            case 'PAYMENT_PENDING':
                await WhatsAppService.sendTextMessage(
                    phone,
                    '⏳ Tu pago está siendo procesado.\n\nSi ya completaste el pago, la confirmación llega en unos minutos. Si tuviste algún problema, escribí _ayuda_.'
                );
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
                await WhatsAppService.sendTextMessage(
                    phone,
                    'Gracias, tomamos nota. 🙏\n\nLo revisamos y trabajamos para que no vuelva a pasar. Cuando quieras, acá estamos.'
                );
                break;

            case 'COMPLETED':
                await this.clearSession(phone);
                await this.saveSession(phone, 'IDLE', {});
                {
                    const nm = user.name?.trim();
                    const line = nm
                        ? `*${nm}*, contame ¿qué necesitás?\n\n_Describime el problema — cuanto más detalle, mejor cotiza el técnico._`
                        : `Contame ¿qué necesitás?\n\n_Describime el problema — cuanto más detalle, mejor cotiza el técnico._`;
                    await WhatsAppService.sendTextMessage(phone, line);
                }
                break;

            default:
                await this.saveSession(phone, 'IDLE', {});
                await WhatsAppService.sendTextMessage(
                    phone,
                    'No entendí tu mensaje.\n\nEscribí _ayuda_ para ver qué podés hacer.'
                );
        }
    }

    private static async handleGlobalIntents(phone: string, text: string, user: { name: string | null }): Promise<boolean> {
        const t = text.toLowerCase();
        if (t === 'ayuda' || t === '?') {
            await WhatsAppService.sendTextMessage(
                phone,
                '*Servy* — técnicos verificados para tu hogar 🏠\n\nServicios disponibles:\n🔧 Plomería\n⚡ Electricidad\n🔑 Cerrajería\n🔥 Gas\n❄️ Aires acondicionados\n\n━━━━━━━━━━━━━━━\n*Comandos*\n━━━━━━━━━━━━━━━\n_estado_ → ver tu pedido actual\n_cancelar_ → cancelar pedido en curso\n_cambiar dirección_ → actualizar tu domicilio'
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
            await WhatsAppService.sendTextMessage(
                phone,
                'Listo, cancelamos el pedido. 👍\n\nEscribí cuando quieras empezar uno nuevo.'
            );
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

        const proName = quotation.job_offer.professional.name.trim() || 'el técnico';
        const priceStr = quotation.total_price.toLocaleString('es-AR');

        try {
            const initPoint = await MercadoPagoService.createPreference(quotation, user);
            await WhatsAppService.sendTextMessage(
                phone,
                `*¡Genial!* Confirmamos el servicio con *${proName}* 🙌\n\n━━━━━━━━━━━━━━━\n💳 *Total: $${priceStr}*\n━━━━━━━━━━━━━━━\n\n🔒 *Tu dinero está protegido*\nEl pago queda retenido hasta que el trabajo esté bien hecho. Si el técnico no aparece, te devolvemos todo.\n\n👉 ${initPoint}\n\n_Tenés 30 minutos para completar el pago antes de que se libere la reserva._`
            );
        } catch {
            await WhatsAppService.sendTextMessage(
                phone,
                '⚠️ Hubo un problema al generar el link de pago.\n\nEscribí _ayuda_ y te contactamos para resolverlo en minutos.'
            );
        }
    }

    private static async handleRejectQuotation(phone: string, data: Record<string, unknown>) {
        const quotationId = data.quotationId as string;
        const jobOfferId = data.jobOfferId as string;
        const requestId = data.requestId as string;

        const rejectedOffer = await prisma.jobOffer.findUnique({
            where: { id: jobOfferId },
            include: { professional: true },
        });

        await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'rejected' } }).catch(() => {});
        await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'rejected' } }).catch(() => {});

        if (rejectedOffer?.professional?.phone) {
            await WhatsAppService.sendTextMessage(
                rejectedOffer.professional.phone,
                'El cliente eligió otra opción para este trabajo.\n\nNo te preocupes, seguís activo y te llegan nuevas solicitudes. 💪'
            );
        }

        const sibling = await prisma.jobOffer.findFirst({
            where: { request_id: requestId, id: { not: jobOfferId }, status: 'cancelled' },
            include: { professional: true },
        });

        if (sibling) {
            await prisma.jobOffer.update({ where: { id: sibling.id }, data: { status: 'pending' } });
            await WhatsAppService.sendTextMessage(sibling.professional.phone, 'El cliente pidió otra opción. Entrá al portal y enviá tu cotización.');
            await this.saveSession(phone, 'AWAITING_QUOTATION', { requestId });
            await WhatsAppService.sendTextMessage(
                phone,
                'Entendido, buscamos otra opción.\n\n⏳ Le pedimos cotización al otro técnico disponible. Te avisamos cuando llegue.'
            );
        } else {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(
                phone,
                'No tenemos otra opción disponible para este pedido en este momento.\n\nEscribí cuando quieras hacer un nuevo pedido y buscamos de nuevo. 👍'
            );
        }
    }

    private static async handleReview(phone: string, content: string, data: Record<string, unknown>) {
        const t = content.trim();
        const ratingMap: Record<string, number> = { '⭐': 1, '⭐⭐': 2, '⭐⭐⭐': 3, '⭐⭐⭐⭐': 4, '⭐⭐⭐⭐⭐': 5 };
        const numMap: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
        const rating = ratingMap[t] || numMap[t];
        if (!rating) {
            await WhatsAppService.sendTextMessage(
                phone,
                'Respondé con un número del *1* al *5* según las estrellas que te mostramos arriba (1 = muy malo, 5 = excelente).'
            );
            return;
        }

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
            await WhatsAppService.sendTextMessage(
                phone,
                '*¡Gracias por calificarlo!* 🙌\n\nNos alegra que haya salido bien. Cuando necesités otro servicio, ya sabés dónde encontrarnos.'
            );
        } else {
            await this.saveSession(phone, 'REVIEW_COMMENT', data);
            await WhatsAppService.sendTextMessage(
                phone,
                'Gracias por contarnos. Lamentamos que no haya sido la experiencia que esperabas.\n\n¿Podés contarnos qué pasó? Tu feedback nos ayuda a mejorar.'
            );
        }
    }

    private static async handleOnboardingFlow(phone: string, messageType: string, content: string, user: { phone: string } | null) {
        let session = await this.getSession(phone);
        if (session.state === 'EXPIRED') {
            await this.clearSession(phone);
            session = { state: 'UNKNOWN', data: {} };
        }

        if (user && session.state === 'ONBOARDING_ADDRESS') {
            await prisma.user.update({ where: { phone }, data: { address: content.trim() } });
            await this.clearSession(phone);
            await this.saveSession(phone, 'IDLE', {});
            await WhatsAppService.sendTextMessage(phone, 'Listo, actualicé tu dirección. Escribí cuando quieras pedir un servicio.');
            return;
        }

        if (!user) {
            if (session.state === 'UNKNOWN' || session.state === 'IDLE') {
                await this.saveSession(phone, 'ROLE_SELECTION', {});
                await WhatsAppService.sendTextMessage(phone, ROLE_SELECTION_PROMPT);
                return;
            }
            return;
        }

        if (session.state === 'UNKNOWN' || session.state === 'IDLE') {
            await this.saveSession(phone, 'ONBOARDING_NAME', {});
            await WhatsAppService.sendTextMessage(
                phone,
                'Hola, soy Servy 👋\n\nTe conecto con técnicos verificados para tu hogar — plomeros, electricistas, gasistas y más.\n\nAntes de empezar necesito un par de datos rápidos.\n\n¿Cuál es tu nombre y apellido?'
            );
            return;
        }

        if (session.state === 'ONBOARDING_NAME') {
            const parts = content.split(' ');
            await prisma.user.update({
                where: { phone },
                data: { name: parts[0], last_name: parts.slice(1).join(' ') || '-' },
            });
            await this.saveSession(phone, 'ONBOARDING_DOMICILE_TYPE', { name: parts[0] });
            const first = parts[0]?.trim() || 'Hola';
            await WhatsAppService.sendTextMessage(
                phone,
                `Hola *${first}* 👋\n\n¿Dónde vas a necesitar el servicio?\n\n1. Casa\n2. Departamento\n3. Barrio cerrado / country\n4. Empresa`
            );
            return;
        }

        if (session.state === 'ONBOARDING_DOMICILE_TYPE') {
            const typeMap: Record<string, string> = {
                '1': 'casa',
                '2': 'departamento',
                '3': 'barrio_cerrado',
                '4': 'empresa',
                dom_casa: 'casa',
                dom_depto: 'departamento',
                dom_barrio: 'barrio_cerrado',
                dom_empresa: 'empresa',
            };
            const domType = typeMap[content.trim()] || typeMap[content] || content;
            session.data.domicileType = domType;
            await this.saveSession(phone, 'ONBOARDING_STREET', session.data);

            if (domType === 'barrio_cerrado') {
                await WhatsAppService.sendTextMessage(
                    phone,
                    '¿Cuál es el nombre del barrio y tu lote?\n\n_Ej: Los Pinos, Lote 42_'
                );
            } else if (domType === 'departamento') {
                await WhatsAppService.sendTextMessage(
                    phone,
                    '¿Cuál es tu dirección completa?\n\n_Ej: Av. Santa Fe 1234, Piso 3 Depto B_'
                );
            } else if (domType === 'empresa') {
                await WhatsAppService.sendTextMessage(phone, '¿Cuál es la dirección de la empresa?');
            } else {
                await WhatsAppService.sendTextMessage(phone, '¿Cuál es tu dirección?\n\n_Ej: Av. Rivadavia 4521_');
            }
            return;
        }

        if (session.state === 'ONBOARDING_STREET') {
            session.data.street = content;
            await this.saveSession(phone, 'ONBOARDING_CITY', session.data);
            await WhatsAppService.sendTextMessage(phone, '¿En qué ciudad está ubicado?');
            return;
        }

        if (session.state === 'ONBOARDING_CITY') {
            session.data.city = content;
            await this.saveSession(phone, 'ONBOARDING_POSTAL', session.data);
            await WhatsAppService.sendTextMessage(
                phone,
                'Último dato: ¿cuál es el código postal?\n\n_Lo usamos para encontrar técnicos cerca tuyo._'
            );
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
                `*¡Listo ${userName}!* Ya tenés tu perfil. 🎉\n\nContame qué necesitás — plomería, electricidad, gas, cerrajería, aires acondicionados.\n\n_Cuanto más detalle des, mejor puede cotizar el técnico._`
            );
            return;
        }
    }

    private static async handleRoleSelection(phone: string, messageType: string, content: string) {
        if (messageType !== 'text') {
            await WhatsAppService.sendTextMessage(phone, ROLE_SELECTION_PROMPT);
            return;
        }
        const c = content.trim();
        const lc = c.toLowerCase();

        const pickPro =
            c === '2' ||
            c === 'btn_pro' ||
            lc.includes('soy técnico') ||
            lc.includes('soy tecnico');
        const pickClient =
            c === '1' ||
            c === 'btn_client' ||
            (lc.includes('necesito') && !pickPro);

        if (pickPro) {
            await this.saveSession(phone, 'PRO_ONBOARDING_NAME', {});
            await WhatsAppService.sendTextMessage(phone, '¿Cuál es tu nombre?');
            return;
        }

        if (pickClient) {
            await this.clearSession(phone);
            await prisma.user.create({ data: { phone } });
            await this.saveSession(phone, 'ONBOARDING_NAME', {});
            await WhatsAppService.sendTextMessage(phone, CLIENT_ONBOARDING_NAME_PROMPT);
            return;
        }

        await WhatsAppService.sendTextMessage(phone, ROLE_SELECTION_PROMPT);
    }

    private static async finalizeProOnboardingWhatsApp(phone: string, data: Record<string, unknown>): Promise<void> {
        const name = String(data.name ?? '').trim();
        const lastName = String(data.lastName ?? '').trim();
        const categories = data.categories as string[] | undefined;
        const zones = data.zones as string[] | undefined;
        const dniDigits = String(data.dni ?? '').replace(/\D/g, '');
        const email = String(data.email ?? '').trim().toLowerCase();
        if (!name || !lastName || !categories?.length || !zones?.length || !dniDigits || !email) {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(
                phone,
                'Se perdió parte de los datos del registro. Escribí de nuevo para empezar.'
            );
            return;
        }
        const result = await createProfessionalFromWhatsAppWizard({
            name,
            last_name: lastName,
            phone,
            email,
            dniDigits,
            categories,
            zones,
        });
        if (!result.ok) {
            await WhatsAppService.sendTextMessage(
                phone,
                'Ya existe una cuenta con ese email o teléfono.\n\nEscribí _ayuda_ si necesitás acceder a tu cuenta.'
            );
            await this.clearSession(phone);
            return;
        }
        await this.clearSession(phone);
        const base = env.FRONTEND_PRO_URL.replace(/\/$/, '');
        const link = `${base}/set-password?token=${encodeURIComponent(result.token)}`;
        await WhatsAppService.sendTextMessage(
            phone,
            `✅ *¡Perfecto ${result.firstName}!* Ya creamos tu perfil en Servy.\n\nPara activar tu cuenta entrá acá:\n👉 ${link}\n\n_El link es válido por 24 horas._\n\n━━━━━━━━━━━━━━━\n*¿Qué sigue?*\n━━━━━━━━━━━━━━━\n\n1️⃣ Elegí tu contraseña\n2️⃣ Completá tu perfil (CBU, docs, disponibilidad)\n3️⃣ Esperá nuestra validación (24-48hs)\n4️⃣ Empezá a recibir trabajos 💪`
        );
    }

    private static async handleProOnboardingFlow(
        phone: string,
        messageType: string,
        content: string,
        session: { state: string; data: Record<string, unknown> }
    ) {
        const data = { ...session.data };

        const needText = async () => {
            await WhatsAppService.sendTextMessage(phone, 'Necesito que me lo escribas en texto.');
        };

        if (messageType !== 'text') {
            await needText();
            return;
        }

        const text = content.trim();

        switch (session.state) {
            case 'PRO_ONBOARDING_NAME': {
                if (!text) {
                    await WhatsAppService.sendTextMessage(phone, '¿Cuál es tu nombre?');
                    return;
                }
                data.name = text;
                await this.saveSession(phone, 'PRO_ONBOARDING_LASTNAME', data);
                await WhatsAppService.sendTextMessage(phone, '¿Y tu apellido?');
                return;
            }
            case 'PRO_ONBOARDING_LASTNAME': {
                if (!text) {
                    await WhatsAppService.sendTextMessage(phone, '¿Y tu apellido?');
                    return;
                }
                data.lastName = text;
                await this.saveSession(phone, 'PRO_ONBOARDING_CATEGORIES', data);
                const lines = PRO_ONBOARDING_CATEGORY_OPTIONS.map((c, i) => `${i + 1}. ${c}`).join('\n');
                await WhatsAppService.sendTextMessage(
                    phone,
                    `¿A qué te dedicás? Podés elegir más de uno.\n\n${lines}\n\n_Respondé con los números separados por coma. Ej: 1,3_`
                );
                return;
            }
            case 'PRO_ONBOARDING_CATEGORIES': {
                const cats = parseProOnboardingCategorySelection(text);
                if (!cats) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'No entendí la selección. Respondé con números separados por coma.\n\n_Ej: 1,3_'
                    );
                    return;
                }
                data.categories = cats;
                await this.saveSession(phone, 'PRO_ONBOARDING_ZONES', data);
                await WhatsAppService.sendTextMessage(
                    phone,
                    '¿En qué zona o zonas trabajás?\n\n_Ej: Palermo, Belgrano, Villa Urquiza_'
                );
                return;
            }
            case 'PRO_ONBOARDING_ZONES': {
                const zones = zonesFromFreeText(text);
                if (zones.length === 0) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'Necesito al menos una zona.\n\n_Ej: Palermo, Belgrano, Villa Urquiza_'
                    );
                    return;
                }
                data.zones = zones;
                await this.saveSession(phone, 'PRO_ONBOARDING_DNI', data);
                await WhatsAppService.sendTextMessage(
                    phone,
                    '¿Cuál es tu DNI?\n\n_Solo el número, sin puntos._'
                );
                return;
            }
            case 'PRO_ONBOARDING_DNI': {
                const dni = dniDigitsOnly(text);
                if (dni.length < 7 || dni.length > 8) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'El DNI no parece válido. Enviá solo el número sin puntos.\n\n_Ej: 35421890_'
                    );
                    return;
                }
                data.dni = dni;
                await this.saveSession(phone, 'PRO_ONBOARDING_EMAIL', data);
                await WhatsAppService.sendTextMessage(phone, 'DNI recibido ✓\n\n¿Cuál es tu email?');
                return;
            }
            case 'PRO_ONBOARDING_EMAIL': {
                const email = text.trim().toLowerCase();
                if (!PRO_ONBOARDING_EMAIL_RE.test(email)) {
                    await WhatsAppService.sendTextMessage(phone, 'Ese email no parece válido. ¿Podés revisarlo?');
                    return;
                }
                data.email = email;
                await this.saveSession(phone, 'PRO_ONBOARDING_DONE', data);
                await this.finalizeProOnboardingWhatsApp(phone, data);
                return;
            }
            case 'PRO_ONBOARDING_DONE': {
                await this.finalizeProOnboardingWhatsApp(phone, data);
                return;
            }
            default:
                await this.clearSession(phone);
                await WhatsAppService.sendTextMessage(phone, 'Algo salió mal con el registro. Escribí de nuevo para empezar.');
        }
    }

    private static async tryForwardUserMessageToProfessional(
        phone: string,
        text: string,
        session: { state: string; data: Record<string, unknown> }
    ): Promise<boolean> {
        const forwardStates = new Set(['IDLE', 'AWAITING_PAYMENT_DECISION', 'PAYMENT_PENDING', 'COMPLETED']);
        if (!forwardStates.has(session.state)) return false;
        if (await redis.get(userRelayPauseRedisKey(phone))) {
            console.log('[conversation] relay usuario→técnico omitido (tras cancelar o pausa explícita)');
            return false;
        }
        const job = await prisma.job.findFirst({
            where: {
                status: { in: ['confirmed', 'in_progress'] },
                quotation: { job_offer: { service_request: { user_phone: phone } } },
            },
            include: {
                quotation: {
                    include: {
                        job_offer: { include: { professional: true } },
                    },
                },
            },
            orderBy: { id: 'desc' },
        });
        if (!job) return false;
        const proPhone = job.quotation.job_offer.professional.phone;
        const safe = text.replace(/"/g, '“');
        await WhatsAppService.sendTextMessage(proPhone, `💬 *Mensaje del cliente*\n\n_${safe}_`);
        await insertAgentLog({
            agent: 'messaging',
            event: 'relay_user_to_pro',
            level: 'info',
            details: { jobId: job.id, preview: text.slice(0, 200) },
        });
        return true;
    }

    static async handleProfessionalMediatedMessaging(args: {
        professional: Professional;
        phone: string;
        body: string;
        messageType: string;
    }): Promise<boolean> {
        const { professional, body, messageType } = args;
        if (messageType !== 'text' || !body.trim()) return false;

        const job = await prisma.job.findFirst({
            where: {
                status: { in: ['confirmed', 'in_progress'] },
                quotation: { job_offer: { professional_id: professional.id } },
            },
            include: {
                quotation: {
                    include: {
                        job_offer: {
                            include: {
                                professional: true,
                                service_request: { include: { user: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { id: 'desc' },
        });
        if (!job) return false;

        const userPhone = job.quotation.job_offer.service_request.user_phone;
        const proName = job.quotation.job_offer.professional.name;
        const trimmed = body.trim();

        const llegoMatch = trimmed.match(/llego\s+en\s+(\d+)/i);
        if (llegoMatch) {
            const mins = llegoMatch[1];
            await WhatsAppService.sendTextMessage(userPhone, `⏱️ *${proName} llega en ${mins} minutos.*`);
            await insertAgentLog({
                agent: 'messaging',
                event: 'command_llego_minutos',
                level: 'info',
                details: { jobId: job.id, minutes: mins, direction: 'pro_to_user' },
            });
            return true;
        }

        const norm = normalizeTextForCommands(trimmed);
        const cmd = matchProfessionalCommandKey(norm);
        if (cmd === 'en_camino') {
            await WhatsAppService.sendTextMessage(
                userPhone,
                `🚗 *${proName} está en camino.*\n\nTe avisamos cuando esté cerca. Cualquier consulta escribí acá.`
            );
            await insertAgentLog({
                agent: 'messaging',
                event: 'command_en_camino',
                level: 'info',
                details: { jobId: job.id, direction: 'pro_to_user' },
            });
            return true;
        }
        if (cmd === 'imprevisto') {
            await WhatsAppService.sendTextMessage(
                userPhone,
                `⚠️ *${proName} tuvo un imprevisto.*\n\nUn integrante del equipo Servy se va a comunicar con vos en los próximos minutos para coordinar.\n\n_Disculpá los inconvenientes._`
            );
            await insertAgentLog({
                agent: 'messaging',
                event: 'command_imprevisto',
                level: 'warn',
                details: { jobId: job.id, direction: 'pro_to_user' },
            });
            return true;
        }
        if (cmd === 'direccion') {
            await WhatsAppService.sendTextMessage(
                userPhone,
                `📍 *${proName} necesita confirmar la dirección.*\n\n¿Podés darle una referencia o aclaración para encontrar tu casa?\n\n_Respondé acá y se lo hacemos llegar._`
            );
            await redis.set(
                mediationDirectionRedisKey(userPhone),
                JSON.stringify({
                    proPhone: normalizeTwilioWhatsAppFrom(professional.phone) || String(professional.phone).replace(/\D/g, ''),
                    jobId: job.id,
                }),
                'EX',
                MEDIATION_DIRECTION_TTL_SEC
            );
            await insertAgentLog({
                agent: 'messaging',
                event: 'command_direccion',
                level: 'info',
                details: { jobId: job.id, direction: 'pro_to_user' },
            });
            return true;
        }

        const safe = trimmed.replace(/"/g, '“');
        await WhatsAppService.sendTextMessage(userPhone, `💬 *Mensaje de ${proName}*\n\n_${safe}_`);
        await insertAgentLog({
            agent: 'messaging',
            event: 'relay_pro_to_user',
            level: 'info',
            details: { jobId: job.id, preview: trimmed.slice(0, 200), direction: 'pro_to_user' },
        });
        return true;
    }

    /** Tras elegir el cliente urgente vs programado: avisar al técnico (WhatsApp + sesión pro). */
    private static async notifyProfessionalJobSelected(requestId: string, priority: 'urgent' | 'scheduled'): Promise<void> {
        const selectedOffer = await prisma.jobOffer.findFirst({
            where: {
                request_id: requestId,
                priority,
                status: { not: 'cancelled' },
            },
            include: {
                professional: true,
                service_request: { include: { user: true } },
            },
        });
        if (!selectedOffer?.professional || !selectedOffer.service_request) {
            console.error('[notifyProfessionalJobSelected] sin oferta o relación', { requestId, priority });
            return;
        }

        let userForNotify: User | null = selectedOffer.service_request.user;
        if (!userForNotify) {
            userForNotify = await prisma.user.findUnique({
                where: { phone: selectedOffer.service_request.user_phone },
            });
        }
        if (!userForNotify) {
            userForNotify = {
                phone: selectedOffer.service_request.user_phone,
                name: null,
                last_name: null,
            } as User;
            console.warn('[notifyProfessionalJobSelected] User no encontrado; aviso con datos mínimos', {
                requestId,
                phone: selectedOffer.service_request.user_phone,
            });
        }

        const { ProfessionalConversationService } = await import('./professional.conversation.service');
        await ProfessionalConversationService.notifyNewJob(
            selectedOffer.professional,
            selectedOffer,
            { ...selectedOffer.service_request, user: userForNotify },
            userForNotify
        );
    }

    /** Aviso temprano: hay pedido y oferta en portal; el mensaje “aceptás” llega cuando el cliente elige modalidad. */
    private static async pingProfessionalsNewRequest(
        matchRes: { urgent: { id: string; phone: string } | null; scheduled: { id: string; phone: string } | null },
        categoryLabel: string
    ): Promise<void> {
        const baseUrl = env.FRONTEND_PRO_URL.replace(/\/$/, '');
        const list = [matchRes.urgent, matchRes.scheduled].filter(Boolean) as {
            id: string;
            phone: string;
        }[];
        const seen = new Set<string>();
        for (const pro of list) {
            if (seen.has(pro.id)) continue;
            seen.add(pro.id);
            try {
                await WhatsAppService.sendTextMessage(
                    pro.phone,
                    `🔔 *Servy* — Hay un cliente con pedido de *${categoryLabel || 'servicio'}*. Está eligiendo la modalidad; en cuanto confirme te vamos a pedir por acá si aceptás el trabajo.\n\n📱 Podés ver el pedido en: ${baseUrl}/dashboard`
                );
            } catch (e) {
                console.error('[pingProfessionalsNewRequest]', pro.id, e);
            }
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

        const hasUrgent = Boolean(matchRes.urgent);
        const hasScheduled = Boolean(matchRes.scheduled);

        let urgentJobs = 0;
        let schedJobs = 0;
        if (matchRes.urgent) {
            urgentJobs = await countJobsForProfessional(matchRes.urgent.id);
        }
        if (matchRes.scheduled) {
            schedJobs = await countJobsForProfessional(matchRes.scheduled.id);
        }

        const fmtRating = (r: number): string => (Number.isInteger(r) ? String(r) : r.toFixed(1));

        await this.saveSession(phone, 'AWAITING_PROFESSIONAL_SELECTION', {
            requestId: request.id,
            hasUrgent,
            hasScheduled,
            ...sessionData,
        });

        await ConversationService.pingProfessionalsNewRequest(
            matchRes,
            String((sessionData.category as string) || 'servicio')
        );

        if (hasUrgent && hasScheduled) {
            const u = matchRes.urgent!;
            const s = matchRes.scheduled!;
            const text =
                'Encontré técnicos disponibles en tu zona 👇\n\n' +
                '━━━━━━━━━━━━━━━\n' +
                '⚡ *Urgente*\n' +
                '━━━━━━━━━━━━━━━\n' +
                `👤 *${u.name} ${u.last_name}*\n` +
                `⭐ ${fmtRating(u.rating)} · ${urgentJobs} trabajos\n` +
                '🕐 Hoy, en menos de 24hs\n' +
                '💰 Tarifa urgente\n\n' +
                '━━━━━━━━━━━━━━━\n' +
                '📅 *Programado*\n' +
                '━━━━━━━━━━━━━━━\n' +
                `👤 *${s.name} ${s.last_name}*\n` +
                `⭐ ${fmtRating(s.rating)} · ${schedJobs} trabajos\n` +
                '🕐 Hasta 72hs\n' +
                '💰 Tarifa estándar\n\n' +
                '¿Con cuál continuamos?\n\n' +
                '1. Urgente\n' +
                '2. Programado';
            await WhatsAppService.sendTextMessage(phone, text);
            return;
        }

        if (hasUrgent) {
            const u = matchRes.urgent!;
            const text =
                'Encontré técnicos disponibles en tu zona 👇\n\n' +
                '━━━━━━━━━━━━━━━\n' +
                '⚡ *Urgente*\n' +
                '━━━━━━━━━━━━━━━\n' +
                `👤 *${u.name} ${u.last_name}*\n` +
                `⭐ ${fmtRating(u.rating)} · ${urgentJobs} trabajos\n` +
                '🕐 Hoy, en menos de 24hs\n' +
                '💰 Tarifa urgente\n\n' +
                '¿Te sirve esta opción?\n\n' +
                'Escribí *sí* o *1* para continuar.';
            await WhatsAppService.sendTextMessage(phone, text);
            return;
        }

        const s = matchRes.scheduled!;
        const text =
            'Encontré técnicos disponibles en tu zona 👇\n\n' +
            '━━━━━━━━━━━━━━━\n' +
            '📅 *Programado*\n' +
            '━━━━━━━━━━━━━━━\n' +
            `👤 *${s.name} ${s.last_name}*\n` +
            `⭐ ${fmtRating(s.rating)} · ${schedJobs} trabajos\n` +
            '🕐 Hasta 72hs\n' +
            '💰 Tarifa estándar\n\n' +
            '¿Te sirve esta opción?\n\n' +
            'Escribí *sí* o *1* para continuar.';
        await WhatsAppService.sendTextMessage(phone, text);
    }
}
