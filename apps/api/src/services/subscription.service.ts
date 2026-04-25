import { prisma } from '@servy/db';
import type { Prisma } from '@servy/db';
import { WhatsAppService } from './whatsapp.service';
import { ProfessionalMatchingService } from './matching.service';

type SubscriptionWithUserAndPro = Prisma.SubscriptionGetPayload<{
    include: { user: true; professional: true };
}>;

export class SubscriptionService {
    /**
     * Procesa una suscripción individual para cobro y agendamiento
     */
    static async processSubscription(subscriptionId: string): Promise<boolean> {
        const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                user: true,
                professional: true,
            },
        });

        if (!subscription || subscription.status !== 'active') {
            return false;
        }

        try {
            const payment = await this.attemptCharge(subscription);

            if (payment.success) {
                await this.createScheduledServiceRequest(subscription);

                const nextDate = new Date(subscription.next_service_date);
                nextDate.setDate(nextDate.getDate() + (subscription.frequency === 'weekly' ? 7 : 15));

                await prisma.subscription.update({
                    where: { id: subscriptionId },
                    data: {
                        next_service_date: nextDate,
                        last_payment_date: new Date(),
                        retry_count: 0,
                    },
                });

                const priceNum = Number(subscription.price);
                const nextDateStr = nextDate.toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                });

                await WhatsAppService.sendTextMessage(
                    subscription.user.phone,
                    `✅ *Pago procesado*\n\n🔄 ${subscription.service_category}\n💵 $${priceNum.toLocaleString('es-AR')}\n\n📅 Próximo servicio: ${nextDateStr}\n\nTe avisamos cuando confirmemos el técnico.`
                );

                return true;
            }

            await this.handlePaymentFailure(subscription);
            return false;
        } catch (error) {
            console.error(`Error procesando suscripción ${subscriptionId}:`, error);
            await this.handlePaymentFailure(subscription);
            return false;
        }
    }

    /**
     * Intenta cobrar la suscripción (simulación hasta integrar MP recurrente).
     */
    private static async attemptCharge(
        _subscription: SubscriptionWithUserAndPro
    ): Promise<{ success: boolean; paymentId?: string }> {
        try {
            // TODO: MercadoPago — cobro recurrente real
            if (process.env.SUBSCRIPTION_CHARGE_ALWAYS_SUCCEED === '1') {
                return { success: true, paymentId: `sim_pay_${Date.now()}` };
            }
            const success = Math.random() > 0.1;

            return {
                success,
                paymentId: success ? `sim_pay_${Date.now()}` : undefined,
            };
        } catch (error) {
            console.error('Error en attemptCharge:', error);
            return { success: false };
        }
    }

    /**
     * Crea un ServiceRequest automático para la suscripción
     */
    private static async createScheduledServiceRequest(subscription: SubscriptionWithUserAndPro) {
        const priceNum = Number(subscription.price);

        const serviceRequest = await prisma.serviceRequest.create({
            data: {
                user_phone: subscription.user.phone,
                category: subscription.service_category,
                description: `Servicio recurrente - Suscripción ${
                    subscription.frequency === 'weekly' ? 'semanal' : 'quincenal'
                }`,
                service_type: 'one_shot',
                phase: 'pending',
                visit_price: priceNum,
                visit_status: 'paid',
                scheduled_date: subscription.next_service_date,
                scheduled_time: '9:00',
                is_flexible: true,
                photos: [],
                address: subscription.user.address || '',
                status: 'pending',
            },
        });

        if (subscription.professional_id) {
            await prisma.jobOffer.create({
                data: {
                    request_id: serviceRequest.id,
                    professional_id: subscription.professional_id,
                    status: 'pending',
                    priority: 'scheduled',
                },
            });

            const proPhone = subscription.professional?.phone;
            if (proPhone) {
                await WhatsAppService.sendTextMessage(
                    proPhone,
                    `📅 *Servicio recurrente programado*\n\n👤 ${subscription.user.name || 'Cliente'}\n🔧 ${
                        subscription.service_category
                    }\n📍 ${subscription.user.address || 'Ver portal'}\n📅 ${subscription.next_service_date.toLocaleDateString(
                        'es-AR'
                    )}\n💵 $${priceNum.toLocaleString('es-AR')}\n\n_Este es un cliente de suscripción. El pago ya está confirmado._`
                );
            }
        } else {
            await ProfessionalMatchingService.findProfessionalsAndCreateOffers(serviceRequest.id);
        }
    }

    /**
     * Maneja fallos en el cobro
     */
    private static async handlePaymentFailure(subscription: SubscriptionWithUserAndPro) {
        const retryCount = subscription.retry_count + 1;
        const priceNum = Number(subscription.price);

        if (retryCount === 1) {
            await prisma.subscription.update({
                where: { id: subscription.id },
                data: { retry_count: 1 },
            });

            await WhatsAppService.sendTextMessage(
                subscription.user.phone,
                `⚠️ *No pudimos procesar el pago*\n\n🔄 ${subscription.service_category}\n💵 $${priceNum.toLocaleString(
                    'es-AR'
                )}\n\n💳 Revisá tu método de pago.\n\nReintentos automáticos en 24hs.\n\nPara actualizar: escribí "pagar suscripción"`
            );
        } else if (retryCount >= 2) {
            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    status: 'paused',
                    retry_count: retryCount,
                },
            });

            await WhatsAppService.sendTextMessage(
                subscription.user.phone,
                `🔴 *Suscripción pausada*\n\n🔄 ${subscription.service_category}\n\nNo pudimos procesar el pago después de 2 intentos.\n\nPara reactivar: escribí "reactivar suscripción"`
            );
        }
    }

    /**
     * Procesa todas las suscripciones que vencen hoy (día calendario local del servidor)
     */
    static async processDueSubscriptions(): Promise<{ processed: number; succeeded: number; failed: number }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dueSubscriptions = await prisma.subscription.findMany({
            where: {
                status: 'active',
                next_service_date: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });

        console.log(`[CRON] Procesando ${dueSubscriptions.length} suscripciones...`);

        let succeeded = 0;
        let failed = 0;

        for (const subscription of dueSubscriptions) {
            const result = await this.processSubscription(subscription.id);
            if (result) {
                succeeded++;
            } else {
                failed++;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log(`[CRON] Completado: ${succeeded} exitosos, ${failed} fallidos`);

        return {
            processed: dueSubscriptions.length,
            succeeded,
            failed,
        };
    }
}
