import { Worker } from 'bullmq';
import { bullConnection } from '../lib/queue';
import type { PostPaymentMessagingPayload } from '../lib/queue';
import { WhatsAppService } from '../services/whatsapp.service';

export function startMessagingWorker(): Worker {
    const conn = bullConnection.duplicate();
    return new Worker(
        'messaging',
        async (job) => {
            if (job.name === 'post-payment') {
                const p = job.data as PostPaymentMessagingPayload;
                await WhatsAppService.sendTextMessage(p.userPhone, p.userText);
                if (p.qrUrl) {
                    await WhatsAppService.sendImageMessage(p.userPhone, p.qrUrl);
                }
                await WhatsAppService.sendTextMessage(p.proPhone, p.proText);
            }
        },
        { connection: conn }
    );
}
