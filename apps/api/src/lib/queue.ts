import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../utils/redis';

/** Conexión dedicada para BullMQ (duplicate del cliente ioredis). */
export const bullConnection = redis.duplicate();

export const agentQueue = new Queue('agents', { connection: bullConnection });
export const messagingQueue = new Queue('messaging', { connection: bullConnection });
export const scrapingQueue = new Queue('scraping', { connection: bullConnection });

const queueEventsConnection = redis.duplicate();
export const agentsQueueEvents = new QueueEvents('agents', { connection: queueEventsConnection });

/** Post-pago: mensajes WhatsApp al usuario y al profesional (y QR opcional). */
export type PostPaymentMessagingPayload = {
    userPhone: string;
    proPhone: string;
    userText: string;
    proText: string;
    qrUrl?: string | null;
};

export async function enqueuePostPaymentMessaging(payload: PostPaymentMessagingPayload): Promise<void> {
    await messagingQueue.add(
        'post-payment',
        payload,
        {
            attempts: 6,
            backoff: { type: 'fixed', delay: 30_000 },
            removeOnComplete: 100,
            removeOnFail: 50,
        }
    );
}

export async function enqueueRunRecruitmentCycle(): Promise<void> {
    await scrapingQueue.add(
        'run-recruitment',
        {},
        {
            attempts: 3,
            backoff: { type: 'fixed', delay: 5 * 60_000 },
            removeOnComplete: 50,
            removeOnFail: 20,
        }
    );
}

export async function enqueueDailyFinanceSnapshot(): Promise<void> {
    await agentQueue.add(
        'daily-finance',
        {},
        {
            attempts: 2,
            backoff: { type: 'fixed', delay: 60_000 },
            removeOnComplete: 30,
            removeOnFail: 10,
        }
    );
}

export async function enqueueFraudScan(): Promise<void> {
    await agentQueue.add(
        'fraud-scan',
        {},
        {
            attempts: 2,
            backoff: { type: 'fixed', delay: 60_000 },
            removeOnComplete: 30,
            removeOnFail: 10,
        }
    );
}
