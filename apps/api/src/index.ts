import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { getBullBoardRouter } from './lib/bull-board-setup';
import { authenticateJWT, requireRole } from './middlewares/auth.middleware';
import { startBullmqWorkers } from './workers/start-bullmq';
import authRoutes from './routes/auth.routes';
import authProfessionalRoutes from './routes/auth.professional.routes';
import webhookRoutes from './routes/webhook.routes';
import leadsRoutes from './routes/leads.routes';
import professionalRoutes from './routes/professional.routes';
import adminRoutes from './routes/admin.routes';
import operationalApiRoutes from './routes/operational-api.routes';
import { financeRouter } from './routes/finance';
import { handleMPWebhook } from './controllers/webhook.controller';
import { env } from './utils/env';
import { errorHandler } from './middlewares/errorHandler';
import { startCronJobs } from './workers/cron';
import { startCrons } from './crons';
import { initSentry } from './lib/sentry';
import { apiRateLimit, authRateLimit } from './middlewares/rate-limit';

initSentry();

const app = express();

app.use(
    cors({
        origin: (origin, callback) => {
            const raw = (env.CORS_ORIGIN || '').trim();
            if (raw === '*') {
                callback(null, true);
                return;
            }
            const allowed = raw.split(',').map((o) => o.trim()).filter(Boolean);
            if (!origin || allowed.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    })
);
app.use(morgan('dev'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/** Temporal: listar modelos disponibles en la API de Gemini (quitar en producción). */
app.get('/debug/gemini-models', async (_req, res) => {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`
        );
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.json({ error: String(err) });
    }
});

// WhatsApp primero: POST usa body crudo en la ruta (firma Meta). No pasar por express.json().
app.use('/webhook', webhookRoutes);

app.use(express.json());

app.use('/auth', authRateLimit);

/** Rutas públicas del portal (register / forgot / set password) antes del router /auth genérico. */
app.use('/auth/professional', authProfessionalRoutes);
app.use('/auth', authRoutes);

app.post('/webhook/mercadopago', handleMPWebhook);

app.use('/leads', leadsRoutes);
app.use('/professional', professionalRoutes);
app.use('/admin/queues', authenticateJWT, requireRole('admin'), getBullBoardRouter());
app.use('/admin', adminRoutes);
app.use('/api', apiRateLimit);
app.use('/api', operationalApiRoutes);
app.use('/api/finance', financeRouter);

// Apply global error handler middleware
app.use(errorHandler);

startBullmqWorkers();
startCronJobs();
startCrons();

app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
});
