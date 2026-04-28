import { prisma, type JobOffer, type Professional, type ServiceRequest, type User } from '@servy/db';
import { redis } from '../utils/redis';
import { WhatsAppService } from './whatsapp.service';
import { CascadeQueueService } from './cascade-queue.service';
import { ConversationService } from './conversation.service';
import { PaymentRetryService } from './payment-retry.service';
import { DIAGNOSTIC_VISIT_PRICE, getServiceType } from '../constants/pricing';

const SESSION_TTL = 60 * 60 * 24;

export class ProfessionalConversationService {
    private static async getSession(phone: string) {
        try {
            const cached = await redis.get(`pro_session:${phone}`);
            if (cached) {
                const p = JSON.parse(cached) as { state: string; data: Record<string, unknown> };
                return { state: String(p.state).toUpperCase(), data: p.data };
            }
        } catch {
            /* cache miss / redis down */
        }
        const row = await prisma.professionalSession.findUnique({ where: { phone } });
        if (!row) return { state: 'IDLE', data: {} as Record<string, unknown> };
        if (row.expires_at < new Date()) {
            await prisma.professionalSession.delete({ where: { phone } }).catch(() => {});
            return { state: 'IDLE', data: {} as Record<string, unknown> };
        }
        return { state: String(row.step).toUpperCase(), data: (row.data_json as Record<string, unknown>) || {} };
    }

    private static async saveSession(phone: string, state: string, data: Record<string, unknown> = {}) {
        try {
            await redis.set(`pro_session:${phone}`, JSON.stringify({ state, data }), 'EX', SESSION_TTL);
        } catch {
            /* redis optional */
        }
        await prisma.professionalSession.upsert({
            where: { phone },
            update: {
                step: state,
                data_json: data as object,
                expires_at: new Date(Date.now() + SESSION_TTL * 1000),
            },
            create: {
                phone,
                step: state,
                data_json: data as object,
                expires_at: new Date(Date.now() + SESSION_TTL * 1000),
            },
        });
    }

    private static async clearSession(phone: string) {
        try {
            await redis.del(`pro_session:${phone}`);
        } catch {
            /* ignore */
        }
        await prisma.professionalSession.delete({ where: { phone } }).catch(() => {});
    }

    /** Tras pago de visita (diagnóstico): el técnico envía precio de arreglo o *SOLO VISITA*. */
    static async setRepairQuoteAwaitingSession(
        professionalPhone: string,
        data: { jobId: string; userPhone: string; requestId: string }
    ) {
        await this.saveSession(professionalPhone, 'AWAITING_REPAIR_QUOTE', data);
        await WhatsAppService.sendTextMessage(
            professionalPhone,
            `✅ Ya podés ir.\n\n━━━━━━━━━━━━━━━\n📋 *Tu machete para la visita:*\n━━━━━━━━━━━━━━━\n\nCuando termines de revisar el problema, mandame por acá el monto total del arreglo + repuestos.\n\nEjemplo: *Precio: 100000*\n\n💡 Yo le armo el link de Mercado Pago para que te pague en hasta *3 cuotas*. Nuestra comisión promocional es de solo el *5%*.\n\n✅ Asegurate el cobro y no fíes más.\n\nSi el cliente no quiere hacer el arreglo, escribí: *SOLO VISITA*`
        );
    }

    static async notifyNewJob(
        professional: Professional,
        jobOffer: JobOffer,
        request: ServiceRequest & { user: User },
        user: User
    ) {
        const urgencyText =
            jobOffer.priority === 'urgent'
                ? '⚡ *Urgente* — tarifa alta'
                : '📅 *Programado* — tarifa estándar';

        const jobCount = await prisma.job.count({
            where: { quotation: { job_offer: { professional_id: professional.id } } },
        });

        const uname = `${user.name ?? ''} ${user.last_name ?? ''}`.trim() || 'Cliente';
        const cat = request.category ?? '—';
        const desc = request.description ?? '—';
        const addr = request.address ?? '—';
        const sched = jobOffer.schedule || 'A coordinar';

        const proFirst = professional.name.trim() || 'vos';
        const body =
            jobCount === 0
                ? `🎉 *¡Tu primer trabajo en Servy, ${proFirst}!*\n\n━━━━━━━━━━━━━━━\n👤 *${uname}*\n📍 ${addr}\n🔧 ${cat}\n📋 ${desc}\n🕐 ${sched}\n━━━━━━━━━━━━━━━\n\n${urgencyText}\n\n¿Aceptás el trabajo?\n\n1. Sí, acepto\n2. No, paso`
                : `💼 *Nuevo trabajo disponible*\n\n━━━━━━━━━━━━━━━\n👤 *${uname}*\n📍 ${addr}\n🔧 ${cat}\n📋 ${desc}\n🕐 ${sched}\n━━━━━━━━━━━━━━━\n\n${urgencyText}\n\n¿Aceptás el trabajo?\n\n1. Sí, acepto\n2. No, paso`;

        await WhatsAppService.sendTextMessage(professional.phone, body);

        await this.saveSession(professional.phone, 'AWAITING_JOB_RESPONSE', {
            jobOfferId: jobOffer.id,
            requestId: request.id,
            userPhone: user.phone,
        });
    }

    static async processMessage(phone: string, content: string, messageType: string = 'text') {
        if (content.toLowerCase() === 'cancelar') {
            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(
                phone,
                'Sesión cancelada. Te avisamos cuando haya un nuevo trabajo disponible.'
            );
            return;
        }

        const professional = await prisma.professional.findUnique({ where: { phone } });
        if (!professional) return;

        const session = await this.getSession(phone);

        // Detectar respuestas a ofertas de trabajo (cascada)
        if (messageType === 'text') {
            const normalized = content.toLowerCase().trim();
            const isAccept =
                normalized === 'si' ||
                normalized === 'sí' ||
                normalized === 'acepto' ||
                normalized === '1' ||
                normalized === 'dale' ||
                normalized === 'ok';

            const isReject =
                normalized === 'no' ||
                normalized === 'rechazo' ||
                normalized === 'rechazar' ||
                normalized === '2' ||
                normalized === 'cancelar';

            if (isAccept || isReject) {
                if (professional.availability_status === 'EVALUATING') {
                    // Buscar la oferta pendiente más reciente
                    const pendingOffer = await prisma.jobOffer.findFirst({
                        where: {
                            professional_id: professional.id,
                            status: 'pending',
                        },
                        orderBy: { offered_at: 'desc' },
                        include: { service_request: { include: { user: true } } },
                    });

                    if (pendingOffer) {
                        if (isAccept) {
                            const success = await CascadeQueueService.acceptJob(
                                pendingOffer.id,
                                professional.id
                            );

                            if (success) {
                                await WhatsAppService.sendTextMessage(
                                    phone,
                                    `✅ *¡El trabajo es tuyo!*\n\n` +
                                        `📍 ${pendingOffer.service_request.address || 'Ver detalles'}\n` +
                                        `👤 Cliente: ${pendingOffer.service_request.user?.name || 'Usuario'}\n\n` +
                                        `Ahora podés cotizar el trabajo. El cliente ya fue notificado.\n\n` +
                                        `_Ingresá a tu portal para ver todos los detalles._`
                                );

                                // Notificar al cliente
                                if (pendingOffer.service_request.user?.phone) {
                                    await WhatsAppService.sendTextMessage(
                                        pendingOffer.service_request.user.phone,
                                        `✅ *¡Tenemos técnico!*\n\n` +
                                            `${professional.name} aceptó tu solicitud.\n\n` +
                                            `⏳ En breve te llega su cotización — normalmente en menos de 30 minutos.\n\n` +
                                            `_Si no recibís nada en una hora, escribí *ayuda*._`
                                    );
                                }

                                return; // Terminar procesamiento
                            } else {
                                await WhatsAppService.sendTextMessage(
                                    phone,
                                    `⏱️ *Este trabajo ya fue tomado por otro profesional.*\n\n` +
                                        `¡Atento a la próxima oportunidad!`
                                );
                                return;
                            }
                        } else if (isReject) {
                            await CascadeQueueService.rejectOrTimeout(
                                pendingOffer.id,
                                professional.id,
                                'rejected'
                            );

                            await WhatsAppService.sendTextMessage(
                                phone,
                                `👍 *Entendido.* Este trabajo pasará a otro profesional.\n\n` +
                                    `Quedate atento para la próxima oportunidad.`
                            );
                            return;
                        }
                    }
                }
            }
        }

        // Detectar confirmación de visita / "Estoy en camino"
        if (messageType === 'text') {
            const normalized = content.toLowerCase().trim();
            const isConfirm =
                normalized === 'si' ||
                normalized === 'sí' ||
                normalized === 'confirmo' ||
                normalized === '1';

            const isDemora =
                normalized.includes('demora') ||
                normalized.includes('tarde') ||
                normalized === '2';

            const skipVisitPromptFlow =
                session.state === 'AWAITING_JOB_RESPONSE' ||
                session.state === 'AWAITING_QUOTATION' ||
                session.state === 'AWAITING_REPAIR_QUOTE';

            if (!skipVisitPromptFlow && (isConfirm || isDemora)) {
                const upcomingJob = await prisma.job.findFirst({
                        where: {
                            quotation: {
                                job_offer: {
                                    professional_id: professional.id,
                                },
                            },
                            status: 'confirmed',
                            scheduled_at: {
                                gte: new Date(),
                                lte: new Date(Date.now() + 2 * 60 * 60 * 1000), // Próximas 2 horas
                            },
                        },
                        include: {
                            quotation: {
                                include: {
                                    job_offer: {
                                        include: {
                                            service_request: {
                                                include: { user: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: { scheduled_at: 'asc' },
                    });

                    if (upcomingJob) {
                        if (isConfirm) {
                            await WhatsAppService.sendTextMessage(
                                phone,
                                `✅ *Perfecto.* El turno está confirmado.\n\n` +
                                    `Cuando estés saliendo para el domicilio, avisanos escribiendo:\n` +
                                    `🚗 *VOY EN CAMINO*`
                            );

                            // Guardar en sesión para detectar "voy en camino" después
                            await redis.setex(
                                `pending_departure:${phone}`,
                                7200, // 2 horas
                                upcomingJob.id
                            );

                            return;
                        } else if (isDemora) {
                            // Notificar al cliente
                            const u = upcomingJob.quotation.job_offer.service_request.user;
                            if (u?.phone) {
                                await WhatsAppService.sendTextMessage(
                                    u.phone,
                                    `⏰ *Aviso:* Tu técnico ${professional.name ?? 'Tu técnico'} va a llegar con un pequeño retraso.\n\n` +
                                        `Te avisaremos cuando esté en camino.`
                                );
                            }

                            await WhatsAppService.sendTextMessage(
                                phone,
                                `👍 *Entendido.* Le avisamos al cliente que vas a llegar con demora.\n\n` +
                                    `Avisanos cuando salgas escribiendo: *VOY EN CAMINO*`
                            );

                            await redis.setex(`pending_departure:${phone}`, 7200, upcomingJob.id);

                            return;
                        }
                    }
            }

            // Detectar "voy en camino"
            if (normalized.includes('voy') || normalized.includes('camino') || normalized.includes('salgo')) {
                const jobId = await redis.get(`pending_departure:${phone}`);

                if (jobId) {
                    const job = await prisma.job.findUnique({
                        where: { id: jobId },
                        include: {
                            quotation: {
                                include: {
                                    job_offer: {
                                        include: {
                                            professional: true,
                                            service_request: {
                                                include: { user: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    });

                    if (job) {
                        const pro = job.quotation.job_offer.professional;
                        const user = job.quotation.job_offer.service_request.user;

                        // Notificar al cliente
                        if (user?.phone) {
                            await WhatsAppService.sendTextMessage(
                                user.phone,
                                `🚗 *¡Buenas noticias!*\n\n` +
                                    `Tu especialista ${pro.name ?? 'Tu especialista'} ya está en camino hacia tu domicilio.\n\n` +
                                    `Te avisará por este mismo chat cuando esté llegando.`
                            );
                        }

                        await WhatsAppService.sendTextMessage(
                            phone,
                            `✅ *¡Excelente!* Le avisamos al cliente que estás en camino.\n\n` +
                                `Cuando llegues al domicilio, avisanos escribiendo:\n` +
                                `🏠 *YA LLEGUÉ*`
                        );

                        // Cambiar key de Redis
                        await redis.del(`pending_departure:${phone}`);
                        await redis.setex(`pending_arrival:${phone}`, 3600, jobId);

                        return;
                    }
                }
            }

            // Detectar "ya llegué"
            if (normalized.includes('llegué') || normalized.includes('llegue') || normalized.includes('puerta') || normalized.includes('afuera')) {
                const jobId = await redis.get(`pending_arrival:${phone}`);

                if (jobId) {
                    const job = await prisma.job.findUnique({
                        where: { id: jobId },
                        include: {
                            quotation: {
                                include: {
                                    job_offer: {
                                        include: {
                                            professional: true,
                                            service_request: {
                                                include: { user: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    });

                    if (job) {
                        const pro = job.quotation.job_offer.professional;
                        const user = job.quotation.job_offer.service_request.user;

                        // Notificar al cliente
                        if (user?.phone) {
                            await WhatsAppService.sendTextMessage(
                                user.phone,
                                `🏠 *${pro.name ?? 'Tu especialista'} ya está en tu puerta.*\n\n` + `¡Que tengas un excelente servicio!`
                            );
                        }

                        await WhatsAppService.sendTextMessage(
                            phone,
                            `✅ *Perfecto.* Le avisamos al cliente que ya estás en la puerta.\n\n` + `¡Éxitos con el servicio!`
                        );

                        // Limpiar Redis
                        await redis.del(`pending_arrival:${phone}`);

                        return;
                    }
                }
            }
        }

        switch (session.state) {
            case 'AWAITING_JOB_RESPONSE': {
            const jobOfferId = session.data.jobOfferId as string;
            const userPhone = session.data.userPhone as string;
            const requestId = session.data.requestId as string;

            const normalized = content.trim().toLowerCase();
            const acceptOptions = ['1', `job_accept_${jobOfferId}`.toLowerCase()];
            if (acceptOptions.includes(normalized) || normalized.includes('acepto')) {
                const existing = await prisma.jobOffer.findUnique({ where: { id: jobOfferId } });
                if (!existing) {
                    await WhatsAppService.sendTextMessage(phone, 'No encontré esa oferta.');
                    return;
                }

                const offer = await prisma.jobOffer.update({
                    where: { id: jobOfferId },
                    data: { status: 'accepted' },
                    include: {
                        service_request: true,
                        professional: true,
                    },
                });

                const { markProfessionalBusy } = await import('../agents/availability-agent');
                await markProfessionalBusy(professional.id).catch(() => {});

                const categoryLabel = offer.service_request.category ?? '';
                const serviceType = getServiceType(String(categoryLabel));

                if (serviceType === 'diagnostic') {
                    const quotation = await prisma.quotation.create({
                        data: {
                            job_offer_id: jobOfferId,
                            items_json: [
                                {
                                    description: `Visita de diagnóstico - ${categoryLabel || 'servicio'}`,
                                    price: DIAGNOSTIC_VISIT_PRICE,
                                },
                            ],
                            total_price: DIAGNOSTIC_VISIT_PRICE,
                            description: `Visita de diagnóstico - ${categoryLabel || 'servicio'}`,
                            estimated_duration: '1 hora',
                            status: 'pending',
                        },
                    });

                    await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'quoted' } });

                    const clientPhone = offer.service_request.user_phone;
                    await ConversationService.afterQuotationSent(clientPhone, {
                        quotationId: quotation.id,
                        jobOfferId,
                        requestId: offer.service_request.id,
                        totalPrice: DIAGNOSTIC_VISIT_PRICE,
                    });

                    await this.clearSession(phone);

                    const dateStr = offer.service_request.scheduled_date
                        ? new Date(offer.service_request.scheduled_date).toLocaleDateString('es-AR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: '2-digit',
                          })
                        : 'fecha a confirmar';

                    await WhatsAppService.sendTextMessage(
                        phone,
                        `✅ Visita aceptada\n\n━━━━━━━━━━━━━━━\n📅 ${dateStr}\n⏰ ${offer.service_request.scheduled_time || 'Horario a confirmar'}\n💵 $${DIAGNOSTIC_VISIT_PRICE.toLocaleString('es-AR')}\n━━━━━━━━━━━━━━━\n\nTe avisamos cuando el cliente confirme el pago.`
                    );
                } else {
                    // MODELO ONE-SHOT: Cotización automática (precio ya definido)
                    const rawPrice = offer.service_request.visit_price;
                    const price = rawPrice != null ? Number(rawPrice) : 0;

                    const quotation = await prisma.quotation.create({
                        data: {
                            job_offer_id: jobOfferId,
                            total_price: price,
                            description: `${offer.service_request.category} - Servicio completo`,
                            estimated_duration: '2 horas',
                            items_json: [
                                {
                                    description: offer.service_request.category,
                                    price: price,
                                },
                            ],
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
                        requestId: offer.service_request.id,
                        totalPrice: price,
                    });

                    await this.clearSession(phone);

                    const dateStr = offer.service_request.scheduled_date
                        ? new Date(offer.service_request.scheduled_date).toLocaleDateString('es-AR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: '2-digit',
                          })
                        : 'fecha a confirmar';

                    await WhatsAppService.sendTextMessage(
                        phone,
                        `✅ Trabajo aceptado\n\n━━━━━━━━━━━━━━━\n🔧 ${offer.service_request.category}\n📅 ${dateStr}\n⏰ ${offer.service_request.scheduled_time || 'Horario a confirmar'}\n💵 $${price.toLocaleString('es-AR')}\n━━━━━━━━━━━━━━━\n\nTe avisamos cuando el cliente confirme el pago.`
                    );
                }
            } else if (content === `job_reject_${jobOfferId}` || content.toLowerCase().includes('paso') || content === '2') {
                await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'rejected' } });
                const { clearProfessionalBusyIfNeeded } = await import('../agents/availability-agent');
                await clearProfessionalBusyIfNeeded(professional.id).catch(() => {});
                await this.clearSession(phone);
                await WhatsAppService.sendTextMessage(
                    phone,
                    'Entendido. No te preocupes, te avisamos cuando haya otro trabajo disponible. 💪'
                );

                await WhatsAppService.sendTextMessage(
                    userPhone,
                    'El técnico que te recomendamos no está disponible en este momento.\n\nYa estamos buscando otra opción para vos. En breve te avisamos. 🔍'
                );

                await this.findNextProfessional(requestId, jobOfferId, userPhone);
            } else {
                await WhatsAppService.sendTextMessage(phone, 'Respondé *1* para aceptar o *2* para pasar.');
            }
            return;
            }

            case 'AWAITING_QUOTATION': {
            const jobOfferId = session.data.jobOfferId as string;
            const userPhone = session.data.userPhone as string;

            const lines = content.split('\n');
            let trabajo = '';
            let tiempo = '';
            let precio = '';

            for (const line of lines) {
                const lower = line.toLowerCase();
                if (lower.startsWith('trabajo:')) trabajo = line.split(':').slice(1).join(':').trim();
                if (lower.startsWith('tiempo:')) tiempo = line.split(':').slice(1).join(':').trim();
                if (lower.startsWith('precio:')) precio = line.split(':').slice(1).join(':').trim();
            }

            if (!trabajo || !tiempo || !precio) {
                await WhatsAppService.sendTextMessage(
                    phone,
                    'No pude leer bien la cotización. Usá este formato exacto:\n\nTrabajo: [descripción]\nTiempo: [tiempo estimado]\nPrecio: [monto en pesos]'
                );
                return;
            }

            const precioNum = parseFloat(precio.replace(/[^0-9.]/g, ''));
            if (Number.isNaN(precioNum) || precioNum <= 0) {
                await WhatsAppService.sendTextMessage(
                    phone,
                    'El precio no es válido. Enviá un monto en pesos en la línea _Precio:_\n\n_Ej: Precio: 45000_'
                );
                return;
            }

            const jobOffer = await prisma.jobOffer.findUnique({
                where: { id: jobOfferId },
                include: { service_request: true },
            });
            if (!jobOffer) return;

            const quotation = await prisma.quotation.create({
                data: {
                    job_offer_id: jobOfferId,
                    items_json: [{ description: trabajo, price: precioNum }],
                    total_price: precioNum,
                    description: trabajo,
                    estimated_duration: tiempo,
                    status: 'pending',
                },
            });

            await prisma.jobOffer.update({ where: { id: jobOfferId }, data: { status: 'quoted' } });

            await this.clearSession(phone);
            await WhatsAppService.sendTextMessage(phone, '✅ *Cotización enviada.*\n\nTe avisamos cuando el cliente la acepte.');

            await ConversationService.afterQuotationSent(userPhone, {
                quotationId: quotation.id,
                jobOfferId,
                requestId: jobOffer.request_id,
                totalPrice: precioNum,
            });
            return;
            }

            case 'AWAITING_REPAIR_QUOTE': {
                const jobId = session.data.jobId as string | undefined;
                const repairUserPhone = session.data.userPhone as string | undefined;
                const requestIdRepair = session.data.requestId as string | undefined;

                if (!jobId || !repairUserPhone || !requestIdRepair) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'Hubo un error con la información del trabajo. Por favor contactá soporte.'
                    );
                    await this.clearSession(phone);
                    return;
                }

                const contentUpper = content.toUpperCase().trim();

                if (contentUpper === 'SOLO VISITA' || contentUpper === 'SOLOVISITA') {
                    await prisma.job.update({
                        where: { id: jobId },
                        data: { phase: 'visit_only' },
                    });

                    await prisma.serviceRequest.update({
                        where: { id: requestIdRepair },
                        data: { phase: 'visit_only' },
                    });

                    await WhatsAppService.sendTextMessage(
                        repairUserPhone,
                        `El técnico terminó la evaluación.\n\nPodés mostrarle el QR para liberar el pago de la visita ($${DIAGNOSTIC_VISIT_PRICE.toLocaleString('es-AR')}).`
                    );

                    await this.clearSession(phone);
                    await WhatsAppService.sendTextMessage(
                        phone,
                        '✅ Registrado como "solo visita".\n\nCuando el cliente te muestre el QR, escanealo para recibir el pago.'
                    );
                    return;
                }

                const priceMatch = content.match(/(?:precio:?\s*)?(\d+)/i);

                if (!priceMatch?.[1]) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        `No entendí el monto. Recordá:\n\n*Precio: [número]*\n\nEjemplo: Precio: 125000\n\n💡 Esto le permite al cliente pagar en *3 cuotas* con Mercado Pago. Vos cobrás el 95% al terminar.\n\nO escribí *SOLO VISITA* si no va el arreglo.`
                    );
                    return;
                }

                const repairPrice = parseInt(priceMatch[1], 10);

                if (repairPrice < 1000 || repairPrice > 10000000) {
                    await WhatsAppService.sendTextMessage(
                        phone,
                        'El precio parece incorrecto. Por favor verificá el monto y volvé a enviarlo.'
                    );
                    return;
                }

                await prisma.serviceRequest.update({
                    where: { id: requestIdRepair },
                    data: {
                        repair_price: repairPrice,
                        phase: 'repair_pending',
                        repair_status: 'pending',
                    },
                });

                const job = await prisma.job.findUnique({
                    where: { id: jobId },
                    include: {
                        quotation: {
                            include: {
                                job_offer: {
                                    include: {
                                        professional: true,
                                    },
                                },
                            },
                        },
                    },
                });

                const techName = job?.quotation?.job_offer?.professional?.name || 'El técnico';

                await WhatsAppService.sendTextMessage(
                    repairUserPhone,
                    `💰 Presupuesto de reparación\n\n━━━━━━━━━━━━━━━\n👤 ${techName}\n💵 $${repairPrice.toLocaleString('es-AR')}\n✅ Incluye materiales\n━━━━━━━━━━━━━━━\n\n🔒 Pago protegido hasta que el trabajo esté completo.\n\n¿Aceptás?\n1. Sí, arreglá ahora\n2. No, solo la visita`
                );

                await this.clearSession(phone);
                await WhatsAppService.sendTextMessage(
                    phone,
                    `✅ Presupuesto enviado al cliente.\n\n💵 $${repairPrice.toLocaleString('es-AR')}\n\nTe avisamos cuando acepte.`
                );

                return;
            }

            case 'AWAITING_PAYMENT_RETRY_DECISION': {
                await PaymentRetryService.processRetryDecision(phone, content, session.data);
                break;
            }

            default:
                break;
        }
    }

    private static async findNextProfessional(requestId: string, rejectedOfferId: string, userPhone: string) {
        const nextOffer = await prisma.jobOffer.findFirst({
            where: {
                request_id: requestId,
                id: { not: rejectedOfferId },
                status: 'pending',
            },
            include: {
                professional: true,
                service_request: { include: { user: true } },
            },
        });

        if (nextOffer) {
            const req = nextOffer.service_request;
            const u = req.user;
            await ProfessionalConversationService.notifyNewJob(nextOffer.professional, nextOffer, { ...req, user: u }, u);
        } else {
            await WhatsAppService.sendTextMessage(
                userPhone,
                'Lo sentimos, no encontramos más técnicos disponibles en tu zona en este momento.\n\nEscribí cuando quieras intentarlo de nuevo. 🙏'
            );
        }
    }
}
