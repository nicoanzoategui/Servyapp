import express from 'express';
import { parse as parseUrlEncodedBody } from 'node:querystring';
import cors from 'cors';
import morgan from 'morgan';
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

// Verificación rápida en navegador: Twilio solo usa POST; esto confirma URL/HTTPS/DNS correctos.
app.get('/webhook/twilio', (_req, res) => {
    res.type('text/plain; charset=utf-8').send(
        'Servy: webhook Twilio OK. En Twilio Console configurá "When a message comes in" → POST a esta misma URL.'
    );
});

// WhatsApp primero: POST usa body crudo en la ruta (firma Meta). No pasar por express.json().
// Twilio: leer body en crudo y parsear como x-www-form-urlencoded (no depende del Content-Type;
// algunos proxies/Railway alteran el header y express.urlencoded() antes hacía skip y dejaba req.body vacío).
app.use(
    '/webhook/twilio',
    express.raw({ type: () => true, limit: '5mb' }),
    (req, _res, next) => {
        try {
            const buf = req.body;
            const rawOk = Buffer.isBuffer(buf);
            const s = rawOk ? buf.toString('utf8') : '';
            req.body = parseUrlEncodedBody(s);
            const keys = Object.keys(req.body as Record<string, unknown>);
            // Una sola línea reduce entrelazado con otros console.* concurrentes (CRON, etc.)
            console.log(
                '[twilio] parse',
                JSON.stringify({
                    contentType: req.headers['content-type'],
                    contentLength: req.headers['content-length'],
                    transferEncoding: req.headers['transfer-encoding'],
                    rawIsBuffer: rawOk,
                    rawBytes: rawOk ? buf.length : 0,
                    parsedKeys: keys.length,
                    keysSample: keys.slice(0, 12),
                })
            );
            if (!rawOk || keys.length === 0) {
                console.warn(
                    '[twilio] parse: empty or skipped',
                    JSON.stringify({ rawIsBuffer: rawOk, parsedKeys: keys.length })
                );
            }
        } catch (e) {
            console.error('[twilio] parse error:', e);
            req.body = {};
        }
        next();
    }
);
app.use('/webhook', webhookRoutes);

app.use(express.json({ limit: '15mb' }));

/** Rutas públicas del portal (register / forgot / set password) antes del router /auth genérico. */
app.use('/auth/professional', authProfessionalRoutes);
app.use('/auth', authRoutes);

app.post('/webhook/mercadopago', handleMPWebhook);

app.use('/leads', leadsRoutes);
app.use('/professional', professionalRoutes);
app.use('/admin', adminRoutes);
app.use('/api', operationalApiRoutes);
app.use('/api/finance', financeRouter);

// Apply global error handler middleware
app.use(errorHandler);

startCronJobs();
startCrons();

app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
});
