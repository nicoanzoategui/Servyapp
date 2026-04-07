import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { agentQueue, messagingQueue, scrapingQueue } from './queue';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [
        new BullMQAdapter(agentQueue),
        new BullMQAdapter(messagingQueue),
        new BullMQAdapter(scrapingQueue),
    ],
    serverAdapter,
});

export function getBullBoardRouter(): ReturnType<ExpressAdapter['getRouter']> {
    return serverAdapter.getRouter();
}
