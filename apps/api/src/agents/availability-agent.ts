import { randomUUID } from 'crypto';
import type { Professional } from '@servy/db';
import { redis } from '../utils/redis';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { insertAgentLog } from '../lib/agent-log';
import type { ProviderLiveStatus } from './types';

const CHECKOUT_PHRASES = [
    'listo por hoy',
    'termino',
    'me desconecto',
    'hasta mañana',
    'fin del turno',
    'paro',
    'salgo',
    'ya termine',
    'termine por hoy',
    'me voy',
];

const CHECKIN_HINTS = ['disponible', 'activo', 'empiezo', 'online', 'check in', 'checkin', 'conectado'];

const DEFAULT_SHIFT_TTL_SEC = 12 * 3600;
const MIN_SHIFT_TTL_SEC = 3600;
const MAX_SHIFT_TTL_SEC = 16 * 3600;

/** TTL Redis hasta fin de turno según `provider_schedules` (Buenos Aires), o default. */
export async function getShiftEndTtlSeconds(providerId: string): Promise<number> {
    const rows = await prisma.$queryRaw<{ shift_end: string }[]>`
        SELECT shift_end::text AS shift_end
        FROM provider_schedules
        WHERE provider_id = ${providerId} AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
    `;
    const raw = rows[0]?.shift_end;
    if (!raw) return DEFAULT_SHIFT_TTL_SEC;

    const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
    if (!m) return DEFAULT_SHIFT_TTL_SEC;
    const endH = parseInt(m[1]!, 10);
    const endM = parseInt(m[2]!, 10);
    const endMins = endH * 60 + endM;

    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p: Intl.DateTimeFormatPart) => p.type === 'hour')?.value || '0', 10);
    const min = parseInt(parts.find((p: Intl.DateTimeFormatPart) => p.type === 'minute')?.value || '0', 10);
    const nowMins = h * 60 + min;

    let diffMins = endMins - nowMins;
    if (diffMins <= 0) diffMins += 24 * 60;

    const sec = diffMins * 60;
    return Math.min(Math.max(sec, MIN_SHIFT_TTL_SEC), MAX_SHIFT_TTL_SEC);
}

export async function markProfessionalBusy(professionalId: string): Promise<void> {
    try {
        const ttl = await getShiftEndTtlSeconds(professionalId);
        await redis.set(`provider:status:${professionalId}`, 'busy', 'EX', ttl);
    } catch {
        /* */
    }
}

/** Al rechazar un trabajo, volver a un estado no ocupado si seguía en busy. */
export async function clearProfessionalBusyIfNeeded(professionalId: string): Promise<void> {
    try {
        const cur = await redis.get(`provider:status:${professionalId}`);
        if (cur !== 'busy') return;
        const ttl = await getShiftEndTtlSeconds(professionalId);
        await redis.set(`provider:status:${professionalId}`, 'inactive', 'EX', ttl);
    } catch {
        /* */
    }
}

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

function matchesCheckout(normalized: string): boolean {
    return CHECKOUT_PHRASES.some((phrase) => fuzzyPhrase(normalized, phrase));
}

function matchesCheckin(normalized: string): boolean {
    return CHECKIN_HINTS.some((h) => normalized.includes(h));
}

async function setProviderStatus(providerId: string, status: ProviderLiveStatus, ttlSec = DEFAULT_SHIFT_TTL_SEC) {
    try {
        await redis.set(`provider:status:${providerId}`, status, 'EX', ttlSec);
    } catch {
        /* */
    }
}

async function clearSessionKeys(providerId: string) {
    try {
        await redis.del(`provider:session:${providerId}`);
        await redis.del(`provider:location:${providerId}`);
        await redis.set(`provider:status:${providerId}`, 'inactive', 'EX', DEFAULT_SHIFT_TTL_SEC);
    } catch {
        /* */
    }
}

export interface AvailabilityProcessInput {
    professional: Professional;
    body: string;
    messageType: string;
    lat?: number;
    lng?: number;
}

/**
 * Devuelve true si el mensaje fue manejado aquí (check-in/out/ubicación) y no debe seguir al bot profesional.
 */
export async function processAvailabilityMessage(input: AvailabilityProcessInput): Promise<boolean> {
    const { professional, body, messageType, lat, lng } = input;
    const raw = (body || '').trim();

    if (raw.startsWith('job_accept_') || raw.startsWith('job_reject_')) return false;
    if (raw === '1' || raw === '2') return false;

    const normalized = raw.toLowerCase();

    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        const payload = JSON.stringify({ lat, lng, updatedAt: new Date().toISOString() });
        const shiftTtl = await getShiftEndTtlSeconds(professional.id);
        try {
            await redis.set(`provider:location:${professional.id}`, payload, 'EX', 3600);
            const cur = await redis.get(`provider:status:${professional.id}`);
            const status: ProviderLiveStatus =
                cur === 'busy' ? 'busy' : cur === 'active_no_location' || cur === 'active' ? 'active' : 'active';
            await setProviderStatus(professional.id, status, shiftTtl);
        } catch {
            /* */
        }
        await WhatsAppService.sendTextMessage(
            professional.phone,
            'Ubicación actualizada. Los clientes van a ver tu disponibilidad con mejor precisión de tiempo estimado.'
        );
        await insertAgentLog({
            agent: 'availability',
            event: 'location_update',
            level: 'info',
            entityType: 'provider',
            entityId: professional.id,
            details: { lat, lng },
        });
        return true;
    }

    if (messageType === 'image' || normalized.startsWith('http')) return false;

    if (matchesCheckout(normalized)) {
        await clearSessionKeys(professional.id);
        const today = new Date().toISOString().slice(0, 10);
        try {
            await prisma.$executeRawUnsafe(
                `UPDATE provider_sessions
                 SET session_end = now(), checkout_trigger = 'provider_message'
                 WHERE provider_id = $1 AND date = $2::date AND session_end IS NULL`,
                professional.id,
                today
            );
        } catch {
            /* tabla puede no tener fila */
        }
        await WhatsAppService.sendTextMessage(professional.phone, 'Listo, te marcamos como desconectado. Cuando vuelvas, avisá con un “disponible”.');
        await insertAgentLog({
            agent: 'availability',
            event: 'checkout',
            level: 'info',
            entityType: 'provider',
            entityId: professional.id,
        });
        return true;
    }

    if (matchesCheckin(normalized)) {
        const hasLoc = await redis.get(`provider:location:${professional.id}`);
        const status: ProviderLiveStatus = hasLoc ? 'active' : 'active_no_location';
        const shiftTtl = await getShiftEndTtlSeconds(professional.id);
        await setProviderStatus(professional.id, status, shiftTtl);
        const sid = randomUUID();
        try {
            await redis.set(
                `provider:session:${professional.id}`,
                JSON.stringify({ sessionId: sid, startedAt: new Date().toISOString(), jobsCount: 0 }),
                'EX',
                shiftTtl
            );
        } catch {
            /* */
        }
        try {
            await prisma.$executeRawUnsafe(
                `INSERT INTO provider_sessions (provider_id, date, checkin_response, session_start, had_location)
                 SELECT $1, CURRENT_DATE, 'available', now(), $2
                 WHERE NOT EXISTS (
                   SELECT 1 FROM provider_sessions ps
                   WHERE ps.provider_id = $1 AND ps.date = CURRENT_DATE AND ps.session_end IS NULL
                 )`,
                professional.id,
                Boolean(hasLoc)
            );
        } catch {
            /* */
        }
        await WhatsAppService.sendTextMessage(
            professional.phone,
            'Perfecto, quedás como disponible. Si podés, compartí ubicación en vivo para mejores tiempos estimados para el cliente.'
        );
        await insertAgentLog({
            agent: 'availability',
            event: 'checkin',
            level: 'info',
            entityType: 'provider',
            entityId: professional.id,
            details: { status },
        });
        return true;
    }

    return false;
}

/** Facade para `import { availabilityAgent }` desde controllers. */
export const availabilityAgent = {
    getShiftEndTtlSeconds,
    markProfessionalBusy,
    clearProfessionalBusyIfNeeded,
    processAvailabilityMessage,
};
