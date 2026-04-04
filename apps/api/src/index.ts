import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import authProfessionalRoutes from './routes/auth.professional.routes';
import webhookRoutes from './routes/webhook.routes';
import leadsRoutes from './routes/leads.routes';
import professionalRoutes from './routes/professional.routes';
import adminRoutes from './routes/admin.routes';
import { handleMPWebhook } from './controllers/webhook.controller';
import { env } from './utils/env';
import { errorHandler } from './middlewares/errorHandler';
import { startCronJobs } from './workers/cron';

/** CORS_ORIGIN: `*`, una URL, o varias separadas por coma. */
function resolveCorsOrigin(raw: string): boolean | string | string[] {
    const v = raw.trim();
    if (v === '*') return true;
    if (v.includes(',')) {
        return v.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return v;
}

const app = express();

app.use(cors({ origin: resolveCorsOrigin(env.CORS_ORIGIN) }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WhatsApp primero: POST usa body crudo en la ruta (firma Meta). No pasar por express.json().
app.use('/webhook', webhookRoutes);

app.use(express.json());

/** Rutas públicas del portal (register / forgot / set password) antes del router /auth genérico. */
app.use('/auth/professional', authProfessionalRoutes);
app.use('/auth', authRoutes);

app.post('/webhook/mercadopago', handleMPWebhook);

app.use('/leads', leadsRoutes);
app.use('/professional', professionalRoutes);
app.use('/admin', adminRoutes);

// Apply global error handler middleware
app.use(errorHandler);

startCronJobs();

app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
});
