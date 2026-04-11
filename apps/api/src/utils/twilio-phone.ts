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
