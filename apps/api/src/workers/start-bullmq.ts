import type { Worker } from 'bullmq';
import { startAgentWorker } from './agent-worker';
import { startMessagingWorker } from './messaging-worker';
import { startScrapingWorker } from './scraping-worker';

let workers: Worker[] = [];

export function startBullmqWorkers(): void {
    if (workers.length) return;
    workers = [startAgentWorker(), startMessagingWorker(), startScrapingWorker()];
    for (const w of workers) {
        w.on('failed', (job, err) => {
            console.error('[bullmq] job failed', job?.name, job?.id, err);
        });
    }
    console.log('[bullmq] Workers started (agents, messaging, scraping).');
}
