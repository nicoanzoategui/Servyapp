import { prisma } from '@servy/db';
import { buildProfileCompletionFromDbRow } from './professional-profile-completion.service';
import { normalizeTwilioWhatsAppFrom } from '../utils/twilio-phone';
import type { ServicePriority } from './visit-pricing';
import { categoryMatches, foldText } from './service-categories';

/** Técnico de prueba (solo non-production): ignora perfil incompleto, zona/categoría. */
const MATCHING_BYPASS_PHONE_DIGITS =
    process.env.NODE_ENV !== 'production' ? '5491154142169' : null;

function isMatchingBypassPhone(phone: string | null | undefined): boolean {
    if (!MATCHING_BYPASS_PHONE_DIGITS) return false;
    const d = normalizeTwilioWhatsAppFrom(phone || '') || String(phone || '').replace(/\D/g, '');
    return d === MATCHING_BYPASS_PHONE_DIGITS;
}

const professionalMatchSelect = {
    id: true,
    phone: true,
    categories: true,
    zones: true,
    is_urgent: true,
    is_scheduled: true,
    rating: true,
    name: true,
    last_name: true,
    dni: true,
    address: true,
    postal_code: true,
    bio: true,
    skills: true,
    cbu_alias: true,
    mp_alias: true,
    payout_institution: true,
    payout_account_type: true,
    documents: { select: { kind: true } },
} as const;

function isProfileComplete(p: {
    phone?: string | null;
    documents: { kind: string }[];
    [k: string]: unknown;
}): boolean {
    if (isMatchingBypassPhone(p.phone as string | undefined)) return true;
    const { documents, phone: _phone, ...rest } = p;
    return buildProfileCompletionFromDbRow(rest as Parameters<typeof buildProfileCompletionFromDbRow>[0], documents)
        .complete;
}

function zoneMatches(
    zones: string[] | null | undefined,
    userPostalCode: string,
    userAddress: string
): boolean {
    if (!zones || zones.length === 0) return true;
    const cp = foldText(userPostalCode);
    const addr = foldText(userAddress);
    return zones.some((zone) => {
        const z = foldText(zone);
        if (!z) return false;
        if (cp && (z === cp || z.includes(cp) || cp.includes(z))) return true;
        if (addr && (addr.includes(z) || z.includes(addr))) return true;
        return false;
    });
}

export class ProfessionalMatchingService {
    /** @deprecated Use checkCapacity / assignProfessional for visit flow */
    static async findProfessionalsAndCreateOffers(requestId: string) {
        const urgentOk = await this.checkCapacity(requestId, 'urgent');
        const schedOk = await this.checkCapacity(requestId, 'scheduled');
        return {
            urgent: urgentOk ? (await this.listCandidates(requestId, 'urgent'))[0] ?? null : null,
            scheduled: schedOk ? (await this.listCandidates(requestId, 'scheduled'))[0] ?? null : null,
        };
    }

    static async listCandidates(requestId: string, priority: ServicePriority, excludeProfessionalIds: string[] = []) {
        const request = await prisma.serviceRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });
        if (!request) return [];

        const userPostalCode = request.user?.postal_code || '';
        const userAddress = request.address || request.user?.address || '';

        const professionals = await prisma.professional.findMany({
            where: {
                status: 'active',
                id: excludeProfessionalIds.length ? { notIn: excludeProfessionalIds } : undefined,
            },
            select: professionalMatchSelect,
        });

        const matched = professionals.filter((p) => {
            if (isMatchingBypassPhone(p.phone)) return true;
            if (!categoryMatches(p.categories, request.category)) return false;
            if (!zoneMatches(p.zones, userPostalCode, userAddress)) return false;
            return priority === 'urgent' ? p.is_urgent : p.is_scheduled;
        });

        return matched.sort((a, b) => {
            const completeDelta = Number(isProfileComplete(b)) - Number(isProfileComplete(a));
            if (completeDelta !== 0) return completeDelta;
            return (b.rating || 0) - (a.rating || 0);
        });
    }

    static async checkCapacity(requestId: string, priority: ServicePriority): Promise<boolean> {
        const list = await this.listCandidates(requestId, priority);
        return list.length > 0;
    }

    /** Creates a single pending JobOffer for the best available professional. */
    static async assignProfessional(
        requestId: string,
        priority: ServicePriority,
        schedule: string | null,
        excludeProfessionalIds: string[] = []
    ) {
        const candidates = await this.listCandidates(requestId, priority, excludeProfessionalIds);
        const pro = candidates[0];
        if (!pro) return null;

        const offer = await prisma.jobOffer.create({
            data: {
                request_id: requestId,
                professional_id: pro.id,
                priority,
                status: 'pending',
                schedule,
            },
            include: { professional: true },
        });

        return offer;
    }

    static async cancelOffersForRequest(requestId: string, exceptOfferId?: string) {
        await prisma.jobOffer.updateMany({
            where: {
                request_id: requestId,
                ...(exceptOfferId ? { id: { not: exceptOfferId } } : {}),
                status: { in: ['pending', 'held'] },
            },
            data: { status: 'cancelled' },
        });
    }

    static formatProName(pro: { name: string; last_name: string }): string {
        return `${pro.name} ${pro.last_name}`.trim() || 'Tu técnico';
    }
}
