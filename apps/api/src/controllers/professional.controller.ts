import { Request, Response } from 'express';
import { prisma } from '@servy/db';
import { StorageService } from '../services/storage.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { ConversationService } from '../services/conversation.service';

function normalizeQuoteBody(body: any) {
    let items = body.items;
    let total_price = body.total_price != null ? Number(body.total_price) : NaN;
    const description = body.description ?? '';
    const estimated_duration = body.estimated_duration ?? '';

    if ((!items || !Array.isArray(items) || items.length === 0) && !Number.isNaN(total_price)) {
        items = [{ description: description || 'Servicio', price: total_price }];
    }
    if (!Array.isArray(items) || items.length === 0) return null;

    items = items.map((i: any) => ({
        description: String(i.description ?? ''),
        price: Number(i.price),
    }));
    if (items.some((i: { price: number }) => Number.isNaN(i.price))) return null;

    const computed = items.reduce((s: number, i: { price: number }) => s + i.price, 0);
    if (Number.isNaN(total_price) || total_price <= 0) total_price = computed;

    return { items, total_price, description, estimated_duration };
}

export const getDashboard = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;

        const pendingOffers = await prisma.jobOffer.count({
            where: { professional_id: professionalId, status: 'pending' },
        });

        const confirmedJobs = await prisma.job.count({
            where: {
                quotation: { job_offer: { professional_id: professionalId } },
                status: 'confirmed',
            },
        });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const earningsAgg = await prisma.earning.aggregate({
            where: {
                professional_id: professionalId,
                transferred_at: { gte: startOfMonth },
            },
            _sum: { gross_amount: true, net_amount: true },
        });

        const professional = await prisma.professional.findUnique({
            where: { id: professionalId },
            select: { rating: true },
        });

        res.json({
            success: true,
            data: {
                pending_quotes: pendingOffers,
                upcoming_jobs: confirmedJobs,
                month_earnings: {
                    gross: earningsAgg._sum.gross_amount || 0,
                    net: earningsAgg._sum.net_amount || 0,
                    commission: (earningsAgg._sum.gross_amount || 0) - (earningsAgg._sum.net_amount || 0),
                },
                rating: professional?.rating || 0,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching dashboard' } });
    }
};

export const getJobs = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { status, page = '1', limit = '10' } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const matchQuery: any = { quotation: { job_offer: { professional_id: professionalId } } };
        if (status) {
            matchQuery.status = String(status);
        }

        const jobs = await prisma.job.findMany({
            where: matchQuery,
            skip,
            take,
            include: {
                quotation: {
                    include: { job_offer: { include: { service_request: true } } },
                },
            },
        });

        res.json({ success: true, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching jobs' } });
    }
};

export const getJobDetail = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { jobId } = req.params;

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                quotation: {
                    include: { job_offer: { include: { service_request: true } } },
                },
            },
        });

        if (!job || job.quotation.job_offer.professional_id !== professionalId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
        }

        // Hide details conditionally
        const isConfirmed = ['confirmed', 'in_progress', 'completed'].includes(job.status);
        const detail = {
            ...job,
            quotation: {
                ...job.quotation,
                job_offer: {
                    ...job.quotation.job_offer,
                    service_request: {
                        ...job.quotation.job_offer.service_request,
                        address: isConfirmed ? job.quotation.job_offer.service_request.address : null,
                        photos: job.quotation.job_offer.service_request.photos,
                        description: job.quotation.job_offer.service_request.description,
                    },
                },
            },
        };

        res.json({ success: true, data: detail });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching job detail' } });
    }
};

/** Ofertas pendientes / en cotización para el portal (no confundir con `Job` post-pago). */
export const getJobOffers = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { status, page = '1', limit = '20' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where: any = { professional_id: professionalId };
        if (status) where.status = String(status);

        const offers = await prisma.jobOffer.findMany({
            where,
            skip,
            take,
            orderBy: { created_at: 'desc' },
            include: {
                service_request: {
                    include: {
                        user: { select: { name: true, last_name: true, address: true, phone: true } },
                    },
                },
            },
        });

        const shaped = offers.map((o) => {
            const hideAddress = o.status === 'pending' || o.status === 'quoted';
            const sr = o.service_request;
            return {
                ...o,
                service_request: {
                    ...sr,
                    user: sr.user
                        ? {
                              ...sr.user,
                              address: hideAddress ? null : sr.user.address,
                          }
                        : null,
                    address: hideAddress ? null : sr.address,
                },
            };
        });

        res.json({ success: true, data: shaped });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching offers' } });
    }
};

export const getJobOfferDetail = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { offerId } = req.params;

        const offer = await prisma.jobOffer.findUnique({
            where: { id: offerId },
            include: {
                service_request: {
                    include: {
                        user: { select: { name: true, last_name: true, address: true, phone: true } },
                    },
                },
                quotations: true,
            },
        });

        if (!offer || offer.professional_id !== professionalId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });
        }

        const hideAddress = offer.status === 'pending' || offer.status === 'quoted';
        const sr = offer.service_request;
        const detail = {
            ...offer,
            service_request: {
                ...sr,
                user: sr.user
                    ? {
                          ...sr.user,
                          address: hideAddress ? null : sr.user.address,
                      }
                    : null,
                address: hideAddress ? null : sr.address,
            },
        };

        res.json({ success: true, data: detail });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching offer' } });
    }
};

export const createQuote = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { jobOfferId } = req.params;
        const normalized = normalizeQuoteBody(req.body);
        if (!normalized) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'Se requiere items[] o total_price válido' },
            });
        }
        const { items, total_price, description, estimated_duration } = normalized;

        const offer = await prisma.jobOffer.findUnique({
            where: { id: jobOfferId },
            include: { service_request: true },
        });

        if (!offer || offer.professional_id !== professionalId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job offer not found' } });
        }

        if (offer.status === 'cancelled' || offer.status === 'rejected') {
            return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Esta oferta ya no está activa' } });
        }

        const existing = await prisma.quotation.findUnique({ where: { job_offer_id: jobOfferId } });
        if (existing) {
            return res.status(400).json({ success: false, error: { code: 'ALREADY_QUOTED', message: 'Ya existe una cotización para esta oferta' } });
        }

        const quotation = await prisma.quotation.create({
            data: {
                job_offer_id: jobOfferId,
                items_json: items,
                total_price,
                description,
                estimated_duration,
                status: 'pending',
            },
        });

        await prisma.jobOffer.update({
            where: { id: jobOfferId },
            data: { status: 'quoted' },
        });

        await ConversationService.afterQuotationSent(offer.service_request.user_phone, {
            quotationId: quotation.id,
            jobOfferId,
            requestId: offer.request_id,
            totalPrice: total_price,
        });

        await WhatsAppService.sendButtonMessage(
            offer.service_request.user_phone,
            `¡Recibiste una cotización! Monto: $${total_price}. Detalle: ${description}.`,
            [
                { id: 'btn_accept', title: 'Aceptar' },
                { id: 'btn_reject', title: 'Rechazar' },
            ]
        );

        res.json({ success: true, data: quotation });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { zones, categories, is_urgent, is_scheduled, schedule_json, cbu_alias, mp_alias } = req.body;

        const updated = await prisma.professional.update({
            where: { id: professionalId },
            data: {
                zones,
                categories,
                is_urgent,
                is_scheduled,
                schedule_json,
                cbu_alias,
                mp_alias,
            },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error updating profile' } });
    }
};

export const getEarnings = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { page = '1', limit = '10' } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const earnings = await prisma.earning.findMany({
            where: { professional_id: professionalId },
            skip,
            take,
            orderBy: { transferred_at: 'desc' },
        });

        res.json({ success: true, data: earnings });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching earnings' } });
    }
};

export const getEarningsSummary = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const histAgg = await prisma.earning.aggregate({
            where: { professional_id: professionalId },
            _sum: { net_amount: true },
        });

        const monthAgg = await prisma.earning.aggregate({
            where: { professional_id: professionalId, transferred_at: { gte: startOfMonth } },
            _sum: { net_amount: true },
        });

        // Let's assume available balance is those not transferred.
        // In our model transferred_at signifies it was transferred. If null, it's available.
        const availableAgg = await prisma.earning.aggregate({
            where: { professional_id: professionalId, transferred_at: null },
            _sum: { net_amount: true },
        });

        res.json({
            success: true,
            data: {
                available: availableAgg._sum.net_amount || 0,
                month_total: monthAgg._sum.net_amount || 0,
                historical_total: histAgg._sum.net_amount || 0,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching summary' } });
    }
};

export const generateReceipt = async (req: Request, res: Response) => {
    try {
        const { earningId } = req.params;
        const professionalId = req.user!.userId;

        const earning = await prisma.earning.findUnique({
            where: { id: earningId },
        });

        if (!earning || earning.professional_id !== professionalId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Earning not found' } });
        }

        // Usually we would generate PDF, upload to R2, and get signed URL
        // const doc = await PDFDocument.create();
        // const page = doc.addPage();
        // page.drawText(`Comprobante de Earning: $${earning.net_amount}`, { x: 50, y: 700 });
        // const pdfBytes = await doc.save();
        // await R2.putObject({ Bucket: env.R2_BUCKET, Key: `receipts/${earningId}.pdf`, Body: pdfBytes })

        const signedUrl = await StorageService.getReceiptPresignedUrl(earningId);

        res.json({ success: true, data: { url: signedUrl } });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error generating receipt' } });
    }
};

export const completeJob = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { jobId } = req.params;

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                quotation: {
                    include: { job_offer: { include: { service_request: true } } },
                },
            },
        });

        if (!job || job.quotation.job_offer.professional_id !== professionalId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
        }

        const updated = await prisma.job.update({
            where: { id: jobId },
            data: { status: 'completed', completed_at: new Date() },
        });

        const userPhone = job.quotation.job_offer.service_request.user_phone;
        await WhatsAppService.sendTextMessage(
            userPhone,
            `El trabajo ha sido marcado como completado. ¡Gracias por usar Servy! Pronto te pediremos que dejes una calificación.`
        );

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error completing job' } });
    }
};
