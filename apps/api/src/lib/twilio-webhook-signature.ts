import type { Request } from 'express';
import twilio from 'twilio';
import { env } from '../utils/env';

function unique(urls: string[]): string[] {
    return [...new Set(urls.filter(Boolean))];
}

/** URLs candidatas: proxies (Railway) a veces firman path distinto al originalUrl. */
export function twilioWebhookPublicUrl(req: Request): string {
    return twilioWebhookUrlCandidates(req)[0]!;
}

export function twilioWebhookUrlCandidates(req: Request): string[] {
    const base = env.API_PUBLIC_URL.replace(/\/$/, '');
    const original = req.originalUrl || req.url || '/webhook/twilio';
    const pathOnly = (req.baseUrl || '') + (req.path || '/twilio');
    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0]?.trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
        .split(',')[0]
        ?.trim();

    const urls = [
        `${base}${original}`,
        `${base}${original.split('?')[0]}`,
        `${base}${pathOnly}`,
        `${base}/webhook/twilio`,
    ];
    if (proto && host) {
        urls.push(`${proto}://${host}${original}`);
        urls.push(`${proto}://${host}${original.split('?')[0]}`);
        urls.push(`${proto}://${host}/webhook/twilio`);
    }
    return unique(urls);
}

/** Valida X-Twilio-Signature sobre la URL pública y params POST. */
export function verifyTwilioWebhookSignature(req: Request, params: Record<string, string>): boolean {
    if (env.TWILIO_SKIP_SIGNATURE || env.NODE_ENV === 'test') return true;

    const signature = req.headers['x-twilio-signature'];
    if (typeof signature !== 'string' || !signature) return false;

    const validate = twilio.validateRequest;
    if (typeof validate !== 'function') {
        console.error('[twilio] validateRequest no disponible');
        return false;
    }

    const stringParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params || {})) {
        if (v == null) continue;
        stringParams[k] = String(v);
    }

    for (const url of twilioWebhookUrlCandidates(req)) {
        try {
            if (validate(env.TWILIO_AUTH_TOKEN, signature, url, stringParams)) return true;
        } catch (err) {
            console.error('[twilio] validateRequest error', { url, err });
        }
    }
    console.error('[twilio] Firma inválida. URLs probadas:', twilioWebhookUrlCandidates(req));
    return false;
}
