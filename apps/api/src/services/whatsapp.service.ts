import { env } from '../utils/env';
import twilio from 'twilio';

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

/** Evita `whatsapp:whatsapp:+...` si el .env ya trae el prefijo. */
function toTwilioWhatsappAddress(raw: string): string {
    const t = raw.trim();
    if (t.toLowerCase().startsWith('whatsapp:')) return t;
    const num = t.startsWith('+') ? t : `+${t.replace(/^\+/, '')}`;
    return `whatsapp:${num}`;
}

function maskPhoneTail(phone: string): string {
    const d = phone.replace(/\D/g, '');
    return d.length >= 4 ? `***${d.slice(-4)}` : '***';
}

/** Twilio REST errors tienen code/message/status; no siempre serializan bien con JSON.stringify. */
function formatTwilioError(err: unknown): Record<string, unknown> {
    if (err && typeof err === 'object') {
        const o = err as Record<string, unknown>;
        return {
            message: o.message,
            code: o.code,
            status: o.status,
            moreInfo: o.moreInfo,
        };
    }
    return { raw: String(err) };
}

export class WhatsAppService {
    static async sendTextMessage(phone: string, text: string) {
        try {
            const msg = await twilioClient.messages.create({
                from: toTwilioWhatsappAddress(env.TWILIO_PHONE_NUMBER),
                to: toTwilioWhatsappAddress(phone),
                body: text,
            });
            console.log('[whatsapp] outbound OK', {
                sid: msg.sid,
                toMask: maskPhoneTail(phone),
                bodyChars: text.length,
            });
        } catch (err) {
            console.error('[whatsapp] outbound FAIL sendTextMessage', {
                toMask: maskPhoneTail(phone),
                ...formatTwilioError(err),
            });
        }
    }

    static async sendButtonMessage(phone: string, text: string, buttons: { id: string; title: string }[]) {
        const body = `${text}\n\n${buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`;
        return this.sendTextMessage(phone, body);
    }

    static async sendImageMessage(phone: string, imageUrl: string) {
        try {
            const msg = await twilioClient.messages.create({
                from: toTwilioWhatsappAddress(env.TWILIO_PHONE_NUMBER),
                to: toTwilioWhatsappAddress(phone),
                mediaUrl: [imageUrl],
            });
            console.log('[whatsapp] outbound OK (image)', { sid: msg.sid, toMask: maskPhoneTail(phone) });
        } catch (err) {
            console.error('[whatsapp] outbound FAIL sendImage', {
                toMask: maskPhoneTail(phone),
                ...formatTwilioError(err),
            });
        }
    }

    static async sendListMessage(
        phone: string,
        text: string,
        sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
    ) {
        const rows = sections.flatMap((s) => s.rows);
        const body = `${text}\n\n${rows
            .map((r, i) => `${i + 1}. ${r.title}${r.description ? ` - ${r.description}` : ''}`)
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
