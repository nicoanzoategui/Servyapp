import { prisma } from '@servy/db';
import { insertAgentLog } from '../lib/agent-log';

export async function collectMetrics(): Promise<void> {
    const started = Date.now();

    try {
        await prisma.$executeRawUnsafe(`
            UPDATE provider_ratings pr SET
              complaint_rate = sub.cr::numeric / GREATEST(sub.tot, 1)
            FROM (
              SELECT provider_id,
                     COUNT(*) FILTER (WHERE is_complaint = true)::float AS cr,
                     COUNT(*)::float AS tot
              FROM quality_reviews
              WHERE created_at >= now() - interval '90 days'
              GROUP BY provider_id
            ) sub
            WHERE pr.provider_id = sub.provider_id
        `);
    } catch {
        /* tablas vacías o sin filas */
    }

    await insertAgentLog({
        agent: 'retention',
        event: 'metrics_collector',
        level: 'info',
        durationMs: Date.now() - started,
    });
}
