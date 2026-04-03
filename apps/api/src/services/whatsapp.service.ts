import { env } from '../utils/env';

export class WhatsAppService {
    private static get baseUrl() {
        return `https://graph.facebook.com/v19.0/${env.WA_PHONE_ID}/messages`;
    }

    private static get headers() {
        return {
            'Authorization': `Bearer ${env.WA_TOKEN}`,
            'Content-Type': 'application/json',
        };
    }

    static async sendTextMessage(phone: string, text: string) {
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: {
                preview_url: false,
                body: text,
            },
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error sending WA text message:', errorData);
        }
        return response.json().catch(() => ({}));
    }

    static async sendButtonMessage(
        phone: string,
        text: string,
        buttons: { id: string; title: string }[]
    ) {
        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text },
                action: {
                    buttons: buttons.map((btn) => ({
                        type: 'reply',
                        reply: {
                            id: btn.id,
                            title: btn.title,
                        },
                    })),
                },
            },
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Error sending WA button message:', await response.json());
        }
        return response.json().catch(() => ({}));
    }

    static async sendListMessage(
        phone: string,
        text: string,
        sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
    ) {
        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'interactive',
            interactive: {
                type: 'list',
                body: { text },
                action: {
                    button: 'Elegir opción',
                    sections,
                },
            },
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Error sending WA list message:', await response.json());
        }
        return response.json().catch(() => ({}));
    }

    static async downloadMedia(mediaId: string): Promise<Buffer | null> {
        try {
            const metadataResponse = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
                headers: this.headers,
            });

            if (!metadataResponse.ok) return null;
            const metadata = await metadataResponse.json();

            if (!metadata.url) return null;

            const mediaResponse = await fetch(metadata.url, {
                headers: { 'Authorization': `Bearer ${env.WA_TOKEN}` },
            });

            if (!mediaResponse.ok) return null;

            const arrayBuffer = await mediaResponse.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (err) {
            console.error('Error downloading WA media:', err);
            return null;
        }
    }
}
