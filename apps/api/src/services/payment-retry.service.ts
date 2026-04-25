import { prisma } from '@servy/db';
import { redis } from '../utils/redis';
import { WhatsAppService } from './whatsapp.service';
import { DIAGNOSTIC_VISIT_PRICE } from '../constants/pricing';

const PRO_SESSION_TTL = 60 * 60 * 24;

export class PaymentRetryService {
    /**
     * Maneja el flujo cuando falla el pago del arreglo
     */
    static async handleRepairPaymentFailure(
        jobId: string,
        userPhone: string,
        techPhone: string,
        amount: number
    ): Promise<void> {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                quotation: {
                    include: {
                        job_offer: { select: { request_id: true } },
                    },
                },
            },
        });
        const requestId = job?.quotation?.job_offer?.request_id;

        await WhatsAppService.sendTextMessage(
            techPhone,
            `⚠️ *El pago con tarjeta fue rebotado*\n\nMonto: $${amount.toLocaleString('es-AR')}\n\n¿Cómo querés seguir?\n\n1. El cliente probó con otra tarjeta (verificar de nuevo)\n2. Que transfiera directo a Servy (Alias: *servy.pagos*)\n3. Abortar arreglo (SOLO VISITA)`
        );

        await this.saveTechSession(techPhone, 'AWAITING_PAYMENT_RETRY_DECISION', {
            jobId,
            userPhone,
            amount,
            attemptNumber: 1,
            ...(requestId ? { requestId } : {}),
        });

        await WhatsAppService.sendTextMessage(
            userPhone,
            `⚠️ *No pudimos procesar el pago*\n\n💵 Monto: $${amount.toLocaleString('es-AR')}\n\n📱 Opciones:\n\n1. Intentá con otra tarjeta (te mandamos el link de nuevo)\n2. Hacé una transferencia a:\n   *Alias:* servy.pagos\n   *CVU:* 0000003100012345678901\n   *Monto:* $${amount.toLocaleString('es-AR')}\n\n_Una vez que transfieras, avisanos y confirmamos con el técnico._`
        );
    }

    /**
     * Procesa la decisión del técnico después del fallo
     */
    static async processRetryDecision(
        techPhone: string,
        decision: string,
        sessionData: Record<string, unknown>
    ): Promise<void> {
        const jobId = sessionData.jobId as string;
        const userPhone = sessionData.userPhone as string;
        const amount = Number(sessionData.amount);
        const requestId = sessionData.requestId as string | undefined;

        const normalized = decision.trim();

        if (normalized === '1') {
            await WhatsAppService.sendTextMessage(
                techPhone,
                `Verificando el pago nuevamente...\n\n⏳ Dale 2 minutos al cliente para reintentar. Si no funciona, te aviso.`
            );

            void (async () => {
                await new Promise((r) => setTimeout(r, 120_000));

                let paid = false;
                if (requestId) {
                    const sr = await prisma.serviceRequest.findUnique({
                        where: { id: requestId },
                        select: { repair_status: true },
                    });
                    paid = sr?.repair_status === 'paid';
                }

                if (paid) {
                    await WhatsAppService.sendTextMessage(
                        techPhone,
                        `✅ *¡Pago confirmado!*\n\n💵 $${amount.toLocaleString('es-AR')}\n\nYa podés hacer el arreglo. El pago se libera cuando termines.`
                    );
                    await this.clearTechSession(techPhone);
                } else {
                    await WhatsAppService.sendTextMessage(
                        techPhone,
                        `Todavía no vemos el pago acreditado.\n\nSi el cliente ya pagó, puede demorar unos minutos más. Si no, respondé *1*, *2* o *3* según cómo quieras seguir.`
                    );
                    await this.saveTechSession(techPhone, 'AWAITING_PAYMENT_RETRY_DECISION', {
                        ...sessionData,
                        attemptNumber: Number(sessionData.attemptNumber ?? 1) + 1,
                    });
                }
            })();
        } else if (normalized === '2') {
            await WhatsAppService.sendTextMessage(
                techPhone,
                `📱 *Esperando transferencia del cliente*\n\nCuando el cliente transfiera a servy.pagos, te avisamos automáticamente.\n\nDatos:\n*Alias:* servy.pagos\n*Monto:* $${amount.toLocaleString('es-AR')}`
            );

            if (requestId) {
                await prisma.serviceRequest.update({
                    where: { id: requestId },
                    data: { repair_status: 'pending_transfer' },
                });
            }

            await this.clearTechSession(techPhone);
        } else if (normalized === '3') {
            await prisma.job.update({
                where: { id: jobId },
                data: { phase: 'visit_only' },
            });

            if (requestId) {
                await prisma.serviceRequest.update({
                    where: { id: requestId },
                    data: { phase: 'visit_only' },
                });
            }

            await WhatsAppService.sendTextMessage(
                userPhone,
                `Entendido. Se canceló el arreglo.\n\nPodés mostrarle el QR al técnico para liberar el pago de la visita ($${DIAGNOSTIC_VISIT_PRICE.toLocaleString('es-AR')}).`
            );

            await WhatsAppService.sendTextMessage(
                techPhone,
                `✅ Registrado como SOLO VISITA.\n\nCuando el cliente te muestre el QR, escanealo para cobrar la visita.`
            );

            await this.clearTechSession(techPhone);
        } else {
            await WhatsAppService.sendTextMessage(techPhone, `Por favor elegí 1, 2 o 3.`);
        }
    }

    private static async saveTechSession(phone: string, state: string, data: Record<string, unknown>) {
        try {
            await redis.set(`pro_session:${phone}`, JSON.stringify({ state, data }), 'EX', PRO_SESSION_TTL);
        } catch {
            /* redis optional */
        }
        await prisma.professionalSession.upsert({
            where: { phone },
            create: {
                phone,
                step: state,
                data_json: data as object,
                expires_at: new Date(Date.now() + PRO_SESSION_TTL * 1000),
            },
            update: {
                step: state,
                data_json: data as object,
                expires_at: new Date(Date.now() + PRO_SESSION_TTL * 1000),
            },
        });
    }

    private static async clearTechSession(phone: string) {
        try {
            await redis.del(`pro_session:${phone}`);
        } catch {
            /* ignore */
        }
        await prisma.professionalSession.delete({ where: { phone } }).catch(() => {});
    }
}
