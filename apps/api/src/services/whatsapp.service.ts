import { env } from '../utils/env';
import { appendChatMessage } from '../lib/conversation-chat-log';
import twilio from 'twilio';

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

/** Evita `whatsapp:whatsapp:+...` si el .env ya trae el prefijo. */
function toTwilioWhatsappAddress(raw: string): string {
    const t = raw.trim();
    if (t.toLowerCase().startsWith('whatsapp:')) return t;
    const num = t.startsWith('+') ? t : `+${t.replace(/^\+/, '')}`;
    return `whatsapp:${num}`;
}

export class WhatsAppService {
    static async sendTextMessage(phone: string, text: string) {
        try {
            await twilioClient.messages.create({
                from: toTwilioWhatsappAddress(env.TWILIO_PHONE_NUMBER),
                to: toTwilioWhatsappAddress(phone),
                body: text,
            });
            await appendChatMessage(phone, 'bot', text);
        } catch (err) {
            console.error('[whatsapp] sendTextMessage ERROR:', JSON.stringify(err), 'phone:', phone, 'from:', env.TWILIO_PHONE_NUMBER);
        }
    }

    static async sendButtonMessage(phone: string, text: string, buttons: { id: string; title: string }[]) {
        const body = `${text}\n\n${buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`;
        return this.sendTextMessage(phone, body);
    }

    static async sendImageMessage(phone: string, imageUrl: string) {
        try {
            await twilioClient.messages.create({
                from: toTwilioWhatsappAddress(env.TWILIO_PHONE_NUMBER),
                to: toTwilioWhatsappAddress(phone),
                mediaUrl: [imageUrl],
            });
            await appendChatMessage(phone, 'bot', `[Imagen] ${imageUrl}`);
        } catch (err) {
            console.error('Error sending image:', err);
        }
    }

    static async sendListMessage(
        phone: string,
        text: string,
        sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
    ) {
        const rows = sections.flatMap((s) => s.rows);
        const body = `${text}\n\n${rows
            .map(
                (r: { id: string; title: string; description?: string }, i: number) =>
                    `${i + 1}. ${r.title}${r.description ? ` - ${r.description}` : ''}`,
            )
            .join('\n')}`;
        return this.sendTextMessage(phone, body);
    }

    /** Para Twilio: URL del media (`MediaUrl0`). */
    static async downloadMedia(mediaUrl: string): Promise<Buffer | null> {
        try {
            const response = await fetch(mediaUrl, {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                },
            });
            if (!response.ok) return null;
            return Buffer.from(await response.arrayBuffer());
        } catch (err) {
            console.error('Error downloading Twilio media:', err);
            return null;
        }
    }
}
