import { AsyncLocalStorage } from 'node:async_hooks';

/** Contexto por request async: evita mezclar logs entre webhook Twilio y CRON / otras peticiones. */
export type TwilioWebhookContext = {
    inboundMessageSid: string;
    /** Últimos 4 dígitos del remitente (From) ya normalizado */
    fromTail: string;
};

export const twilioWebhookAls = new AsyncLocalStorage<TwilioWebhookContext>();
