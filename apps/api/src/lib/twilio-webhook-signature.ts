import type { Request } from 'express';
import twilio from 'twilio';
import { env } from '../utils/env';

export function twilioWebhookPublicUrl(req: Request): string {
    return `${env.API_PUBLIC_URL.replace(/\/$/, '')}${req.originalUrl}`;
}

/** Valida X-Twilio-Signature sobre la URL pública y params POST. */
export function verifyTwilioWebhookSignature(req: Request, params: Record<string, string>): boolean {
    if (env.TWILIO_SKIP_SIGNATURE) return true;

    const signature = req.headers['x-twilio-signature'];
    if (typeof signature !== 'string' || !signature) return false;

    return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, twilioWebhookPublicUrl(req), params);
}
