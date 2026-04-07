import { MercadoPagoConfig, Preference, PaymentRefund, Payment as MPPayment } from 'mercadopago';
import { env } from '../utils/env';
import { captureException } from '../lib/sentry';
import { prisma } from '@servy/db';

const client = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });

export class MercadoPagoService {
    static async createPreference(quotation: any, user: any) {
        const preferenceClient = new Preference(client);

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const body = {
            items: [
                {
                    id: quotation.id,
                    title: quotation.description || 'Servicio Servy',
                    quantity: 1,
                    unit_price: quotation.total_price,
                },
            ],
            payer: {
                email: `usuario_${user.phone}@servy.lat`,
                phone: {
                    area_code: '54',
                    number: String(user.phone || ''),
                },
            },
            back_urls: {
                success: `${env.FRONTEND_URL}/payment/success`,
                failure: `${env.FRONTEND_URL}/payment/failure`,
                pending: `${env.FRONTEND_URL}/payment/pending`,
            },
            auto_return: 'approved',
            notification_url: `${env.API_PUBLIC_URL.replace(/\/$/, '')}/webhook/mercadopago`,
            metadata: {
                quotation_id: quotation.id,
                job_offer_id: quotation.job_offer_id,
                user_phone: user.phone,
            },
            expires: true,
            expiration_date_to: expiresAt.toISOString(),
        };

        try {
            const preference = await preferenceClient.create({ body });

            await prisma.payment.create({
                data: {
                    quotation_id: quotation.id,
                    mp_preference_id: preference.id,
                    amount: quotation.total_price,
                    status: 'pending',
                },
            });

            console.log(
                '[MP Preference]',
                JSON.stringify(
                    {
                        items: preference.items,
                        payer: preference.payer,
                        back_urls: preference.back_urls,
                    },
                    null,
                    2
                )
            );

            return preference.init_point;
        } catch (error) {
            console.error('Error creating MP preference:', error);
            captureException(error, { tags: { area: 'mercadopago', op: 'createPreference' } });
            throw new Error('Could not create preference');
        }
    }

    static async getPayment(paymentId: string) {
        const payment = new MPPayment(client);
        return payment.get({ id: paymentId });
    }

    /** Reembolso total por id de pago en Mercado Pago (API). */
    static async refundByMpPaymentId(mpPaymentId: string, amount?: number): Promise<void> {
        const refund = new PaymentRefund(client);
        await refund.create({
            payment_id: mpPaymentId,
            body: amount != null ? { amount } : {},
        });
    }

    static async processRefund(paymentId: string, amount?: number) {
        const refund = new PaymentRefund(client);

        // Convert payment DB ID to MP Payment ID if we store it
        const dbPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
        });

        if (!dbPayment || !dbPayment.mp_payment_id) {
            throw new Error('MercadoPago payment ID not found');
        }

        try {
            await refund.create({
                payment_id: dbPayment.mp_payment_id,
                body: amount ? { amount } : {},
            });

            await prisma.payment.update({
                where: { id: paymentId },
                data: { status: 'refunded' },
            });

            return true;
        } catch (error) {
            console.error('Error processing refund:', error);
            captureException(error, { tags: { area: 'mercadopago', op: 'refund' } });
            throw error;
        }
    }
}
