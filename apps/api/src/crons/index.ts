import cron from 'node-cron';
import { scrapePrices } from './scrape-prices';
import { takeDemandSnapshot } from './demand-snapshot';
import { runCheckinScheduler } from './checkin-scheduler';
import { runMorningCheckin } from './morning-checkin';
import { collectMetrics } from './metrics-collector';
import { runQualityFollowup } from './quality-followup';
import { runRetentionCheck } from './retention-check';
import { runFraudScan } from './fraud-scan';
import { runForecast } from './forecast-generator';
import { runRecruitmentCron } from './recruitment-cycle';
import { runExperimentsDaily, runExperimentsMonthly } from './experiments-cron';
import { processAgentTasks } from '../lib/agent-task-consumer';
import { runPaymentReminder } from './payment-reminder';
import { runJobTimeout } from './job-timeout';

/**
 * Crons de los agentes operativos (Servy).
 */
export function startCrons(): void {
    cron.schedule('0 */6 * * *', () => {
        void scrapePrices().catch((err) => console.error('[cron scrapePrices]', err));
    });

    cron.schedule('*/5 * * * *', () => {
        void takeDemandSnapshot().catch((err) => console.error('[cron takeDemandSnapshot]', err));
    });

    cron.schedule('*/5 * * * *', () =>
        void processAgentTasks().catch((err) =>
            console.error('[agent-tasks] cron error:', err)
        )
    );

    cron.schedule('*/10 * * * *', () => {
        void runPaymentReminder().catch((err) => console.error('[cron runPaymentReminder]', err));
    });

    cron.schedule('* * * * *', () => {
        void runCheckinScheduler().catch((err) => console.error('[cron runCheckinScheduler]', err));
    });

    // Cron cada 15 minutos para check-in matutino
    cron.schedule('*/15 * * * *', () => {
        void runMorningCheckin().catch((err) => console.error('[cron runMorningCheckin]', err));
    });

    cron.schedule('0 10 * * *', () => {
        void collectMetrics().catch((err) => console.error('[cron collectMetrics]', err));
    });

    cron.schedule('0 * * * *', () => {
        void runQualityFollowup().catch((err) => console.error('[cron runQualityFollowup]', err));
        void runJobTimeout().catch((err) => console.error('[cron runJobTimeout]', err));
    });

    cron.schedule('0 10 * * *', () => {
        void runRetentionCheck().catch((err) => console.error('[cron runRetentionCheck]', err));
    });

    cron.schedule('0 3 * * *', () => {
        void runFraudScan().catch((err) => console.error('[cron runFraudScan]', err));
    });

    cron.schedule('0 8 * * 0', () => {
        void runForecast().catch((err) => console.error('[cron runForecast]', err));
    });

    cron.schedule('0 6 * * 1', () => {
        void runRecruitmentCron().catch((err) => console.error('[cron runRecruitmentCron]', err));
    });

    cron.schedule('15 10 * * *', () => {
        void runExperimentsDaily().catch((err) => console.error('[cron runExperimentsDaily]', err));
    });

    cron.schedule('0 9 1 * *', () => {
        void runExperimentsMonthly().catch((err) => console.error('[cron runExperimentsMonthly]', err));
    });

    console.log('[CRON agents] Tareas de agentes registradas.');
}
