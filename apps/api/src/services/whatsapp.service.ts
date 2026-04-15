import { env } from '../utils/env';
import { twilioWebhookAls } from '../lib/twilio-request-context';
import { maskPhoneDigitsTail, normalizeTwilioWhatsAppFrom } from '../utils/twilio-phone';
import twilio from 'twilio';

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

/** Evita `whatsapp:whatsapp:+...` si el .env ya trae el prefijo. Quita espacios (p. ej. +1 620 … pegado desde la consola). */
function toTwilioWhatsappAddress(raw: string): string {
    const t = raw.trim();
    if (t.toLowerCase().startsWith('whatsapp:')) {
        const rest = t.slice('whatsapp:'.length).trim();
        const inner = rest.replace(/\s/g, '');
        const num = inner.startsWith('+') ? inner : `+${inner.replace(/^\+/, '')}`;
        return `whatsapp:${num}`;
    }
    const compact = t.replace(/\s/g, '');
    const num = compact.startsWith('+') ? compact : `+${compact.replace(/^\+/, '')}`;
    return `whatsapp:${num}`;
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
        const digits = normalizeTwilioWhatsAppFrom(phone) || phone.replace(/\D/g, '');
        try {
            const msg = await twilioClient.messages.create({
                from: toTwilioWhatsappAddress(env.TWILIO_PHONE_NUMBER),
                to: toTwilioWhatsappAddress(digits),
                body: text,
            });
            const meta = msg as {
                sid?: string;
                status?: string;
                errorCode?: number | null;
                errorMessage?: string | null;
            };
            const ctx = twilioWebhookAls.getStore();
            const toTail = digits.length >= 4 ? digits.slice(-4) : '';
            const replyMatchesInboundFrom =
                ctx != null && ctx.fromTail.length > 0 ? ctx.fromTail === toTail : undefined;
            console.log('[whatsapp] outbound OK', {
                sid: meta.sid,
                inboundMessageSid: ctx?.inboundMessageSid,
                toMask: maskPhoneDigitsTail(digits),
                toTail,
                fromTailFromWebhook: ctx?.fromTail,
                replyMatchesInboundFrom,
                bodyChars: text.length,
                twilioStatus: meta.status,
                twilioErrorCode: meta.errorCode ?? undefined,
                twilioErrorMessage: meta.errorMessage ?? undefined,
            });
            if (ctx && replyMatchesInboundFrom === false) {
                console.log(
                    '[whatsapp] outbound: destino ≠ remitente del webhook (normal: mediación a técnico, o log de CRON/otro proceso sin contexto Twilio)'
                );
            }
        } catch (err) {
            console.error('[whatsapp] outbound FAIL sendTextMessage', {
                toMask: maskPhoneDigitsTail(digits),
                ...formatTwilioError(err),
            });
        }
    }

    static async sendButtonMessage(phone: string, text: string, buttons: { id: string; title: string }[]) {
        const body = `${text}\n\n${buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`;
        return this.sendTextMessage(phone, body);
    }

    static async sendImageMessage(phone: string, imageUrl: string) {
        const digits = normalizeTwilioWhatsAppFrom(phone) || phone.replace(/\D/g, '');
        try {
            const msg = await twilioClient.messages.create({
                from: toTwilioWhatsappAddress(env.TWILIO_PHONE_NUMBER),
                to: toTwilioWhatsappAddress(digits),
                mediaUrl: [imageUrl],
            });
            const meta = msg as { sid?: string; status?: string };
            console.log('[whatsapp] outbound OK (image)', {
                sid: meta.sid,
                toMask: maskPhoneDigitsTail(digits),
                twilioStatus: meta.status,
            });
        } catch (err) {
            console.error('[whatsapp] outbound FAIL sendImage', {
                toMask: maskPhoneDigitsTail(digits),
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
