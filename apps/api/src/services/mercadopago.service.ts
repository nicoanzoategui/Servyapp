import { MercadoPagoConfig, Preference, PaymentRefund, Payment as MPPayment } from 'mercadopago';
import { env } from '../utils/env';
import { prisma } from '@servy/db';

const client = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });

export type PaymentType = 'visit' | 'repair';

export class MercadoPagoService {
    static async createPreference(quotation: { id: string; job_offer_id: string; total_price: number; description?: string | null; quotation_type?: string }, user: { phone: string }, paymentType: PaymentType = 'visit') {
        const preferenceClient = new Preference(client);

        const expireMinutes = paymentType === 'visit' ? env.VISIT_PAYMENT_EXPIRE_MINUTES : 48 * 60;
        const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

        const title =
            paymentType === 'visit'
                ? quotation.description || 'Visita Servy'
                : quotation.description || 'Arreglo Servy';

        const body = {
            items: [
                {
                    id: quotation.id,
                    title,
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
                payment_type: paymentType,
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
                    payment_type: paymentType,
                    status: 'pending',
                },
            });

            return preference.init_point;
        } catch (error) {
            console.error('Error creating MP preference:', error);
            throw new Error('Could not create preference');
        }
    }

    static async getPayment(paymentId: string) {
        const payment = new MPPayment(client);
        return payment.get({ id: paymentId });
    }

    static async refundByMpPaymentId(mpPaymentId: string, amount?: number): Promise<void> {
        const refund = new PaymentRefund(client);
        await refund.create({
            payment_id: mpPaymentId,
            body: amount != null ? { amount } : {},
        });
    }

    static async processRefund(paymentId: string, amount?: number) {
        const refund = new PaymentRefund(client);

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
            throw error;
        }
    }
}
