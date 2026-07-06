import crypto from 'crypto';
import type { Request } from 'express';
import { env } from '../utils/env';

/** Valida x-signature de Mercado Pago (manifest id + request-id + ts). */
export function verifyMercadoPagoWebhookSignature(req: Request): boolean {
    if (env.MP_SKIP_SIGNATURE) return true;

    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (typeof xSignature !== 'string' || typeof xRequestId !== 'string') {
        return false;
    }

    const queryId = req.query['data.id'];
    const bodyId = (req.body as { data?: { id?: string | number } } | undefined)?.data?.id;
    const dataId = String(queryId ?? bodyId ?? '').trim();
    if (!dataId) return false;

    let ts: string | undefined;
    let v1: string | undefined;
    for (const part of xSignature.split(',')) {
        const [key, ...rest] = part.split('=');
        const val = rest.join('=').trim();
        if (key?.trim() === 'ts') ts = val;
        if (key?.trim() === 'v1') v1 = val;
    }
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', env.MP_WEBHOOK_SECRET).update(manifest).digest('hex');

    if (expected.length !== v1.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    } catch {
        return false;
    }
}
