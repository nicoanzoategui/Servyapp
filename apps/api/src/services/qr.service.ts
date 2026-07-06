import QRCode from 'qrcode';
import { StorageService } from './storage.service';

/** Payload escaneable por el portal del técnico (POST /professional/jobs/:id/complete-qr). */
export function qrPayloadForJob(jobId: string): string {
    return `servy:qr:${jobId}`;
}

export class QRService {
    static async generateAndUpload(jobId: string): Promise<string> {
        const payload = qrPayloadForJob(jobId);
        const buffer = await QRCode.toBuffer(payload, {
            type: 'png',
            width: 400,
            margin: 2,
        });
        const key = `qrcodes/${jobId}.png`;
        await StorageService.uploadFile(key, buffer, 'image/png');
        return StorageService.getSignedUrl(key, 60 * 60 * 24 * 7);
    }

    /** Extrae jobId de `servy:qr:…` o de URL legacy `/jobs/:id/release`. */
    static parseQR(data: string): string | null {
        const t = data.trim();
        const prefix = 'servy:qr:';
        if (t.startsWith(prefix)) return t.slice(prefix.length);
        const m = t.match(/\/jobs\/([^/]+)\/release\/?(?:\?.*)?$/i);
        return m?.[1] ?? null;
    }
}
