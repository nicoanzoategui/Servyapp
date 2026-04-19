import { Request, Response } from 'express';
import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';

export const releasePayment = async (req: Request, res: Response) => {
    try {
        const jobId = req.params.jobId;

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                quotation: {
                    include: {
                        payment: true,
                        job_offer: {
                            include: {
                                professional: true,
                                service_request: { include: { user: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!job) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: system-ui; padding: 20px; text-align: center; }
                        .error { color: #dc2626; margin-top: 40px; }
                    </style>
                </head>
                <body>
                    <h1 class="error">❌ Trabajo no encontrado</h1>
                    <p>Este código QR no es válido</p>
                </body>
                </html>
            `);
        }

        const payment = job.quotation.payment;
        if (!payment || payment.status !== 'approved') {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: system-ui; padding: 20px; text-align: center; }
                        .error { color: #dc2626; margin-top: 40px; }
                    </style>
                </head>
                <body>
                    <h1 class="error">⚠️ Pago no disponible</h1>
                    <p>Este pago aún no está confirmado</p>
                </body>
                </html>
            `);
        }

        if (job.payment_released_at) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: system-ui; padding: 20px; text-align: center; }
                        .success { color: #16a34a; margin-top: 40px; }
                    </style>
                </head>
                <body>
                    <h1 class="success">✅ Pago ya liberado</h1>
                    <p>Este pago fue liberado el ${new Date(job.payment_released_at).toLocaleString('es-AR')}</p>
                </body>
                </html>
            `);
        }

        await prisma.job.update({
            where: { id: jobId },
            data: {
                payment_released_at: new Date(),
                completed_at: new Date(),
                status: 'completed',
            },
        });

        const professional = job.quotation.job_offer.professional;
        const amount = job.quotation.total_price.toLocaleString('es-AR');
        await WhatsAppService.sendTextMessage(
            professional.phone,
            `💰 *¡Pago liberado!*\n\nEl cliente confirmó el trabajo completado.\n\n*$${amount}* están disponibles en tu cuenta.\n\nPodés verlo en el portal: portal.servy.lat/earnings`
        );

        const user = job.quotation.job_offer.service_request.user;
        if (user?.phone) {
            await WhatsAppService.sendTextMessage(
                user.phone,
                `✅ *Pago liberado*\n\nConfirmaste que el trabajo fue completado.\n\nGracias por usar Servy. Si necesitás algo más, escribinos cuando quieras.`
            );
        }

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { 
                        font-family: system-ui; 
                        padding: 20px; 
                        text-align: center;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        max-width: 400px;
                    }
                    .success { 
                        color: #16a34a; 
                        font-size: 3em;
                        margin: 0 0 20px 0;
                    }
                    h1 { margin: 0 0 10px 0; color: #1f2937; }
                    .amount { 
                        font-size: 2em; 
                        font-weight: bold; 
                        color: #667eea;
                        margin: 20px 0;
                    }
                    p { color: #6b7280; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">✅</div>
                    <h1>¡Pago liberado!</h1>
                    <div class="amount">$${amount}</div>
                    <p>El técnico recibirá su pago en breve.</p>
                    <p style="margin-top: 30px; font-size: 0.9em;">Gracias por usar Servy</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('[payment-release] Error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: system-ui; padding: 20px; text-align: center; }
                    .error { color: #dc2626; margin-top: 40px; }
                </style>
            </head>
            <body>
                <h1 class="error">❌ Error</h1>
                <p>Hubo un problema al liberar el pago. Intentá de nuevo.</p>
            </body>
            </html>
        `);
    }
};
