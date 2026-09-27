/**
 * Twilio envía `From` como `whatsapp:+549...` (a veces con espacios).
 * Para coincidir con DB y con el `to` del API de salida, usamos solo dígitos.
 */
export function normalizeTwilioWhatsAppFrom(raw: string | undefined): string {
    if (!raw) return '';
    return String(raw).replace(/whatsapp:/gi, '').replace(/\D/g, '');
}

export function maskPhoneDigitsTail(digitsOrMixed: string): string {
    const d = digitsOrMixed.replace(/\D/g, '');
    return d.length >= 4 ? `***${d.slice(-4)}` : '***';
}

/**
 * Teléfono para marcar (WhatsApp / llamada).
 * AR móvil 549… → +54 9 11 XXXX XXXX (u otro código de área de 2 dígitos).
 */
export function formatPhoneForDisplay(raw: string | null | undefined): string {
    const d = String(raw || '').replace(/\D/g, '');
    if (!d) return '—';
    if (d.startsWith('549') && d.length >= 12) {
        const local = d.slice(3);
        if (local.length >= 10) {
            const area = local.slice(0, 2);
            const rest = local.slice(2);
            const a = rest.slice(0, 4);
            const b = rest.slice(4, 8);
            const extra = rest.slice(8);
            return `+54 9 ${area} ${a} ${b}${extra}`;
        }
        return `+54 9 ${local}`;
    }
    if (d.startsWith('54')) return `+${d.slice(0, 2)} ${d.slice(2)}`;
    return `+${d}`;
}

/** Clave Redis para mediación “esperando referencia de dirección” (mismo criterio que el webhook). */
export function mediationDirectionRedisKey(phoneRaw: string): string {
    const d = normalizeTwilioWhatsAppFrom(phoneRaw) || phoneRaw.replace(/\D/g, '');
    return `mediation:await_direction:${d}`;
}

/** Tras `cancelar`, no reenviar mensajes al técnico aunque haya job activo (tryForward). TTL por si queda colgada. */
export function userRelayPauseRedisKey(phoneRaw: string): string {
    const d = normalizeTwilioWhatsAppFrom(phoneRaw) || phoneRaw.replace(/\D/g, '');
    return `user_relay_pause:${d}`;
}

/** Saludo con nombre al técnico (Twilio): una vez cada TTL sin repetir. */
export function professionalGreetedRedisKey(phoneRaw: string): string {
    const d = normalizeTwilioWhatsAppFrom(phoneRaw) || phoneRaw.replace(/\D/g, '');
    return `pro_greeted:${d}`;
}
