import { prisma } from '@servy/db';
import { normalizeTwilioWhatsAppFrom } from '../utils/twilio-phone';

function digits(phone: string): string {
    return normalizeTwilioWhatsAppFrom(phone) || phone.replace(/\D/g, '');
}

export async function logWhatsappMessage(input: {
    phone: string;
    direction: 'inbound' | 'outbound';
    type?: string;
    body: string;
}): Promise<void> {
    const phone = digits(input.phone);
    const body = String(input.body || '').slice(0, 8000);
    if (!phone || !body) return;
    try {
        await prisma.whatsappMessage.create({
            data: {
                phone,
                direction: input.direction,
                type: input.type || 'text',
                body,
            },
        });
    } catch (e) {
        console.error('[whatsapp] no se pudo guardar el mensaje', e);
    }
}
