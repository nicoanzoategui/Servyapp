import { prisma } from '@servy/db';
import { insertAgentLog } from './agent-log';
import { bumpDemand } from '../agents/pricing-agent';
import { draftCampaignsFromExpansion, runRecruitmentCycle } from '../agents/recruitment-agent';

interface AgentTask {
    id: string;
    task_type: string;
    agent_target: string;
    payload: Record<string, unknown>;
}

async function handleTask(task: AgentTask): Promise<void> {
    switch (task.task_type) {
        case 'launch_provider_campaign':
            await draftCampaignsFromExpansion();
            await insertAgentLog({
                agent: 'task-consumer',
                event: 'launch_provider_campaign',
                level: 'info',
                details: task.payload,
            });
            break;

        case 'experiment_review_pricing': {
            // Bump demand para que el pricing suba el multiplicador en esa zona/categoría
            const pricingCategory = task.payload.category as string | undefined;
            const pricingZone = task.payload.zone as string | undefined;
            if (pricingCategory && pricingZone) {
                await bumpDemand(pricingCategory, pricingZone);
            }
            await insertAgentLog({
                agent: 'task-consumer',
                event: 'experiment_review_pricing',
                level: 'info',
                details: task.payload,
            });
            break;
        }

        case 'experiment_sync_recruitment':
            // Disparar ciclo de reclutamiento completo
            await runRecruitmentCycle();
            await insertAgentLog({
                agent: 'task-consumer',
                event: 'experiment_sync_recruitment',
                level: 'info',
                details: task.payload,
            });
            break;

        default:
            await insertAgentLog({
                agent: 'task-consumer',
                event: 'unknown_task_type',
                level: 'warn',
                details: { taskType: task.task_type, payload: task.payload },
            });
    }
}

export async function processAgentTasks(): Promise<void> {
    const tasks = await prisma.$queryRaw<AgentTask[]>`
        SELECT id, task_type, agent_target, payload
        FROM agent_tasks
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 20
    `;

    if (!tasks.length) return;

    for (const task of tasks) {
        try {
            await handleTask(task);
            await prisma.$executeRawUnsafe(
                `UPDATE agent_tasks SET status = 'done', processed_at = now() WHERE id = $1::uuid`,
                task.id
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            await prisma.$executeRawUnsafe(
                `UPDATE agent_tasks SET status = 'failed', processed_at = now(), last_error = $2 WHERE id = $1::uuid`,
                task.id,
                message
            );
            await insertAgentLog({
                agent: 'task-consumer',
                event: 'task_failed',
                level: 'error',
                details: { taskId: task.id, taskType: task.task_type, error: message },
            });
        }
    }
}
