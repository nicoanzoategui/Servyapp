import cron from 'node-cron';
import { runCheckinScheduler } from './checkin-scheduler';
import { runMorningCheckin } from './morning-checkin';
import { runPaymentReminder } from './payment-reminder';
import { runJobTimeout } from './job-timeout';
import { runVisitHoldExpiry } from './visit-hold-expiry';

/**
 * Crons del producto (visita, check-in, ofertas).
 * Los crons de agentes (pricing, calidad, retención, fraude, forecast,
 * reclutamiento, experimentos) están apagados a propósito: el código sigue
 * en apps/api/src/agents/ por si se reactivan.
 */
export function startCrons(): void {
    cron.schedule('*/10 * * * *', () => {
        void runPaymentReminder().catch((err) => console.error('[cron runPaymentReminder]', err));
        void runVisitHoldExpiry().catch((err) => console.error('[cron runVisitHoldExpiry]', err));
    });

    cron.schedule('* * * * *', () => {
        void runCheckinScheduler().catch((err) => console.error('[cron runCheckinScheduler]', err));
    });

    cron.schedule('*/15 * * * *', () => {
        void runMorningCheckin().catch((err) => console.error('[cron runMorningCheckin]', err));
    });

    cron.schedule('0 * * * *', () => {
        void runJobTimeout().catch((err) => console.error('[cron runJobTimeout]', err));
    });

    console.log('[CRON] Tareas de visita/check-in registradas (agentes apagados).');
}
