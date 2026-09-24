import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { MercadoPagoService } from '../services/mercadopago.service';
import { redis } from '../utils/redis';
import { StorageService } from '../services/storage.service';
import { assignTechnicianToServiceRequest } from '../services/manual-assignment.service';
import {
    deleteDocumentForProfessional,
    listDocumentsForProfessional,
    saveDocumentForProfessional,
} from '../services/professional-documents.service';

export const getDashboard = async (req: Request, res: Response) => {
    try {
        const activeConversations = await prisma.whatsappSession.count({
            where: { expires_at: { gt: new Date() } }
        });

        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        const delayedQuotes = await prisma.jobOffer.count({
            where: { status: 'pending', created_at: { lt: thirtyMinsAgo } }
        });

        const activePros = await prisma.professional.count({
            where: { status: 'active' }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay());

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [gmvDay, gmvWeek, gmvMonth] = await Promise.all([
            prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'approved', paid_at: { gte: today } } }),
            prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'approved', paid_at: { gte: firstDayOfWeek } } }),
            prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'approved', paid_at: { gte: firstDayOfMonth } } }),
        ]);

        const totalUsers = await prisma.user.count();

        res.json({
            success: true,
            data: {
                active_conversations: activeConversations,
                delayed_quotes: delayedQuotes,
                active_professionals: activePros,
                total_users: totalUsers,
                gmv: {
                    day: gmvDay._sum.amount || 0,
                    week: gmvWeek._sum.amount || 0,
                    month: gmvMonth._sum.amount || 0,
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching dashboard' } });
    }
};

export const getConversations = async (req: Request, res: Response) => {
    try {
        const sessions = await prisma.whatsappSession.findMany({
            orderBy: { expires_at: 'desc' },
        });
        res.json({
            success: true,
            data: sessions.map((s) => ({
                ...s,
                state: s.step,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching conversations' } });
    }
};

export const getConversationMessages = async (req: Request, res: Response) => {
    try {
        const { phone } = req.params;

        const user = await prisma.user.findUnique({
            where: { phone },
            select: { name: true, phone: true },
        });

        const professional = await prisma.professional.findUnique({
            where: { phone },
            select: { name: true, phone: true },
        });

        const session = await prisma.whatsappSession.findUnique({
            where: { phone },
        });

        const requests = await prisma.serviceRequest.findMany({
            where: { user_phone: phone },
            orderBy: { created_at: 'desc' },
            take: 20,
            select: {
                id: true,
                category: true,
                description: true,
                created_at: true,
            },
        });

        res.json({
            success: true,
            data: {
                user: user || professional,
                session: session ? { ...session, state: session.step } : null,
                requests,
                messages: [],
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error fetching messages' } });
    }
};

export const sendManualMessage = async (req: Request, res: Response) => {
    try {
        const { phone } = req.params;
        const { text } = req.body;
        await WhatsAppService.sendTextMessage(phone, text);
        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error sending message' } });
    }
};

// Professional CRUD
export const getProfessionals = async (req: Request, res: Response) => {
    try {
        const { status, category, zone } = req.query;
        const filter: any = {};
        if (status) filter.status = status;
        if (category) filter.categories = { has: category };
        if (zone) filter.zones = { has: zone };

        const pros = await prisma.professional.findMany({ where: filter });
        res.json({ success: true, data: pros });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const getProfessionalDetail = async (req: Request, res: Response) => {
    try {
        const pro = await prisma.professional.findUnique({ where: { id: req.params.id } });
        res.json({ success: true, data: pro });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const createProfessional = async (req: Request, res: Response) => {
    try {
        const body = { ...req.body } as Record<string, unknown>;
        if (typeof body.password === 'string' && body.password.length > 0) {
            body.password_hash = await bcrypt.hash(body.password as string, 12);
        }
        delete body.password;
        if (typeof body.password_hash !== 'string' || !body.password_hash) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'Se requiere password para crear el profesional' },
            });
        }
        const pro = await prisma.professional.create({
            data: body as Parameters<typeof prisma.professional.create>[0]['data'],
        });
        res.json({ success: true, data: pro });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const updateProfessional = async (req: Request, res: Response) => {
    try {
        const body = { ...req.body } as Record<string, unknown>;
        const pwd = typeof body.password === 'string' ? body.password : '';
        delete body.password;
        delete body.password_hash;
        if (pwd.length > 0) {
            body.password_hash = await bcrypt.hash(pwd, 12);
        }
        const pro = await prisma.professional.update({
            where: { id: req.params.id },
            data: body as Parameters<typeof prisma.professional.update>[0]['data'],
        });
        res.json({ success: true, data: pro });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const updateProfessionalStatus = async (req: Request, res: Response) => {
    try {
        const { status } = req.body; // active, suspended, pending
        const pro = await prisma.professional.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ success: true, data: pro });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

// Jobs
export const getJobs = async (req: Request, res: Response) => {
    try {
        const { status, category } = req.query;
        const filter: any = {};
        if (status) filter.status = status;
        if (category) filter.quotation = { job_offer: { service_request: { category } } };

        const jobs = await prisma.job.findMany({
            where: filter,
            orderBy: { updated_at: 'desc' },
            include: {
                quotation: {
                    include: {
                        payment: true,
                        job_offer: {
                            include: {
                                professional: {
                                    select: { id: true, name: true, last_name: true, phone: true },
                                },
                                service_request: {
                                    include: {
                                        user: { select: { name: true, last_name: true, phone: true } },
                                    },
                                },
                                quotations: { include: { payment: true } },
                            },
                        },
                    },
                },
            },
        });
        res.json({ success: true, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const getJobDetail = async (req: Request, res: Response) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: req.params.id },
            include: {
                quotation: { include: { job_offer: { include: { service_request: true, professional: true } } } }
            }
        });
        res.json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const reassignJob = async (req: Request, res: Response) => {
    try {
        const { new_professional_id } = req.body;
        // For a real reassignment, we might cancel the current job, and create a new service_request/job_offer flow
        // or manually update the job_offer. Wait, quotation and job_offer are linked tightly.
        // Assuming simple change in DB for demo purposes:
        const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: { quotation: true } });
        if (job) {
            await prisma.jobOffer.update({
                where: { id: job.quotation.job_offer_id },
                data: { professional_id: new_professional_id }
            });
        }
        res.json({ success: true, message: 'Job reassigned successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const refundJob = async (req: Request, res: Response) => {
    try {
        const payment = await prisma.payment.findFirst({ where: { quotation: { job: { id: req.params.id } } } });
        if (payment) {
            await MercadoPagoService.processRefund(payment.id);
        }
        res.json({ success: true, message: 'Refund initiated via MercadoPago' });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

// Finance
export const getFinanceSummary = async (req: Request, res: Response) => {
    try {
        const earningsAgg = await prisma.earning.aggregate({ _sum: { gross_amount: true, commission_pct: true, net_amount: true } });
        res.json({
            success: true,
            data: {
                total_gross: earningsAgg._sum.gross_amount || 0,
                total_net_professionals: earningsAgg._sum.net_amount || 0,
                total_commissions_retained: (earningsAgg._sum.gross_amount || 0) - (earningsAgg._sum.net_amount || 0)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const getPendingEarnings = async (req: Request, res: Response) => {
    try {
        const pending = await prisma.earning.findMany({ where: { transferred_at: null }, include: { professional: true, job: true } });
        res.json({ success: true, data: pending });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const processEarning = async (req: Request, res: Response) => {
    try {
        const updated = await prisma.earning.update({
            where: { id: req.params.id },
            data: { transferred_at: new Date() }
        });
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

// Config
export const getConfig = async (req: Request, res: Response) => {
    try {
        const data = await redis.get('system_config');
        res.json({ success: true, data: data ? JSON.parse(data) : { commission: 15, schedule: '9-18' } });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    try {
        await redis.set('system_config', JSON.stringify(req.body));
        res.json({ success: true, data: req.body });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

async function signedPhotoUrls(photos: string[]): Promise<string[]> {
    return Promise.all(
        photos.map(async (p) => {
            if (!p) return p;
            if (p.startsWith('http://') || p.startsWith('https://')) return p;
            return StorageService.getSignedUrl(p);
        })
    );
}

export const listAdminProfessionalDocuments = async (req: Request, res: Response) => {
    try {
        const data = await listDocumentsForProfessional(req.params.id);
        res.json({ success: true, data });
    } catch {
        res.status(500).json({ success: false, error: { message: 'Error al listar documentos' } });
    }
};

export const uploadAdminProfessionalDocument = async (req: Request, res: Response) => {
    try {
        const result = await saveDocumentForProfessional(req.params.id, req.body);
        if (result.ok === false) {
            return res.status(result.status).json({ success: false, error: { message: result.message } });
        }
        res.status(201).json({ success: true, data: result.data });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: { message: 'Error al subir documento' } });
    }
};

export const deleteAdminProfessionalDocument = async (req: Request, res: Response) => {
    try {
        const result = await deleteDocumentForProfessional(req.params.id, req.params.docId);
        if (result.ok === false) {
            return res.status(result.status).json({ success: false, error: { message: result.message } });
        }
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false, error: { message: 'Error al eliminar' } });
    }
};

export const getUnassignedServiceRequests = async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.serviceRequest.findMany({
            where: {
                status: { in: ['visit_paid', 'awaiting_assignment'] },
                job_offers: {
                    some: {
                        professional_id: null,
                        quotations: {
                            some: {
                                quotation_type: 'visit',
                                payment: { status: 'approved' },
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: 'asc' },
            include: {
                user: { select: { name: true, last_name: true, phone: true } },
                job_offers: {
                    orderBy: { created_at: 'desc' },
                    include: {
                        quotations: { include: { payment: true } },
                    },
                },
            },
        });

        const data = await Promise.all(
            rows.map(async (row) => {
                const offer = row.job_offers.find((o) => o.professional_id == null) ?? row.job_offers[0];
                const visitQuote = offer?.quotations.find((q) => q.quotation_type === 'visit');
                const paidAt = visitQuote?.payment?.paid_at ?? null;
                const waitingSince = paidAt ?? row.created_at;
                return {
                    id: row.id,
                    category: row.category,
                    description: row.description,
                    address: row.address,
                    priority: row.priority,
                    scheduled_slot: row.scheduled_slot,
                    scheduled_date: row.scheduled_date,
                    visit_fee: row.visit_fee,
                    status: row.status,
                    photos: await signedPhotoUrls(row.photos || []),
                    created_at: row.created_at,
                    waiting_since: waitingSince,
                    waiting_ms: Date.now() - waitingSince.getTime(),
                    client: {
                        name: row.user?.name ?? null,
                        last_name: row.user?.last_name ?? null,
                        phone: row.user_phone,
                    },
                    job_offer_id: offer?.id ?? null,
                };
            })
        );

        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const assignTechnician = async (req: Request, res: Response) => {
    try {
        const professionalId = String(req.body?.professionalId || '').trim();
        if (!professionalId) {
            return res.status(400).json({
                success: false,
                error: { message: 'professionalId es requerido' },
            });
        }
        const result = await assignTechnicianToServiceRequest(req.params.id, professionalId);
        if (result.ok === false) {
            return res.status(result.status).json({ success: false, error: { message: result.message } });
        }
        res.json({ success: true, data: result.jobOffer });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};
