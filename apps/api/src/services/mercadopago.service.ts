import { MercadoPagoConfig, Preference, PaymentRefund, Payment as MPPayment } from 'mercadopago';
import { env } from '../utils/env';
import { prisma } from '@servy/db';

const client = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });

export type PaymentType = 'visit' | 'repair';

export const MP_OPEN_IN_BROWSER_HINT =
    '💡 Si el botón de pagar no funciona, tocá los 3 puntos arriba a la derecha y elegí Abrir en el navegador.';

export function isMercadoPagoTestToken(token = env.MP_ACCESS_TOKEN): boolean {
    return token.trim().startsWith('TEST-');
}

export function mercadoPagoTokenMode(token = env.MP_ACCESS_TOKEN): 'test' | 'production' | 'unknown' {
    const t = token.trim();
    if (t.startsWith('TEST-')) return 'test';
    if (t.startsWith('APP_USR-')) return 'production';
    return 'unknown';
}

export function checkoutUrlFromPreference(preference: {
    init_point?: string | null;
    sandbox_init_point?: string | null;
}): string | null {
    if (isMercadoPagoTestToken()) {
        return preference.sandbox_init_point || preference.init_point || null;
    }
    return preference.init_point || preference.sandbox_init_point || null;
}

export class MercadoPagoService {
    static async createPreference(
        quotation: {
            id: string;
            job_offer_id: string;
            total_price: number;
            description?: string | null;
            quotation_type?: string;
        },
        user: { phone: string },
        paymentType: PaymentType = 'visit',
        chargeAmount?: number
    ) {
        const preferenceClient = new Preference(client);

        const expireMinutes = paymentType === 'visit' ? env.VISIT_PAYMENT_EXPIRE_MINUTES : 48 * 60;
        const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);
        const unitPrice = chargeAmount ?? quotation.total_price;

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
                    unit_price: unitPrice,
                    currency_id: 'ARS',
                },
            ],
            payer: {
                email: `usuario_${user.phone}@servy.lat`,
            },
            back_urls: {
                success: `${env.FRONTEND_URL.replace(/\/$/, '')}/payment/success`,
                failure: `${env.FRONTEND_URL.replace(/\/$/, '')}/payment/failure`,
                pending: `${env.FRONTEND_URL.replace(/\/$/, '')}/payment/pending`,
            },
            auto_return: 'approved' as const,
            notification_url: `${env.API_PUBLIC_URL.replace(/\/$/, '')}/webhook/mercadopago`,
            external_reference: quotation.id,
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
            const checkoutUrl = checkoutUrlFromPreference(preference);
            console.log('[MP] preferencia creada', {
                tokenMode: mercadoPagoTokenMode(),
                usedSandboxUrl: isMercadoPagoTestToken(),
                hasInitPoint: Boolean(preference.init_point),
                hasSandboxInitPoint: Boolean(preference.sandbox_init_point),
            });
            if (!checkoutUrl) {
                throw new Error('Mercado Pago no devolvió init_point ni sandbox_init_point');
            }

            await prisma.payment.create({
                data: {
                    quotation_id: quotation.id,
                    mp_preference_id: preference.id,
                    amount: unitPrice,
                    payment_type: paymentType,
                    status: 'pending',
                },
            });

            return checkoutUrl;
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
