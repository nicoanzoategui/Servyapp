import { Request, Response } from 'express';
import { prisma, Prisma } from '@servy/db';
import { StorageService } from '../services/storage.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { ConversationService } from '../services/conversation.service';
import { QRService } from '../services/qr.service';
import { availabilityAgent } from '../agents/availability-agent';
import {
    buildProfileCompletionFromDbRow,
    recomputeProfileOperationalCompleteAndNotify,
} from '../services/professional-profile-completion.service';

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

const PROFESSIONAL_PROFILE_SELECT = {
    name: true,
    last_name: true,
    email: true,
    phone: true,
    dni: true,
    categories: true,
    zones: true,
    onboarding_completed: true,
    cbu_alias: true,
    mp_alias: true,
    is_urgent: true,
    is_scheduled: true,
    status: true,
    schedule_json: true,
    address: true,
    postal_code: true,
    bio: true,
    skills: true,
    after_hours_available: true,
    payout_institution: true,
    payout_account_type: true,
    tax_id: true,
} as const;

const PAYOUT_ACCOUNT_TYPES = new Set(['cbu', 'cvu', 'alias', 'mercadopago', 'wallet_other']);

function trimOrUndef(val: unknown, maxLen: number): string | undefined {
    if (val === undefined) return undefined;
    if (typeof val !== 'string') return undefined;
    const t = val.trim();
    if (!t) return undefined;
    return t.slice(0, maxLen);
}

function trimOrNull(val: unknown, maxLen: number): string | null | undefined {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== 'string') return undefined;
    const t = val.trim();
    if (!t) return null;
    return t.slice(0, maxLen);
}

function parseStringArray(val: unknown, maxItems: number, maxItemLen: number): string[] | undefined {
    if (val === undefined) return undefined;
    if (!Array.isArray(val)) return undefined;
    return val
        .map((v) => String(v).trim())
        .filter(Boolean)
        .slice(0, maxItems)
        .map((s) => s.slice(0, maxItemLen));
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
            select: {
                rating: true,
                onboarding_completed: true,
                name: true,
                last_name: true,
                dni: true,
                address: true,
                postal_code: true,
                zones: true,
                categories: true,
                cbu_alias: true,
                mp_alias: true,
                is_urgent: true,
                is_scheduled: true,
                bio: true,
                skills: true,
                payout_institution: true,
                payout_account_type: true,
                profile_operational_complete: true,
                documents: { select: { kind: true } },
            },
        });

        let profile_completion = {
            complete: false,
            percent: 0,
            done_steps: 0,
            total_steps: 0,
            missing_sample: [] as string[],
            missing_count: 0,
        };

        if (professional) {
            const { documents, rating: _r, onboarding_completed: _ob, profile_operational_complete: _poc, ...pf } =
                professional;
            const evald = buildProfileCompletionFromDbRow(pf, documents);
            profile_completion = {
                complete: evald.complete,
                percent: evald.percent,
                done_steps: evald.items.filter((i) => i.done).length,
                total_steps: evald.items.length,
                missing_sample: evald.missing_labels.slice(0, 4),
                missing_count: evald.missing_labels.length,
            };
        }

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
                onboarding_completed: professional?.onboarding_completed ?? false,
                zones: professional?.zones ?? [],
                cbu_alias: professional?.cbu_alias ?? null,
                is_urgent: professional?.is_urgent ?? false,
                is_scheduled: professional?.is_scheduled ?? false,
                profile_operational_complete: professional?.profile_operational_complete ?? false,
                profile_completion,
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

export const getProfile = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const pro = await prisma.professional.findUnique({
            where: { id: professionalId },
            select: PROFESSIONAL_PROFILE_SELECT,
        });
        if (!pro) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profesional no encontrado' } });
        }
        res.json({ success: true, data: pro });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error al cargar perfil' } });
    }
};

export const completeOnboarding = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { name, last_name, categories } = req.body;
        if (!name || !last_name || !Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Nombre, apellido y al menos un oficio son requeridos' },
            });
        }
        await prisma.professional.update({
            where: { id: professionalId },
            data: {
                name: String(name).trim(),
                last_name: String(last_name).trim(),
                categories: categories.map((c: unknown) => String(c).trim()).filter(Boolean),
                onboarding_completed: true,
                onboarding_step: 1,
            },
        });
        await recomputeProfileOperationalCompleteAndNotify(professionalId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error al completar onboarding' } });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const b = req.body as Record<string, unknown>;
        const data: Prisma.ProfessionalUpdateInput = {};

        const name = trimOrUndef(b.name, 120);
        if (name !== undefined) data.name = name;

        const lastName = trimOrUndef(b.last_name, 120);
        if (lastName !== undefined) data.last_name = lastName;

        const dni = trimOrNull(b.dni, 32);
        if (dni !== undefined) data.dni = dni;

        const zones = parseStringArray(b.zones, 40, 120);
        if (zones !== undefined) data.zones = zones;

        const categories = parseStringArray(b.categories, 20, 80);
        if (categories !== undefined) data.categories = categories;

        if (typeof b.is_urgent === 'boolean') data.is_urgent = b.is_urgent;
        if (typeof b.is_scheduled === 'boolean') data.is_scheduled = b.is_scheduled;
        if (typeof b.after_hours_available === 'boolean') data.after_hours_available = b.after_hours_available;

        if ('schedule_json' in b) {
            const s = b.schedule_json;
            if (s === null) {
                data.schedule_json = Prisma.DbNull;
            } else if (typeof s === 'object' && s !== null && !Array.isArray(s)) {
                data.schedule_json = s as Prisma.InputJsonValue;
            } else if (s !== undefined) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'schedule_json debe ser un objeto o null' },
                });
            }
        }

        const address = trimOrNull(b.address, 500);
        if (address !== undefined) data.address = address;

        const postalCode = trimOrNull(b.postal_code, 16);
        if (postalCode !== undefined) data.postal_code = postalCode;

        const bioRaw = trimOrNull(b.bio, 2000);
        if (bioRaw !== undefined) data.bio = bioRaw;

        const skills = parseStringArray(b.skills, 40, 80);
        if (skills !== undefined) data.skills = skills;

        const cbu = trimOrNull(b.cbu_alias, 64);
        if (cbu !== undefined) data.cbu_alias = cbu;

        const mp = trimOrNull(b.mp_alias, 120);
        if (mp !== undefined) data.mp_alias = mp;

        const institution = trimOrNull(b.payout_institution, 120);
        if (institution !== undefined) data.payout_institution = institution;

        if ('payout_account_type' in b) {
            const raw = b.payout_account_type;
            if (raw === null || raw === '') {
                data.payout_account_type = null;
            } else if (typeof raw === 'string') {
                const low = raw.trim().toLowerCase();
                if (!PAYOUT_ACCOUNT_TYPES.has(low)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: `Tipo de cuenta inválido. Usá: ${[...PAYOUT_ACCOUNT_TYPES].join(', ')}`,
                        },
                    });
                }
                data.payout_account_type = low;
            }
        }

        if ('tax_id' in b) {
            const raw = b.tax_id;
            if (raw === null) {
                data.tax_id = null;
            } else if (typeof raw === 'string') {
                const digits = raw.replace(/\D/g, '');
                if (!digits) {
                    data.tax_id = null;
                } else if (digits.length !== 11) {
                    return res.status(400).json({
                        success: false,
                        error: { code: 'VALIDATION_ERROR', message: 'CUIT/CUIL debe tener 11 dígitos' },
                    });
                } else {
                    data.tax_id = digits;
                }
            }
        }

        if (Object.keys(data).length === 0) {
            const current = await prisma.professional.findUnique({
                where: { id: professionalId },
                select: PROFESSIONAL_PROFILE_SELECT,
            });
            await recomputeProfileOperationalCompleteAndNotify(professionalId);
            return res.json({ success: true, data: current });
        }

        const updated = await prisma.professional.update({
            where: { id: professionalId },
            data,
            select: PROFESSIONAL_PROFILE_SELECT,
        });

        await recomputeProfileOperationalCompleteAndNotify(professionalId);
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

export const completeJobByQr = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { jobId } = req.params;
        const { qrData } = req.body as { qrData?: string };
        if (!qrData || typeof qrData !== 'string') {
            return res.status(400).json({ success: false, error: { message: 'qrData requerido' } });
        }
        const scannedJobId = QRService.parseQR(qrData.trim());
        if (!scannedJobId || scannedJobId !== jobId) {
            return res.status(400).json({ success: false, error: { message: 'QR inválido' } });
        }
        const existing = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                quotation: {
                    include: { job_offer: { include: { professional: true, service_request: true } } },
                },
            },
        });
        if (!existing || existing.quotation.job_offer.professional_id !== professionalId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
        }
        if (existing.status === 'completed') {
            return res.status(400).json({ success: false, error: { message: 'El trabajo ya estaba completado' } });
        }
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'completed', completed_at: new Date() },
        });
        await availabilityAgent.clearProfessionalBusyIfNeeded(professionalId);
        const userPhone = existing.quotation.job_offer.service_request.user_phone;
        const proPhone = existing.quotation.job_offer.professional.phone;
        await WhatsAppService.sendTextMessage(
            proPhone,
            '✅ QR del cliente validado. Trabajo marcado como completado. ¡Gracias por usar Servy!'
        );
        const endUser = await prisma.user.findUnique({ where: { phone: userPhone } });
        const nm = endUser?.name?.trim();
        await WhatsAppService.sendTextMessage(
            userPhone,
            `✅${nm ? ` ${nm},` : ''} el servicio quedó completado.\n\n¡Gracias por usar Servy!\n\n¿Cómo calificarías el servicio?\n\n⭐ ⭐⭐ ⭐⭐⭐ ⭐⭐⭐⭐ ⭐⭐⭐⭐⭐`
        );
        await ConversationService.beginReviewPrompt(userPhone, jobId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error al completar' } });
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
        await availabilityAgent.clearProfessionalBusyIfNeeded(professionalId);

        const userPhone = job.quotation.job_offer.service_request.user_phone;
        await WhatsAppService.sendTextMessage(
            userPhone,
            `El trabajo ha sido marcado como completado. ¡Gracias por usar Servy!\n\n¿Cómo calificarías el servicio?\n\n⭐ ⭐⭐ ⭐⭐⭐ ⭐⭐⭐⭐ ⭐⭐⭐⭐⭐`
        );
        await ConversationService.beginReviewPrompt(userPhone, jobId);

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error completing job' } });
    }
};
