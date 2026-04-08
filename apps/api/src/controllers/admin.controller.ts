import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { MercadoPagoService } from '../services/mercadopago.service';
import { redis } from '../utils/redis';

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

        res.json({
            success: true,
            data: {
                active_conversations: activeConversations,
                delayed_quotes: delayedQuotes,
                active_professionals: activePros,
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
            orderBy: { expires_at: 'desc' }
        });
        res.json({ success: true, data: sessions });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching conversations' } });
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
            include: {
                quotation: { include: { job_offer: { include: { service_request: true, professional: true } } } }
            }
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
