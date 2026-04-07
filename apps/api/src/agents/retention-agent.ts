import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { geminiGenerateJson } from '../lib/gemini-json';
import { insertAgentLog } from '../lib/agent-log';
import { buildRetentionPrompt } from './prompts/retention';
import type { ProviderRiskLevel } from './types';

function computeRisk(input: {
    daysInactive: number;
    ratingDelta: number;
    jobs30d: number;
}): { level: ProviderRiskLevel; reasons: string[] } {
    const reasons: string[] = [];
    if (input.daysInactive >= 21) {
        return { level: 'churned', reasons: ['Inactividad prolongada (>21 días)'] };
    }
    if (input.daysInactive >= 10 || input.ratingDelta <= -1 || input.jobs30d <= 1) {
        if (input.daysInactive >= 10) reasons.push('Sin actividad 10+ días');
        if (input.ratingDelta <= -1) reasons.push('Caída fuerte de rating');
        if (input.jobs30d <= 1) reasons.push('Pocos trabajos en el mes');
        return { level: 'at_risk', reasons };
    }
    if (input.daysInactive >= 5 || input.ratingDelta <= -0.5 || input.jobs30d < 3) {
        if (input.daysInactive >= 5) reasons.push('Varios días sin conectar');
        if (input.ratingDelta <= -0.5) reasons.push('Rating a la baja');
        if (input.jobs30d < 3) reasons.push('Baja actividad mensual');
        return { level: 'watch', reasons };
    }
    return { level: 'healthy', reasons: [] };
}

export async function syncProviderHealth(): Promise<void> {
    const pros = await prisma.professional.findMany({
        where: { status: { in: ['active', 'pending'] } },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    for (const p of pros) {
        const lastJob = await prisma.job.findFirst({
            where: {
                status: 'completed',
                quotation: { job_offer: { professional_id: p.id } },
            },
            orderBy: { completed_at: 'desc' },
            select: { completed_at: true },
        });

        const jobs30d = await prisma.job.count({
            where: {
                status: 'completed',
                completed_at: { gte: thirtyDaysAgo },
                quotation: { job_offer: { professional_id: p.id } },
            },
        });

        const lastActive = lastJob?.completed_at ?? p.created_at;
        const daysInactive = Math.floor((Date.now() - lastActive.getTime()) / 86400000);

        const prev = await prisma.$queryRaw<{ rating_30d: number | null }[]>`
            SELECT rating_30d FROM provider_health WHERE provider_id = ${p.id} LIMIT 1
        `;
        const prevSnap = prev[0]?.rating_30d;
        const ratingDelta =
            prevSnap == null ? 0 : (p.rating ?? 0) - Number(prevSnap);

        const { level, reasons } = computeRisk({ daysInactive, ratingDelta, jobs30d });

        await prisma.$executeRawUnsafe(
            `INSERT INTO provider_health (
                provider_id, last_active_at, last_job_at, days_inactive, rating_30d, rating_delta,
                jobs_30d, risk_level, risk_reasons, updated_at
            ) VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8::jsonb, now())
            ON CONFLICT (provider_id) DO UPDATE SET
                last_active_at = EXCLUDED.last_active_at,
                last_job_at = EXCLUDED.last_job_at,
                days_inactive = EXCLUDED.days_inactive,
                rating_30d = EXCLUDED.rating_30d,
                rating_delta = EXCLUDED.rating_delta,
                jobs_30d = EXCLUDED.jobs_30d,
                risk_level = EXCLUDED.risk_level,
                risk_reasons = EXCLUDED.risk_reasons,
                updated_at = now()`,
            p.id,
            lastJob?.completed_at ?? null,
            daysInactive,
            p.rating,
            ratingDelta,
            jobs30d,
            level,
            JSON.stringify(reasons)
        );
    }
}

export async function runRetentionOutreach(): Promise<void> {
    const candidates = await prisma.$queryRaw<
        {
            provider_id: string;
            risk_level: string;
            risk_reasons: unknown;
            last_retention_message_at: Date | null;
            retention_message_count: number | null;
        }[]
    >`
        SELECT provider_id, risk_level, risk_reasons, last_retention_message_at, retention_message_count
        FROM provider_health
        WHERE risk_level IN ('watch', 'at_risk')
          AND (
            last_retention_message_at IS NULL
            OR last_retention_message_at < now() - interval '7 days'
          )
        LIMIT 15
    `;

    for (const row of candidates) {
        const pro = await prisma.professional.findUnique({ where: { id: row.provider_id } });
        if (!pro) continue;

        const reasons = Array.isArray(row.risk_reasons)
            ? (row.risk_reasons as string[]).join('; ')
            : JSON.stringify(row.risk_reasons ?? []);

        const lastJob = await prisma.job.findFirst({
            where: {
                status: 'completed',
                quotation: { job_offer: { professional_id: pro.id } },
            },
            orderBy: { completed_at: 'desc' },
            select: { completed_at: true },
        });

        const prompt = buildRetentionPrompt({
            name: pro.name,
            category: (pro.categories[0] as string) || 'servicios',
            daysInactive: Math.floor(
                (Date.now() - (lastJob?.completed_at ?? pro.created_at).getTime()) / 86400000
            ),
            lastJobDate: lastJob?.completed_at?.toISOString().slice(0, 10) ?? 'sin datos',
            rating: String(pro.rating ?? 0),
            riskReasons: reasons || 'seguimiento',
        });

        const g = await geminiGenerateJson<{ message?: string }>(
            'Devolvé JSON { "message": string } con el texto exacto para WhatsApp. Solo JSON.',
            prompt
        );
        const text =
            (g.ok && g.data && typeof (g.data as { message?: string }).message === 'string'
                ? (g.data as { message: string }).message
                : null) ||
            `${pro.name}, ¿todo bien? Hace un tiempo que no vemos movimiento en Servy. Si necesitás algo, escribinos.`;

        await WhatsAppService.sendTextMessage(pro.phone, text);

        await prisma.$executeRawUnsafe(
            `INSERT INTO retention_messages (provider_id, risk_level, message_sent)
             VALUES ($1, $2, $3)`,
            pro.id,
            row.risk_level,
            text
        );

        await prisma.$executeRawUnsafe(
            `UPDATE provider_health SET
                last_retention_message_at = now(),
                retention_message_count = COALESCE(retention_message_count, 0) + 1
             WHERE provider_id = $1`,
            pro.id
        );

        await insertAgentLog({
            agent: 'retention',
            event: 'message_sent',
            level: 'info',
            entityType: 'provider',
            entityId: pro.id,
            tokensUsed: g.tokensUsed ?? null,
        });
    }
}
