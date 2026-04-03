import cron from 'node-cron';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';

export const startCronJobs = () => {
    cron.schedule('*/5 * * * *', async () => {
        console.log('[CRON] Ofertas sin cotizar > 30 min...');
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

        try {
            const expiredOffers = await prisma.jobOffer.findMany({
                where: {
                    status: 'pending',
                    created_at: { lt: thirtyMinsAgo },
                },
                include: {
                    service_request: { include: { user: true } },
                    professional: true,
                },
            });

            const userNotifiedRequests = new Set<string>();

            for (const offer of expiredOffers) {
                await prisma.jobOffer.update({
                    where: { id: offer.id },
                    data: { status: 'cancelled' },
                });

                if (offer.professional) {
                    await WhatsAppService.sendTextMessage(
                        offer.professional.phone,
                        'La oportunidad de trabajo expiró (30 min sin cotizar).'
                    );
                }

                const pendingLeft = await prisma.jobOffer.count({
                    where: { request_id: offer.request_id, status: 'pending' },
                });

                if (pendingLeft === 0 && !userNotifiedRequests.has(offer.request_id)) {
                    userNotifiedRequests.add(offer.request_id);
                    await prisma.serviceRequest.update({
                        where: { id: offer.request_id },
                        data: { status: 'cancelled' },
                    });
                    const u = offer.service_request.user;
                    if (u) {
                        await WhatsAppService.sendTextMessage(
                            u.phone,
                            'No pudimos conseguir una cotización a tiempo para tu solicitud. Podés intentar de nuevo cuando quieras.'
                        );
                    }
                }
            }
        } catch (error) {
            console.error('[CRON Error] Ofertas expiradas:', error);
        }
    });

    /** Recordatorio 1–2h antes de scheduled_at (usuario + profesional). */
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Recordatorios por scheduled_at...');
        const now = new Date();
        const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        try {
            const jobs = await prisma.job.findMany({
                where: {
                    reminder_sent: false,
                    scheduled_at: { not: null, gte: now, lte: inTwoHours },
                    status: { in: ['confirmed', 'in_progress'] },
                },
                include: {
                    quotation: {
                        include: {
                            job_offer: {
                                include: { professional: true, service_request: { include: { user: true } } },
                            },
                        },
                    },
                },
            });

            for (const job of jobs) {
                const pro = job.quotation.job_offer.professional;
                const userPhone = job.quotation.job_offer.service_request.user?.phone;
                const when = job.scheduled_at ? job.scheduled_at.toLocaleString('es-AR') : 'pronto';

                if (userPhone) {
                    await WhatsAppService.sendTextMessage(
                        userPhone,
                        `🔔 Servy: recordatorio — tenés un servicio programado (${when}).`
                    );
                }
                await WhatsAppService.sendTextMessage(
                    pro.phone,
                    `🔔 Servy: recordatorio — trabajo con cliente, turno aprox. ${when}.`
                );

                await prisma.job.update({
                    where: { id: job.id },
                    data: { reminder_sent: true },
                });
            }
        } catch (error) {
            console.error('[CRON Error] Recordatorios:', error);
        }
    });

    console.log('[CRON] Tareas programadas inicializadas.');
};
