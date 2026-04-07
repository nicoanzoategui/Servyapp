import { Worker } from 'bullmq';
import { bullConnection } from '../lib/queue';
import { runDailyFinanceSnapshot } from '../agents/finance-agent';
import { runFraudScan } from '../crons/fraud-scan';
import { geminiGenerateJson } from '../lib/gemini-json';

export function startAgentWorker(): Worker {
    const conn = bullConnection.duplicate();
    return new Worker(
        'agents',
        async (job) => {
            if (job.name === 'daily-finance') {
                await runDailyFinanceSnapshot();
                return;
            }
            if (job.name === 'fraud-scan') {
                await runFraudScan();
                return;
            }
            if (job.name === 'gemini-json') {
                const { systemHint, userText } = job.data as { systemHint: string; userText: string };
                return geminiGenerateJson(systemHint, userText);
            }
        },
        { connection: conn }
    );
}
