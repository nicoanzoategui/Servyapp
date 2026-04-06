import { prisma } from '@servy/db';
import type { AgentLogAgentName, AgentLogLevel } from '../agents/types';

export async function insertAgentLog(input: {
    agent: AgentLogAgentName | 'recruitment' | 'experiments' | 'system' | 'task-consumer' | 'finance';
    event: string;
    level?: AgentLogLevel;
    entityType?: string | null;
    entityId?: string | null;
    details?: Record<string, unknown> | null;
    durationMs?: number | null;
    tokensUsed?: number | null;
}): Promise<void> {
    try {
        await prisma.$executeRawUnsafe(
            `INSERT INTO agent_logs (agent, event, level, entity_type, entity_id, details, duration_ms, tokens_used)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
            input.agent,
            input.event,
            input.level ?? 'info',
            input.entityType ?? null,
            input.entityId ?? null,
            JSON.stringify(input.details ?? {}),
            input.durationMs ?? null,
            input.tokensUsed ?? null
        );
    } catch (e) {
        console.error('[agent_logs] insert failed:', e);
    }
}
