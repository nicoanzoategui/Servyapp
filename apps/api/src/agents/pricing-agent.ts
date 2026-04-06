import { randomUUID } from 'crypto';
import { env } from '../utils/env';
import { redis } from '../utils/redis';
import { prisma } from '@servy/db';
import type { QuoteParams, QuoteResult } from './types';
import { getActivePricingConfig } from '../lib/agents-queries';
import { insertAgentLog } from '../lib/agent-log';
import { geminiGenerateJson } from '../lib/gemini-json';
import { buildPricingMaterialsPrompt } from './prompts/pricing-materials';

const DEMAND_TTL_SEC = 35 * 60;
const MATERIAL_TTL_SEC = 7 * 3600;
const QUOTE_TTL_SEC = 10 * 60;

const MLA_SEARCH_BY_CATEGORY: Record<string, string> = {
    plomeria: 'caño cobre desagüe',
    electricidad: 'termomagnetica 2x16',
    cerrajeria: 'cerradura puerta blindada',
    gas: 'flexible gas envasado',
    aires: 'repuesto aire acondicionado split',
};

function num(v: string | number | null | undefined): number {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
}

function timeMultiplierKey(d: Date): string {
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Argentina/Buenos_Aires',
        weekday: 'short',
        hour: '2-digit',
        hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
    const wd = map.weekday || '';
    const hour = parseInt(map.hour || '12', 10);
    if (wd === 'Sun') return 'sunday';
    if (hour >= 22 || hour < 6) return 'night';
    if (wd === 'Sat') return hour < 14 ? 'saturday_morning' : 'saturday_afternoon';
    if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(wd)) {
        if (hour >= 9 && hour < 18) return 'weekday_day';
        if (hour >= 18 && hour < 22) return 'weekday_evening';
    }
    return 'weekday_day';
}

function demandFromCount(
    count: number,
    thresholds: Record<string, { max: number; multiplier: number }>
): { level: string; mult: number; label: string } {
    const low = thresholds.low;
    const med = thresholds.medium;
    const high = thresholds.high;
    const peak = thresholds.peak;
    if (low && count <= low.max) return { level: 'low', mult: low.multiplier, label: 'Baja' };
    if (med && count <= med.max) return { level: 'medium', mult: med.multiplier, label: 'Media' };
    if (high && count <= high.max) return { level: 'high', mult: high.multiplier, label: 'Alta' };
    return { level: 'peak', mult: peak?.multiplier ?? 1.35, label: 'Pico' };
}

async function getDemandCount(category: string, zone: string): Promise<number> {
    try {
        const v = await redis.get(`pricing:demand:${category}:${zone}`);
        return v ? parseInt(v, 10) || 0 : 0;
    } catch {
        return 0;
    }
}

export async function bumpDemand(category: string, zone: string): Promise<void> {
    try {
        const key = `pricing:demand:${category}:${zone}`;
        await redis.incr(key);
        await redis.expire(key, DEMAND_TTL_SEC);
    } catch {
        /* redis optional */
    }
}

async function getMaterialAvg(category: string): Promise<number> {
    try {
        const cached = await redis.get(`pricing:materials:${category}`);
        if (cached) return parseFloat(cached) || 0;
    } catch {
        /* */
    }
    const rows = await prisma.$queryRaw<{ avg: string | null }[]>`
        SELECT AVG(price_ars)::text AS avg
        FROM material_prices
        WHERE category = ${category} AND is_active = true
          AND scraped_at > now() - interval '30 days'
    `;
    const a = rows[0]?.avg;
    return a ? parseFloat(a) : 0;
}

export async function generateQuote(params: QuoteParams): Promise<QuoteResult | null> {
    const cfg = await getActivePricingConfig();
    if (!cfg) {
        await insertAgentLog({
            agent: 'pricing',
            event: 'quote_failed',
            level: 'warn',
            details: { reason: 'no_pricing_config' },
        });
        return null;
    }

    await bumpDemand(params.category, params.zone);

    const laborBase = num(cfg.labor_base[params.jobType] ?? cfg.labor_base[Object.keys(cfg.labor_base)[0] ?? ''] ?? 10000);
    const zoneM = num(cfg.zone_multipliers[params.zone] ?? cfg.zone_multipliers['gba_oeste_sur'] ?? 1);
    const tk = timeMultiplierKey(params.datetime);
    const timeM = num(cfg.time_multipliers[tk] ?? cfg.time_multipliers['weekday_day'] ?? 1);

    const demandCount = await getDemandCount(params.category, params.zone);
    const d = demandFromCount(demandCount, cfg.demand_thresholds);
    const demandM = d.mult;

    const materialCost = await getMaterialAvg(params.category);

    const commission = num(cfg.servy_commission);
    const core = laborBase * zoneM * timeM * demandM + materialCost;
    const rangeMin = Math.round(core * 0.9);
    const rangeMax = Math.round(core * 1.1);
    const recommended = Math.round(core);
    const validUntil = new Date(Date.now() + QUOTE_TTL_SEC * 1000);

    const net = (gross: number) => Math.round(gross * (1 - commission));

    const quoteId = randomUUID();
    try {
        await redis.set(
            `pricing:quote:${quoteId}`,
            JSON.stringify({
                ...params,
                rangeMin,
                rangeMax,
                recommended,
                validUntil: validUntil.toISOString(),
            }),
            'EX',
            QUOTE_TTL_SEC
        );
    } catch {
        /* */
    }

    try {
        await prisma.$executeRawUnsafe(
            `INSERT INTO price_quotes (
                id, category, job_type, zone, zone_multiplier, time_multiplier, demand_multiplier, demand_level,
                material_cost, labor_base, price_calculated, range_min, range_max, range_recommended,
                servy_commission, provider_net, expired_at
            ) VALUES (
                $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )`,
            quoteId,
            params.category,
            params.jobType,
            params.zone,
            zoneM,
            timeM,
            demandM,
            d.level,
            materialCost,
            laborBase,
            recommended,
            rangeMin,
            rangeMax,
            recommended,
            commission,
            net(recommended),
            validUntil
        );
    } catch (e) {
        await insertAgentLog({
            agent: 'pricing',
            event: 'quote_persist_failed',
            level: 'error',
            details: { message: String(e) },
        });
    }

    return {
        rangeMin,
        rangeMax,
        recommended,
        demandLevel: d.level,
        demandLabel: d.label,
        multipliers: { zone: zoneM, time: timeM, demand: demandM },
        providerNetMin: net(rangeMin),
        providerNetMax: net(rangeMax),
        providerNetRecommended: net(recommended),
        validUntil,
    };
}

interface MlSearchItem {
    price: number;
    title: string;
    permalink?: string;
}

async function fetchMlSearch(q: string): Promise<MlSearchItem[]> {
    const base = env.MERCADOLIBRE_API_URL.replace(/\/$/, '');
    const url = `${base}/sites/MLA/search?q=${encodeURIComponent(q)}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { price: number; title: string; permalink: string }[] };
    return (data.results || []).map((r) => ({ price: r.price, title: r.title, permalink: r.permalink }));
}

interface MaterialGeminiOut {
    usedIndices: number[];
    weights: number[];
    weightedAverage: number;
    note?: string;
}

export async function scrapeMaterials(): Promise<void> {
    const started = Date.now();
    for (const [category, q] of Object.entries(MLA_SEARCH_BY_CATEGORY)) {
        try {
            const items = await fetchMlSearch(q);
            if (items.length === 0) continue;

            const indexed = items.map((it, i) => ({ i, title: it.title, price: it.price }));
            const prompt = buildPricingMaterialsPrompt(category, JSON.stringify(indexed));
            const g = await geminiGenerateJson<MaterialGeminiOut>(prompt, 'Respondé únicamente el JSON pedido.');
            let avg: number;
            const toInsert: MlSearchItem[] = [];

            if (g.ok && g.data && Array.isArray(g.data.usedIndices) && g.data.weightedAverage > 0) {
                const { usedIndices, weights, weightedAverage } = g.data;
                avg = weightedAverage;
                for (let k = 0; k < usedIndices.length; k++) {
                    const idx = usedIndices[k]!;
                    const w = weights?.[k] ?? 1;
                    const it = items[idx];
                    if (it && w > 0.2) toInsert.push(it);
                }
                if (toInsert.length === 0) {
                    toInsert.push(...items.slice(0, 5));
                    avg = items.slice(0, 5).reduce((s, i) => s + i.price, 0) / Math.min(5, items.length);
                }
            } else {
                toInsert.push(...items.slice(0, 5));
                avg = items.slice(0, 5).reduce((s, i) => s + i.price, 0) / Math.min(5, items.length);
                await insertAgentLog({
                    agent: 'pricing',
                    event: 'materials_gemini_fallback',
                    level: 'info',
                    details: { category, error: g.error },
                    tokensUsed: g.tokensUsed,
                });
            }

            let prev = 0;
            try {
                const prevRaw = await redis.get(`pricing:materials:${category}`);
                prev = prevRaw ? parseFloat(prevRaw) : 0;
            } catch {
                /* */
            }

            if (prev > 0 && avg > prev * 1.15) {
                await insertAgentLog({
                    agent: 'pricing',
                    event: 'material_spike',
                    level: 'warn',
                    details: {
                        category,
                        prev,
                        avg,
                        pct: ((avg / prev - 1) * 100).toFixed(1),
                        admin_dashboard: true,
                    },
                });
            }

            for (const it of toInsert.slice(0, 8)) {
                await prisma.$executeRawUnsafe(
                    `INSERT INTO material_prices (category, item_name, item_url, source, price_ars)
                     VALUES ($1, $2, $3, 'mercadolibre', $4)`,
                    category,
                    it.title.slice(0, 200),
                    it.permalink ?? null,
                    it.price
                );
            }

            try {
                await redis.set(`pricing:materials:${category}`, String(Math.round(avg)), 'EX', MATERIAL_TTL_SEC);
            } catch {
                /* */
            }
        } catch (e) {
            await insertAgentLog({
                agent: 'pricing',
                event: 'scrape_category_failed',
                level: 'error',
                details: { category, message: String(e), stack: (e as Error).stack },
            });
        }
    }
    await insertAgentLog({
        agent: 'pricing',
        event: 'scrape_complete',
        level: 'info',
        durationMs: Date.now() - started,
    });
}
