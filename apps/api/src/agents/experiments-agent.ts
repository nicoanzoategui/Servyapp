import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { insertAgentLog } from '../lib/agent-log';
import { enqueueAgentTask } from '../lib/agent-tasks';
import { geminiGenerateJson } from '../lib/gemini-json';
import { EXPERIMENT_EVAL_PROMPT } from './prompts/experiments';
import { draftCampaignsFromExpansion } from './recruitment-agent';

export async function tryExperimentWaitlist(phone: string, body: string, userName?: string | null): Promise<boolean> {
    const b = body.toLowerCase().trim();
    if (!b.includes('lista de espera') && !b.includes('experimento')) return false;

    const exp = await prisma.$queryRaw<{ id: string; name: string }[]>`
        SELECT id, name FROM experiments
        WHERE status = 'running'
        ORDER BY start_at DESC NULLS LAST
        LIMIT 1
    `;
    const e = exp[0];
    if (!e) {
        await WhatsAppService.sendTextMessage(
            phone,
            'Gracias por el interés. Por ahora no hay experimentos abiertos; te avisamos por acá cuando lancemos uno.'
        );
        return true;
    }

    await prisma.$executeRawUnsafe(
        `INSERT INTO experiment_waitlist (experiment_id, phone, name, status)
         VALUES ($1::uuid, $2, $3, 'pending')`,
        e.id,
        phone,
        userName ?? null
    );

    await WhatsAppService.sendTextMessage(
        phone,
        `Listo, ${userName || 'te'} anotamos en la lista de espera para: ${e.name}. Te escribimos cuando haya lugar.`
    );

    await insertAgentLog({
        agent: 'experiments',
        event: 'waitlist_enrolled',
        level: 'info',
        entityType: 'experiment',
        entityId: e.id,
        details: { phone },
    });

    return true;
}

export async function runExperimentDailyEval(): Promise<void> {
    const running = await prisma.$queryRaw<{ id: string; name: string; hypothesis: string | null }[]>`
        SELECT id, name, hypothesis FROM experiments WHERE status = 'running' LIMIT 5
    `;

    for (const e of running) {
        const g = await geminiGenerateJson<{ success?: boolean; summary?: string; nextAction?: string }>(
            EXPERIMENT_EVAL_PROMPT,
            JSON.stringify({ experiment: e.name, hypothesis: e.hypothesis })
        );
        await insertAgentLog({
            agent: 'experiments',
            event: 'daily_eval',
            level: 'info',
            entityType: 'experiment',
            entityId: e.id,
            details: g.data ?? { error: g.error },
            tokensUsed: g.tokensUsed,
        });
    }
}

export async function runExperimentMonthlySuggestion(): Promise<void> {
    await draftCampaignsFromExpansion();

    const running = await prisma.$queryRaw<{ id: string; name: string }[]>`
        SELECT id, name FROM experiments WHERE status = 'running'
    `;

    for (const e of running) {
        await enqueueAgentTask({
            taskType: 'experiment_review_pricing',
            agentTarget: 'pricing-agent',
            payload: { experimentId: e.id, experimentName: e.name, source: 'experiments_monthly' },
        });
        await enqueueAgentTask({
            taskType: 'experiment_sync_recruitment',
            agentTarget: 'recruitment-agent',
            payload: { experimentId: e.id, experimentName: e.name, source: 'experiments_monthly' },
        });
    }

    await insertAgentLog({
        agent: 'experiments',
        event: 'monthly_suggestions_enqueued',
        level: 'info',
        details: { experiments: running.length },
    });
}
