import { prisma } from '@servy/db';
import { insertAgentLog } from './agent-log';

export async function enqueueAgentTask(input: {
    taskType: string;
    agentTarget?: string;
    payload: Record<string, unknown>;
}): Promise<void> {
    try {
        await prisma.$executeRawUnsafe(
            `INSERT INTO agent_tasks (task_type, agent_target, payload)
             VALUES ($1, $2, $3::jsonb)`,
            input.taskType,
            input.agentTarget ?? 'content-agent',
            JSON.stringify(input.payload)
        );
    } catch (e) {
        await insertAgentLog({
            agent: 'system',
            event: 'agent_tasks_enqueue_failed',
            level: 'error',
            details: { taskType: input.taskType, message: String(e) },
        });
    }
}
