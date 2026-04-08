import { prisma } from '@servy/db';
import { geminiGenerateJson } from '../lib/gemini-json';
import { insertAgentLog } from '../lib/agent-log';
import { enqueueAgentTask } from '../lib/agent-tasks';
import { upcomingHolidays } from '../lib/ar-holidays';
import { FORECAST_PROMPT } from './prompts/forecast';
import type { ForecastRecommendation } from './types';

interface ForecastRowOut {
    predictedRequests: number;
    confidence: number;
    availableProviders: number;
    coverageGap: number;
    recommendation: ForecastRecommendation;
    reasoning: string;
    category: string;
    zone: string;
}

export async function runWeeklyForecast(): Promise<void> {
    const byCategory = await prisma.$queryRaw<{ category: string; cnt: bigint }[]>`
        SELECT category, COUNT(*)::bigint AS cnt
        FROM service_requests
        WHERE created_at >= now() - interval '60 days'
          AND category IS NOT NULL
        GROUP BY category
        ORDER BY cnt DESC
        LIMIT 25
    `;

    const zoneRows = await prisma.$queryRaw<{ zone: string }[]>`
        SELECT DISTINCT unnest(zones) AS zone
        FROM professionals
        WHERE status = 'active' AND cardinality(zones) > 0
        LIMIT 12
    `;
    const zones = zoneRows.map((z: { zone: string }) => z.zone).filter(Boolean);
    if (zones.length === 0) {
        zones.push('amba');
    }

    const provRows = await prisma.$queryRaw<{ category: string; zone: string; cnt: bigint }[]>`
        SELECT c AS category, z AS zone, COUNT(*)::bigint AS cnt
        FROM professionals p,
        LATERAL unnest(p.categories) AS c,
        LATERAL unnest(p.zones) AS z
        WHERE p.status = 'active'
        GROUP BY c, z
    `;

    const provMap = new Map<string, number>();
    for (const r of provRows) {
        provMap.set(`${r.category}|${r.zone}`, Number(r.cnt));
    }

    const recentWindow = await prisma.$queryRaw<{ category: string; cnt: bigint }[]>`
        SELECT category, COUNT(*)::bigint AS cnt
        FROM service_requests
        WHERE created_at >= now() - interval '30 days'
          AND category IS NOT NULL
        GROUP BY category
    `;
    const olderWindow = await prisma.$queryRaw<{ category: string; cnt: bigint }[]>`
        SELECT category, COUNT(*)::bigint AS cnt
        FROM service_requests
        WHERE created_at >= now() - interval '60 days'
          AND created_at < now() - interval '30 days'
          AND category IS NOT NULL
        GROUP BY category
    `;
    const yoy = await prisma.$queryRaw<{ category: string; cnt: bigint }[]>`
        SELECT category, COUNT(*)::bigint AS cnt
        FROM service_requests
        WHERE created_at >= (now() - interval '1 year') - interval '14 days'
          AND created_at < (now() - interval '1 year') + interval '14 days'
          AND category IS NOT NULL
        GROUP BY category
    `;

    let seasonal: Record<string, unknown>[] = [];
    try {
        seasonal = await prisma.$queryRaw`SELECT season_name, starts_on, ends_on, demand_bias, notes FROM seasonal_calendar`;
    } catch {
        seasonal = [];
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStr = weekStart.toISOString().slice(0, 10);

    const payload = {
        demandByCategory: byCategory.map((h: { category: string; cnt: bigint }) => ({
            category: h.category,
            requests: Number(h.cnt),
        })),
        demandLast30d: Object.fromEntries(
            recentWindow.map((r: { category: string; cnt: bigint }) => [r.category, Number(r.cnt)]),
        ),
        demandPrev30d: Object.fromEntries(
            olderWindow.map((r: { category: string; cnt: bigint }) => [r.category, Number(r.cnt)]),
        ),
        demandSameFortnightLastYear: Object.fromEntries(
            yoy.map((r: { category: string; cnt: bigint }) => [r.category, Number(r.cnt)]),
        ),
        zones,
        providersByCategoryZone: Object.fromEntries(provMap.entries()),
        seasonalCalendar: seasonal,
        upcomingHolidays: upcomingHolidays(21),
    };

    const g = await geminiGenerateJson<ForecastRowOut[] | { forecasts?: ForecastRowOut[] }>(
        FORECAST_PROMPT,
        JSON.stringify(payload)
    );

    let rows: ForecastRowOut[] = [];
    if (g.ok && g.data) {
        if (Array.isArray(g.data)) rows = g.data;
        else if (Array.isArray((g.data as { forecasts?: ForecastRowOut[] }).forecasts)) {
            rows = (g.data as { forecasts: ForecastRowOut[] }).forecasts;
        }
    }

    if (rows.length === 0) {
        await insertAgentLog({
            agent: 'forecast',
            event: 'forecast_gemini_failed',
            level: 'warn',
            details: { error: g.error, raw: g.raw?.slice(0, 500) },
            tokensUsed: g.tokensUsed,
        });
        return;
    }

    for (const row of rows) {
        const available =
            row.availableProviders ??
            provMap.get(`${row.category}|${row.zone}`) ??
            0;
        const gap = Math.max(0, (row.predictedRequests ?? 0) - available * 3);

        await prisma.$executeRawUnsafe(
            `INSERT INTO demand_forecasts (
                forecast_for_week, category, zone, predicted_requests, confidence,
                available_providers, coverage_gap, recommendation, gemini_reasoning
            ) VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8, $9)`,
            weekStr,
            row.category,
            row.zone,
            row.predictedRequests ?? 0,
            row.confidence ?? 0.5,
            available,
            gap,
            row.recommendation ?? 'sufficient',
            row.reasoning ?? ''
        );

        if (row.recommendation === 'recruit_providers' && gap >= 5) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO expansion_opportunities (zone, category, uncovered_requests_30d, estimated_revenue_ars, priority, status)
                 VALUES ($1, $2, $3, $4, $5, 'detected')`,
                row.zone,
                row.category,
                gap,
                gap * 15000,
                gap >= 10 ? 'high' : 'medium'
            );
        }

        if (row.recommendation === 'launch_campaign') {
            await enqueueAgentTask({
                taskType: 'launch_provider_campaign',
                agentTarget: 'content-agent',
                payload: {
                    category: row.category,
                    zone: row.zone,
                    reasoning: row.reasoning,
                    predictedRequests: row.predictedRequests,
                    coverageGap: gap,
                },
            });
        }
    }

    await insertAgentLog({
        agent: 'forecast',
        event: 'forecast_complete',
        level: 'info',
        details: { rows: rows.length },
        tokensUsed: g.tokensUsed,
    });
}
