import crypto from 'crypto';
import type { Request } from 'express';
import { env } from '../utils/env';

/**
 * Firma oficial MP Webhooks:
 *   headers: x-signature (ts=...,v1=...) y x-request-id
 *   manifest: `id:{data.id};request-id:{x-request-id};ts:{ts};`
 *   HMAC-SHA256(secret) en hex === v1
 * @see https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
function headerValue(req: Request, name: string): string | undefined {
    const v = req.headers[name];
    if (Array.isArray(v)) return v[0]?.trim() || undefined;
    if (typeof v === 'string' && v.trim()) return v.trim();
    return undefined;
}

function candidateDataIds(req: Request): string[] {
    const q = req.query as Record<string, unknown>;
    const nested =
        q.data && typeof q.data === 'object' ? (q.data as { id?: unknown }).id : undefined;
    const bodyId = (req.body as { data?: { id?: string | number } } | undefined)?.data?.id;
    const raw = [q['data.id'], nested, q.id, bodyId];
    return [...new Set(raw.map((x) => (x == null ? '' : String(x).trim())).filter(Boolean))];
}

function parseTsAndV1(xSignature: string): { ts?: string; v1?: string } {
    let ts: string | undefined;
    let v1: string | undefined;
    for (const part of xSignature.split(',')) {
        const [key, ...rest] = part.split('=');
        const val = rest.join('=').trim();
        const k = key?.trim();
        if (k === 'ts') ts = val;
        if (k === 'v1') v1 = val;
    }
    return { ts, v1 };
}

function hmacHex(secret: string, manifest: string): string {
    return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
}

function hexEqual(a: string, b: string): boolean {
    const aa = a.toLowerCase();
    const bb = b.toLowerCase();
    if (aa.length !== bb.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(aa, 'utf8'), Buffer.from(bb, 'utf8'));
    } catch {
        return false;
    }
}

/** Valida x-signature de Mercado Pago (manifest id + request-id + ts). */
export function verifyMercadoPagoWebhookSignature(req: Request): boolean {
    if (env.MP_SKIP_SIGNATURE || env.NODE_ENV === 'test') {
        console.warn(
            '[MP webhook] MP_SKIP_SIGNATURE=true — se omite la validación HMAC (solo diagnóstico; no dejar en producción)'
        );
        return true;
    }

    const xSignature = headerValue(req, 'x-signature');
    const xRequestId = headerValue(req, 'x-request-id');
    const dataIds = candidateDataIds(req);

    if (!xSignature || !xRequestId) {
        console.error('[MP webhook] Firma inválida: faltan headers', {
            hasXSignature: Boolean(xSignature),
            hasXRequestId: Boolean(xRequestId),
            xSignatureType: Array.isArray(req.headers['x-signature']) ? 'array' : typeof req.headers['x-signature'],
            xRequestIdType: Array.isArray(req.headers['x-request-id']) ? 'array' : typeof req.headers['x-request-id'],
            headerNames: Object.keys(req.headers).filter((h) => h.includes('sign') || h.includes('request')),
            secretConfigured: Boolean(env.MP_WEBHOOK_SECRET?.trim()),
            secretChars: env.MP_WEBHOOK_SECRET?.trim().length ?? 0,
        });
        return false;
    }

    const { ts, v1 } = parseTsAndV1(xSignature);
    if (!ts || !v1) {
        console.error('[MP webhook] Firma inválida: x-signature sin ts/v1', {
            xSignaturePreview: xSignature.slice(0, 40),
        });
        return false;
    }

    if (dataIds.length === 0) {
        console.error('[MP webhook] Firma inválida: no hay data.id (query ni body)');
        return false;
    }

    const secret = env.MP_WEBHOOK_SECRET.trim();
    for (const dataId of dataIds) {
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
        const expected = hmacHex(secret, manifest);
        if (hexEqual(expected, v1)) return true;
    }

    console.error('[MP webhook] Firma inválida: HMAC no coincide', {
        dataIds,
        ts,
        v1Chars: v1.length,
        requestIdChars: xRequestId.length,
        secretChars: secret.length,
        triedManifests: dataIds.map((id) => `id:${id};request-id:${xRequestId};ts:${ts};`),
    });
    return false;
}
