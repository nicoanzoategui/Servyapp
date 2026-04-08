import { redis } from '../utils/redis';

export type ChatLogRole = 'user' | 'bot';

export type ChatLogEntry = {
    role: ChatLogRole;
    body: string;
    at: string;
};

const MAX_MESSAGES = 500;
const keyFor = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length > 0 ? `wa_chat:${digits}` : '';
};

export async function appendChatMessage(phone: string, role: ChatLogRole, body: string): Promise<void> {
    const key = keyFor(phone);
    if (!key) return;
    const entry: ChatLogEntry = { role, body, at: new Date().toISOString() };
    try {
        await redis.rpush(key, JSON.stringify(entry));
        await redis.ltrim(key, -MAX_MESSAGES, -1);
    } catch (e) {
        console.error('[chat-log] append failed:', e);
    }
}

export async function getChatMessages(phone: string): Promise<ChatLogEntry[]> {
    const key = keyFor(phone);
    if (!key) return [];
    try {
        const items = await redis.lrange(key, 0, -1);
        return items.map((s) => JSON.parse(s) as ChatLogEntry);
    } catch (e) {
        console.error('[chat-log] read failed:', e);
        return [];
    }
}
