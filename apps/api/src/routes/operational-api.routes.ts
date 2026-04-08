import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { generateQuote, scrapeMaterials } from '../agents/pricing-agent';
import { listRecentMaterialPrices, listRecentQuotes } from '../lib/agents-queries';
import { redis } from '../utils/redis';
import { prisma } from '@servy/db';
import {
    scoreCandidateText,
    uploadCustomAudience,
    syncAudienceMembers,
    launchCampaign,
} from '../agents/recruitment-agent';
import { enqueueRunRecruitmentCycle } from '../lib/queue';
import { insertAgentLog } from '../lib/agent-log';

const router = Router();
router.use(authenticateJWT, requireRole('admin'));

router.get('/pricing/quote', async (req: Request, res: Response) => {
    try {
        const { category, jobType, zone, datetime } = req.query;
        if (!category || !jobType || !zone) {
            res.status(400).json({ success: false, error: 'category, jobType, zone requeridos' });
            return;
        }
        const dt = datetime ? new Date(String(datetime)) : new Date();
        const quote = await generateQuote({
            category: String(category),
            jobType: String(jobType),
            zone: String(zone),
            datetime: dt,
        });
        if (!quote) {
            res.status(503).json({ success: false, error: 'Sin configuración de pricing' });
            return;
        }
        res.json({ success: true, data: quote });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/pricing/demand', async (_req: Request, res: Response) => {
    try {
        const keys = await redis.keys('pricing:demand:*');
        const out: Record<string, string> = {};
        for (const k of keys.slice(0, 200)) {
            out[k] = (await redis.get(k)) || '0';
        }
        res.json({ success: true, data: out });
    } catch {
        res.json({ success: true, data: {} });
    }
});

router.post('/pricing/accept', async (req: Request, res: Response) => {
    try {
        const { quoteId, priceChosen, providerId } = req.body || {};
        if (!quoteId || priceChosen == null) {
            res.status(400).json({ success: false, error: 'quoteId y priceChosen requeridos' });
            return;
        }
        await prisma.$executeRawUnsafe(
            `UPDATE price_quotes SET price_chosen = $2, accepted_at = now(), provider_id = COALESCE($3, provider_id)
             WHERE id = $1::uuid`,
            quoteId,
            Number(priceChosen),
            providerId ?? null
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/pricing/materials', async (req: Request, res: Response) => {
    try {
        const cat = String(req.query.category || 'plomeria');
        const rows = await listRecentMaterialPrices(cat, 40);
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/pricing/quotes/recent', async (_req: Request, res: Response) => {
    try {
        const rows = await listRecentQuotes(40);
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/availability/active', async (_req: Request, res: Response) => {
    try {
        const keys = await redis.keys('provider:status:*');
        const data: { providerId: string; status: string }[] = [];
        for (const k of keys.slice(0, 500)) {
            const id = k.replace('provider:status:', '');
            const status = (await redis.get(k)) || '';
            data.push({ providerId: id, status });
        }
        res.json({ success: true, data });
    } catch {
        res.json({ success: true, data: [] });
    }
});

router.get('/availability/nearby', async (req: Request, res: Response) => {
    try {
        const lat = parseFloat(String(req.query.lat || ''));
        const lng = parseFloat(String(req.query.lng || ''));
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            res.status(400).json({ success: false, error: 'lat y lng requeridos' });
            return;
        }
        const keys = await redis.keys('provider:location:*');
        const nearby: { providerId: string; lat: number; lng: number; km: number }[] = [];
        for (const k of keys.slice(0, 200)) {
            const raw = await redis.get(k);
            if (!raw) continue;
            try {
                const p = JSON.parse(raw) as { lat: number; lng: number };
                const km = haversine(lat, lng, p.lat, p.lng);
                nearby.push({ providerId: k.replace('provider:location:', ''), lat: p.lat, lng: p.lng, km });
            } catch {
                /* */
            }
        }
        nearby.sort((a, b) => a.km - b.km);
        res.json({ success: true, data: nearby.slice(0, 30) });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

router.post('/availability/checkin', async (req: Request, res: Response) => {
    try {
        const { providerId } = req.body || {};
        if (!providerId) {
            res.status(400).json({ success: false, error: 'providerId requerido' });
            return;
        }
        await redis.set(`provider:status:${providerId}`, 'active', 'EX', 12 * 3600);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/availability/checkout', async (req: Request, res: Response) => {
    try {
        const { providerId } = req.body || {};
        if (!providerId) {
            res.status(400).json({ success: false, error: 'providerId requerido' });
            return;
        }
        await redis.set(`provider:status:${providerId}`, 'inactive', 'EX', 12 * 3600);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/availability/map-markers', async (_req: Request, res: Response) => {
    try {
        const locKeys = (await redis.keys('provider:location:*').catch(() => [])) as string[];
        const markers: {
            providerId: string;
            lat: number;
            lng: number;
            status: string;
            updatedAt?: string;
        }[] = [];

        for (const k of locKeys.slice(0, 400)) {
            const id = k.replace('provider:location:', '');
            const raw = await redis.get(k);
            const st = (await redis.get(`provider:status:${id}`)) || 'unknown';
            if (!raw) continue;
            try {
                const p = JSON.parse(raw) as { lat: number; lng: number; updatedAt?: string };
                if (typeof p.lat === 'number' && typeof p.lng === 'number') {
                    markers.push({
                        providerId: id,
                        lat: p.lat,
                        lng: p.lng,
                        status: st,
                        updatedAt: p.updatedAt,
                    });
                }
            } catch {
                /* */
            }
        }

        res.json({
            success: true,
            data: {
                center: { lat: -34.6037, lng: -58.3816 },
                bbox: { minLng: -58.75, minLat: -34.85, maxLng: -58.25, maxLat: -34.45 },
                markers,
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/quality/reviews', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM quality_reviews ORDER BY created_at DESC LIMIT 100`;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/quality/complaints', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT * FROM quality_reviews
            WHERE is_complaint = true AND resolved = false
            ORDER BY created_at DESC LIMIT 100
        `;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/quality/resolve/:id', async (req: Request, res: Response) => {
    try {
        await prisma.$executeRawUnsafe(
            `UPDATE quality_reviews SET resolved = true, resolved_at = now(), resolution_notes = COALESCE($2, '')
             WHERE id = $1::uuid`,
            req.params.id,
            (req.body?.notes as string) || ''
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/quality/provider/:id', async (req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT * FROM provider_ratings WHERE provider_id = $1 LIMIT 1`,
            req.params.id
        );
        res.json({ success: true, data: (rows as unknown[])[0] ?? null });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/retention/at-risk', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT ph.*, p.name, p.phone, p.categories
            FROM provider_health ph
            JOIN professionals p ON p.id = ph.provider_id
            WHERE ph.risk_level IN ('watch', 'at_risk', 'churned')
            ORDER BY ph.updated_at DESC
            LIMIT 200
        `;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/retention/messages', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT * FROM retention_messages ORDER BY created_at DESC LIMIT 100
        `;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/retention/message/:id', async (req: Request, res: Response) => {
    try {
        const pro = await prisma.professional.findUnique({ where: { id: req.params.id } });
        if (!pro) {
            res.status(404).json({ success: false, error: 'Profesional no encontrado' });
            return;
        }
        const text = String(req.body?.message || '').trim() || 'Hola desde Servy — ¿podés confirmar si seguís disponible?';
        const { WhatsAppService } = await import('../services/whatsapp.service');
        await WhatsAppService.sendTextMessage(pro.phone, text);
        await prisma.$executeRawUnsafe(
            `INSERT INTO retention_messages (provider_id, risk_level, message_sent)
             VALUES ($1, 'healthy', $2)`,
            pro.id,
            text
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/fraud/alerts', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT * FROM fraud_alerts ORDER BY created_at DESC LIMIT 200
        `;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/fraud/review/:id', async (req: Request, res: Response) => {
    try {
        const { action, notes } = req.body || {};
        const status = action === 'dismiss' ? 'dismissed' : 'reviewed';
        await prisma.$executeRawUnsafe(
            `UPDATE fraud_alerts SET status = $2, reviewed_at = now(), reviewed_by = 'admin', action_taken = $3
             WHERE id = $1::uuid`,
            req.params.id,
            status,
            (notes as string) || status
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/fraud/patterns', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM fraud_patterns WHERE is_active = true`;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/forecast/weekly', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT * FROM demand_forecasts ORDER BY created_at DESC LIMIT 60
        `;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/forecast/expansion', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT * FROM expansion_opportunities ORDER BY detected_at DESC LIMIT 60
        `;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/forecast/dismiss/:id', async (req: Request, res: Response) => {
    try {
        await prisma.$executeRawUnsafe(
            `UPDATE expansion_opportunities SET status = 'dismissed' WHERE id = $1::uuid`,
            req.params.id
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/recruitment/candidates', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM recruitment_candidates ORDER BY created_at DESC LIMIT 100`;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/recruitment/candidates', async (req: Request, res: Response) => {
    try {
        const b = req.body || {};
        await prisma.$executeRawUnsafe(
            `INSERT INTO recruitment_candidates (source, name, phone, zone, category, status, notes)
             VALUES ('manual', $1, $2, $3, $4, 'detected', $5)`,
            b.name || null,
            b.phone || null,
            b.zone || null,
            b.category || null,
            b.notes || null
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.patch('/recruitment/candidates/:id', async (req: Request, res: Response) => {
    try {
        const { status, notes } = req.body || {};
        await prisma.$executeRawUnsafe(
            `UPDATE recruitment_candidates SET status = COALESCE($2, status), notes = COALESCE($3, notes), updated_at = now()
             WHERE id = $1::uuid`,
            req.params.id,
            status || null,
            notes || null
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/recruitment/campaigns', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM recruitment_campaigns ORDER BY created_at DESC LIMIT 50`;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/recruitment/campaigns/suggest', async (_req: Request, res: Response) => {
    try {
        const { draftCampaignsFromExpansion } = await import('../agents/recruitment-agent');
        await draftCampaignsFromExpansion();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/recruitment/campaigns/:id/approve', async (req: Request, res: Response) => {
    try {
        const campaignId = req.params.id;

        // Obtener datos de la campaña
        const rows = await prisma.$queryRaw<{ category: string; zone: string }[]>`
            SELECT category, zone FROM recruitment_campaigns WHERE id = ${campaignId}::uuid
        `;
        if (!rows.length) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });

        const { category, zone } = rows[0];

        // Marcar como pending_approval
        await prisma.$executeRawUnsafe(
            `UPDATE recruitment_campaigns SET status = 'pending_approval', approved_at = now() WHERE id = $1::uuid`,
            campaignId
        );

        // Subir audiencia a Meta y lanzar campaña
        const audienceId = await uploadCustomAudience(category, zone);
        if (audienceId) {
            await syncAudienceMembers(audienceId, category, zone);
        }
        await launchCampaign(campaignId);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/recruitment/campaigns/:id/pause', async (req: Request, res: Response) => {
    try {
        await prisma.$executeRawUnsafe(
            `UPDATE recruitment_campaigns SET status = 'paused' WHERE id = $1::uuid`,
            req.params.id
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/recruitment/scrape', async (_req: Request, res: Response) => {
    try {
        await enqueueRunRecruitmentCycle();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/recruitment/groups', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM facebook_groups ORDER BY group_name`;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/recruitment/groups', async (req: Request, res: Response) => {
    try {
        const b = req.body || {};
        await prisma.$executeRawUnsafe(
            `INSERT INTO facebook_groups (group_url, group_name, category, zone)
             VALUES ($1, $2, $3, $4)`,
            b.group_url,
            b.group_name,
            b.category,
            b.zone
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/recruitment/coverage', async (_req: Request, res: Response) => {
    try {
        const zones = await prisma.$queryRaw<{ zone: string; cnt: bigint }[]>`
            SELECT z AS zone, COUNT(DISTINCT p.id)::bigint AS cnt
            FROM professionals p,
            LATERAL unnest(p.zones) AS z
            WHERE p.status = 'active'
            GROUP BY z
            ORDER BY z
        `;

        const highRows = await prisma.$queryRaw<{ zone: string }[]>`
            SELECT DISTINCT zone FROM expansion_opportunities
            WHERE priority = 'high' AND status = 'detected'
        `;
        const high = new Set(highRows.map((r: { zone: string }) => r.zone));

        const data = zones.map((r: { zone: string; cnt: bigint }) => {
            const c = Number(r.cnt);
            let coverage: 'green' | 'yellow' | 'red' = 'red';
            if (c >= 3) coverage = 'green';
            else if (c >= 1) coverage = 'yellow';
            if (high.has(r.zone)) coverage = 'red';
            return {
                zone: r.zone,
                activeProviders: c,
                coverage,
                expansionHighPriority: high.has(r.zone),
            };
        });

        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/experiments', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM experiments ORDER BY created_at DESC`;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/experiments', async (req: Request, res: Response) => {
    try {
        const b = req.body || {};
        await prisma.$executeRawUnsafe(
            `INSERT INTO experiments (name, description, status, hypothesis, pricing_variant)
             VALUES ($1, $2, COALESCE($3, 'draft'), $4, $5::jsonb)`,
            b.name,
            b.description || null,
            b.status || 'draft',
            b.hypothesis || null,
            JSON.stringify(b.pricing_variant || {})
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/experiments/waitlist', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT w.*, e.name AS experiment_name FROM experiment_waitlist w
            LEFT JOIN experiments e ON e.id = w.experiment_id
            ORDER BY w.created_at DESC LIMIT 200
        `;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.get('/agents/tasks', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT * FROM agent_tasks ORDER BY created_at DESC LIMIT 100
        `;
        res.json({ success: true, data: rows });
    } catch {
        res.json({ success: true, data: [], note: 'Ejecutá la migración agent_tasks si la tabla no existe.' });
    }
});

router.get('/agents/logs', async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRaw`
            SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT 150
        `;
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/agents/scrape-prices', async (_req: Request, res: Response) => {
    try {
        await scrapeMaterials();
        await insertAgentLog({ agent: 'pricing', event: 'manual_scrape', level: 'info' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

router.post('/recruitment/score-text', async (req: Request, res: Response) => {
    try {
        const text = String(req.body?.text || '');
        const out = await scoreCandidateText(text);
        res.json({ success: true, data: out });
    } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
    }
});

export default router;
