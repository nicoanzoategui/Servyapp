import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { MercadoPagoService } from '../services/mercadopago.service';
import { redis } from '../utils/redis';
import { signedUrlsForPhotos } from '../services/photo-urls';
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

        const [unassignedOrders, awaitingArrival, refundPending, completedToday, completedWeek] = await Promise.all([
            prisma.serviceRequest.count({
                where: {
                    status: { in: ['visit_paid', 'awaiting_assignment'] },
                    job_offers: {
                        some: {
                            professional_id: null,
                            quotations: { some: { quotation_type: 'visit', payment: { status: 'approved' } } },
                        },
                    },
                },
            }),
            prisma.job.findMany({
                where: { status: { in: ['confirmed', 'in_progress'] }, arrival_confirmed_at: null },
                orderBy: { updated_at: 'desc' },
                take: 20,
                include: {
                    quotation: {
                        include: {
                            job_offer: {
                                include: {
                                    professional: { select: { name: true, last_name: true } },
                                    service_request: {
                                        select: {
                                            address: true,
                                            user: { select: { name: true, last_name: true, phone: true } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.payment.findMany({
                where: { status: 'refund_pending' },
                take: 20,
                include: {
                    quotation: {
                        include: {
                            job_offer: {
                                include: {
                                    service_request: {
                                        select: { id: true, address: true, user_phone: true },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.job.count({
                where: { status: 'completed', OR: [{ completed_at: { gte: today } }, { completed_at: null, updated_at: { gte: today } }] },
            }),
            prisma.job.count({
                where: {
                    status: 'completed',
                    OR: [{ completed_at: { gte: firstDayOfWeek } }, { completed_at: null, updated_at: { gte: firstDayOfWeek } }],
                },
            }),
        ]);

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
                },
                live: {
                    unassigned_count: unassignedOrders,
                    completed_today: completedToday,
                    completed_week: completedWeek,
                    awaiting_arrival: awaitingArrival.map((job) => {
                        const sr = job.quotation.job_offer.service_request;
                        const pro = job.quotation.job_offer.professional;
                        return {
                            job_id: job.id,
                            address: sr.address,
                            client: sr.user,
                            technician: pro ? `${pro.name} ${pro.last_name}`.trim() : null,
                            status: job.status,
                            scheduled_at: job.scheduled_at,
                        };
                    }),
                    refund_pending: refundPending.map((p) => ({
                        payment_id: p.id,
                        amount: p.amount,
                        address: p.quotation.job_offer.service_request.address,
                        user_phone: p.quotation.job_offer.service_request.user_phone,
                    })),
                },
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
        let recent: { phone: string; body: string; created_at: Date; direction: string }[] = [];
        try {
            recent = await prisma.whatsappMessage.findMany({
                orderBy: { created_at: 'desc' },
                take: 400,
                select: { phone: true, body: true, created_at: true, direction: true },
            });
        } catch (e) {
            // Tabla todavía no migrada: el listado igual muestra sesiones activas.
            console.error('[admin] whatsapp_messages no disponible', e);
        }
        const lastByPhone = new Map<string, (typeof recent)[number]>();
        for (const m of recent) {
            if (!lastByPhone.has(m.phone)) lastByPhone.set(m.phone, m);
        }
        const sessionByPhone = new Map(sessions.map((s) => [s.phone, s]));
        const phones = new Set([...sessionByPhone.keys(), ...lastByPhone.keys()]);
        const users = await prisma.user.findMany({
            where: { phone: { in: [...phones] } },
            select: { phone: true, name: true, last_name: true },
        });
        const userByPhone = new Map(users.map((u) => [u.phone, u]));

        const data = [...phones].map((phone) => {
            const session = sessionByPhone.get(phone);
            const last = lastByPhone.get(phone);
            const user = userByPhone.get(phone);
            return {
                phone,
                name: user ? `${user.name || ''} ${user.last_name || ''}`.trim() : null,
                state: session?.step ?? null,
                expires_at: session?.expires_at ?? null,
                last_message: last?.body ?? null,
                last_at: last?.created_at ?? session?.expires_at ?? null,
            };
        });
        data.sort((a, b) => {
            const ta = a.last_at ? new Date(a.last_at).getTime() : 0;
            const tb = b.last_at ? new Date(b.last_at).getTime() : 0;
            return tb - ta;
        });
        res.json({ success: true, data });
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

        let messages: Awaited<ReturnType<typeof prisma.whatsappMessage.findMany>> = [];
        try {
            messages = await prisma.whatsappMessage.findMany({
                where: { phone },
                orderBy: { created_at: 'asc' },
                take: 500,
            });
        } catch (e) {
            console.error('[admin] whatsapp_messages no disponible', e);
        }

        res.json({
            success: true,
            data: {
                user: user || professional,
                session: session ? { ...session, state: session.step } : null,
                requests,
                messages,
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

export const deleteProfessional = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const [offers, earnings] = await Promise.all([
            prisma.jobOffer.count({ where: { professional_id: id } }),
            prisma.earning.count({ where: { professional_id: id } }),
        ]);
        if (offers > 0 || earnings > 0) {
            return res.status(409).json({
                success: false,
                error: {
                    message:
                        'No se puede eliminar: este técnico tiene ofertas o pagos asociados. Suspendelo para sacarlo de circulación.',
                },
            });
        }
        const pro = await prisma.professional.findUnique({ where: { id } });
        if (!pro) {
            return res.status(404).json({ success: false, error: { message: 'Profesional no encontrado' } });
        }
        await prisma.$transaction([
            prisma.professionalDocument.deleteMany({ where: { professional_id: id } }),
            prisma.providerSchedule.deleteMany({ where: { provider_id: id } }),
            prisma.professionalSession.deleteMany({ where: { phone: pro.phone } }),
            prisma.professional.delete({ where: { id } }),
        ]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'No se pudo eliminar' } });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const filter: { status?: 'active' | 'inactive' } = {};
        if (status === 'active' || status === 'inactive') filter.status = status;
        const users = await prisma.user.findMany({
            where: filter,
            orderBy: { created_at: 'desc' },
        });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const getUserDetail = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                service_requests: {
                    orderBy: { created_at: 'desc' },
                    take: 20,
                    select: { id: true, category: true, status: true, created_at: true, description: true },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'Usuario no encontrado' } });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const phone = String(req.body?.phone || '').replace(/\D/g, '');
        if (!phone) {
            return res.status(400).json({ success: false, error: { message: 'El teléfono es obligatorio' } });
        }
        const existing = await prisma.user.findUnique({ where: { phone } });
        if (existing) {
            return res.status(409).json({ success: false, error: { message: 'Ya existe un usuario con ese teléfono' } });
        }
        const user = await prisma.user.create({
            data: {
                phone,
                name: String(req.body?.name || '').trim() || null,
                last_name: String(req.body?.last_name || '').trim() || null,
                address: String(req.body?.address || '').trim() || null,
                postal_code: String(req.body?.postal_code || '').trim() || null,
                onboarding_completed: Boolean(req.body?.onboarding_completed),
                status: req.body?.status === 'inactive' ? 'inactive' : 'active',
            },
        });
        res.json({ success: true, data: user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const body = req.body as Record<string, unknown>;
        const data: Record<string, unknown> = {};
        if (typeof body.name === 'string') data.name = body.name.trim() || null;
        if (typeof body.last_name === 'string') data.last_name = body.last_name.trim() || null;
        if (typeof body.address === 'string') data.address = body.address.trim() || null;
        if (typeof body.postal_code === 'string') data.postal_code = body.postal_code.trim() || null;
        if (typeof body.phone === 'string') data.phone = body.phone.replace(/\D/g, '');
        if (typeof body.onboarding_completed === 'boolean') data.onboarding_completed = body.onboarding_completed;
        if (body.status === 'active' || body.status === 'inactive') data.status = body.status;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
        });
        res.json({ success: true, data: user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const updateUserStatus = async (req: Request, res: Response) => {
    try {
        const status = req.body?.status === 'inactive' ? 'inactive' : 'active';
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { status },
        });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'Usuario no encontrado' } });
        }
        const requests = await prisma.serviceRequest.count({ where: { user_phone: user.phone } });
        if (requests > 0) {
            return res.status(409).json({
                success: false,
                error: {
                    message:
                        'No se puede eliminar: este usuario tiene pedidos. Ponelo inactivo para que el bot no le responda.',
                },
            });
        }
        await prisma.$transaction([
            prisma.whatsappSession.deleteMany({ where: { phone: user.phone } }),
            prisma.whatsappMessage.deleteMany({ where: { phone: user.phone } }),
            prisma.user.delete({ where: { id: user.id } }),
        ]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'No se pudo eliminar' } });
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
        for (const job of jobs) {
            const sr = job.quotation.job_offer.service_request;
            sr.photos = await signedUrlsForPhotos(sr.photos);
        }
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
                quotation: {
                    include: {
                        payment: true,
                        job_offer: { include: { service_request: true, professional: true } },
                    },
                },
            }
        });
        if (job?.quotation.job_offer.service_request) {
            job.quotation.job_offer.service_request.photos = await signedUrlsForPhotos(
                job.quotation.job_offer.service_request.photos
            );
        }
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
                    photos: await signedUrlsForPhotos(row.photos || []),
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

type OrderBucket = 'nueva' | 'pendiente' | 'completada' | 'cancelada';

function orderBucket(row: {
    status: string;
    job_offers: {
        professional_id: string | null;
        professional: { name: string; last_name: string } | null;
        quotations: { job: { id: string; status: string; completed_at: Date | null } | null }[];
    }[];
}): OrderBucket {
    const jobs = row.job_offers.flatMap((o) => o.quotations.map((q) => q.job).filter(Boolean)) as {
        id: string;
        status: string;
        completed_at: Date | null;
    }[];
    if (jobs.some((j) => j.status === 'completed')) return 'completada';
    if (
        ['cancelled', 'cancelled_by_user'].includes(row.status) ||
        jobs.some((j) => j.status === 'cancelled')
    ) {
        return 'cancelada';
    }
    const assigned =
        row.job_offers.some((o) => o.professional_id) ||
        row.status === 'technician_assigned' ||
        jobs.some((j) => j.status === 'confirmed' || j.status === 'in_progress');
    if (assigned) return 'pendiente';
    return 'nueva';
}

export const getOrders = async (req: Request, res: Response) => {
    try {
        const status = String(req.query.status || 'todas');
        const rows = await prisma.serviceRequest.findMany({
            orderBy: { created_at: 'desc' },
            take: 300,
            include: {
                user: { select: { name: true, last_name: true, phone: true } },
                job_offers: {
                    orderBy: { created_at: 'desc' },
                    include: {
                        professional: { select: { id: true, name: true, last_name: true } },
                        quotations: { include: { payment: true, job: true } },
                    },
                },
            },
        });

        const mapped = await Promise.all(
            rows.map(async (row) => {
                const bucket = orderBucket(row);
                const offer =
                    row.job_offers.find((o) => o.professional_id) ??
                    row.job_offers.find((o) => o.professional_id == null) ??
                    row.job_offers[0];
                const visitQuote = offer?.quotations.find((q) => q.quotation_type === 'visit');
                const job =
                    offer?.quotations.map((q) => q.job).find(Boolean) ??
                    row.job_offers.flatMap((o) => o.quotations.map((q) => q.job)).find(Boolean);
                const pro = offer?.professional;
                const paidAt = visitQuote?.payment?.paid_at ?? null;
                return {
                    id: row.id,
                    bucket,
                    category: row.category,
                    description: row.description,
                    address: row.address,
                    priority: row.priority,
                    scheduled_slot: row.scheduled_slot,
                    scheduled_date: row.scheduled_date,
                    visit_fee: row.visit_fee,
                    status: row.status,
                    photos: await signedUrlsForPhotos(row.photos || []),
                    created_at: row.created_at,
                    waiting_since: paidAt ?? row.created_at,
                    client: {
                        name: row.user?.name ?? null,
                        last_name: row.user?.last_name ?? null,
                        phone: row.user_phone,
                    },
                    technician: pro ? `${pro.name} ${pro.last_name}`.trim() : null,
                    job_id: job?.id ?? null,
                    job_status: job?.status ?? null,
                    completed_at: job?.completed_at ?? null,
                };
            })
        );

        const counts = {
            todas: mapped.length,
            nueva: mapped.filter((o) => o.bucket === 'nueva').length,
            pendiente: mapped.filter((o) => o.bucket === 'pendiente').length,
            completada: mapped.filter((o) => o.bucket === 'completada').length,
            cancelada: mapped.filter((o) => o.bucket === 'cancelada').length,
        };
        const data =
            status === 'todas' || !status
                ? mapped
                : mapped.filter((o) => o.bucket === status);

        res.json({ success: true, data, counts });
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
