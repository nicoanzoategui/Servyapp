import { prisma } from '@servy/db';
import { buildProfileCompletionFromDbRow } from './professional-profile-completion.service';
import { normalizeTwilioWhatsAppFrom } from '../utils/twilio-phone';
import type { ServicePriority } from './visit-pricing';

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
        const userAddress = request.address || '';

        const categoryFilter = MATCHING_BYPASS_PHONE_DIGITS
            ? {
                  OR: [
                      { categories: { has: request.category || '' } },
                      { phone: MATCHING_BYPASS_PHONE_DIGITS },
                  ],
              }
            : { categories: { has: request.category || '' } };

        const professionals = await prisma.professional.findMany({
            where: {
                status: 'active',
                id: excludeProfessionalIds.length ? { notIn: excludeProfessionalIds } : undefined,
                ...categoryFilter,
            },
            select: professionalMatchSelect,
        });

        const profileComplete = professionals.filter((p) => {
            if (isMatchingBypassPhone(p.phone)) return true;
            const { documents, ...rest } = p;
            return buildProfileCompletionFromDbRow(rest, documents).complete;
        });

        const matched = profileComplete.filter((p) => {
            if (isMatchingBypassPhone(p.phone)) return true;
            if (!p.zones || p.zones.length === 0) return true;
            return p.zones.some(
                (zone) =>
                    zone.trim() === userPostalCode.trim() ||
                    userAddress.toLowerCase().includes(zone.toLowerCase()) ||
                    zone.toLowerCase().includes(userPostalCode.toLowerCase())
            );
        });

        const filtered = matched.filter((p) => {
            if (isMatchingBypassPhone(p.phone)) return true;
            return priority === 'urgent' ? p.is_urgent : p.is_scheduled;
        });

        return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
