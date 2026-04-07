import { Worker } from 'bullmq';
import { bullConnection } from '../lib/queue';
import { runRecruitmentCycle } from '../agents/recruitment-agent';

export function startScrapingWorker(): Worker {
    const conn = bullConnection.duplicate();
    return new Worker(
        'scraping',
        async (job) => {
            if (job.name === 'run-recruitment') {
                await runRecruitmentCycle();
            }
        },
        { connection: conn }
    );
}
