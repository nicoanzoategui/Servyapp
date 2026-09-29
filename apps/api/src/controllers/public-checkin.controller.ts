import { Request, Response } from 'express';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { ProfessionalMatchingService } from '../services/matching.service';

const GENERIC_FAIL = 'No pudimos validar este código.';

function isValidToken(token: string): boolean {
    return /^[A-Za-z0-9_-]{8,80}$/.test(token);
}

function formatConfirmedAt(d: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
    }).format(d);
}

async function loadCheckinJob(token: string) {
    return prisma.job.findUnique({
        where: { qr_token: token },
        include: {
            quotation: {
                include: {
                    job_offer: {
                        include: {
                            professional: { select: { name: true, last_name: true, phone: true } },
                            service_request: { select: { user_phone: true, category: true, address: true } },
                        },
                    },
                },
            },
        },
    });
}

function publicPayload(job: NonNullable<Awaited<ReturnType<typeof loadCheckinJob>>>) {
    const offer = job.quotation.job_offer;
    const professionalName = ProfessionalMatchingService.formatProName(offer.professional);
    return {
        professionalName,
        address: offer.service_request.address || null,
        category: offer.service_request.category || 'Servicio',
        alreadyConfirmed: Boolean(job.arrival_confirmed_at),
        confirmedAt: job.arrival_confirmed_at ? job.arrival_confirmed_at.toISOString() : null,
        confirmedAtLabel: job.arrival_confirmed_at ? formatConfirmedAt(job.arrival_confirmed_at) : null,
    };
}

export const getCheckin = async (req: Request, res: Response) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!isValidToken(token)) {
            return res.status(404).json({ success: false, error: { message: GENERIC_FAIL } });
        }
        const job = await loadCheckinJob(token);
        if (!job || !job.quotation.job_offer.professional) {
            return res.status(404).json({ success: false, error: { message: GENERIC_FAIL } });
        }
        return res.json({ success: true, data: publicPayload(job) });
    } catch (err) {
        console.error('[checkin] GET failed', err);
        return res.status(404).json({ success: false, error: { message: GENERIC_FAIL } });
    }
};

export const confirmCheckin = async (req: Request, res: Response) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!isValidToken(token)) {
            return res.status(404).json({ success: false, error: { message: GENERIC_FAIL } });
        }

        const job = await loadCheckinJob(token);
        if (!job || !job.quotation.job_offer.professional) {
            return res.status(404).json({ success: false, error: { message: GENERIC_FAIL } });
        }

        if (job.arrival_confirmed_at) {
            return res.json({ success: true, data: publicPayload(job) });
        }

        const now = new Date();
        const updated = await prisma.job.updateMany({
            where: { id: job.id, arrival_confirmed_at: null },
            data: { arrival_confirmed_at: now },
        });

        const offer = job.quotation.job_offer;
        const professionalName = ProfessionalMatchingService.formatProName(offer.professional);
        const fresh = await loadCheckinJob(token);
        const payload = fresh ? publicPayload(fresh) : { ...publicPayload(job), alreadyConfirmed: true, confirmedAt: now.toISOString(), confirmedAtLabel: formatConfirmedAt(now) };

        if (updated.count === 1) {
            const proPhone = offer.professional?.phone;
            const userPhone = offer.service_request.user_phone;
            if (proPhone) {
                await WhatsAppService.sendTextMessage(
                    proPhone,
                    '✅ Confirmaste tu llegada. Avanzá con la visita.'
                );
            }
            if (userPhone) {
                await WhatsAppService.sendTextMessage(
                    userPhone,
                    `✅ Tu técnico *${professionalName}* llegó y confirmó la visita.\n\nGracias por confiar en Servy 🙏`
                );
            }
        }

        return res.json({ success: true, data: payload });
    } catch (err) {
        console.error('[checkin] POST failed', err);
        return res.status(404).json({ success: false, error: { message: GENERIC_FAIL } });
    }
};
