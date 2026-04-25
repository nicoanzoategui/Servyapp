import cron from 'node-cron';
import { SubscriptionService } from '../services/subscription.service';

/**
 * Cron diario 8:00 (America/Argentina/Buenos_Aires): cobros / agendamiento de suscripciones con next_service_date hoy.
 */
export function startSubscriptionsCron(): void {
    cron.schedule(
        '0 8 * * *',
        async () => {
            console.log('[CRON] Iniciando procesamiento de suscripciones...');

            try {
                const result = await SubscriptionService.processDueSubscriptions();

                console.log('[CRON] Resultado:', result);

                if (result.processed > 0 && result.failed > result.succeeded * 0.2) {
                    console.warn(`[CRON] ALERTA: ${result.failed} suscripciones fallaron`);
                }
            } catch (error) {
                console.error('[CRON] Error crítico en subscriptions cron:', error);
            }
        },
        {
            timezone: 'America/Argentina/Buenos_Aires',
        }
    );

    console.log('[CRON] Subscription cron job iniciado (8 AM diario, AR)');
}
