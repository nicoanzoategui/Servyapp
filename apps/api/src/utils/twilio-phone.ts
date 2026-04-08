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
