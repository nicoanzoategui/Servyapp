import QRCode from 'qrcode';
import { StorageService } from './storage.service';

export class QRService {
    static async generateAndUpload(jobId: string): Promise<string> {
        const data = `servy:qr:${jobId}`;
        const buffer = await QRCode.toBuffer(data, {
            type: 'png',
            width: 400,
            margin: 2,
        });
        const key = `qrcodes/${jobId}.png`;
        await StorageService.uploadFile(key, buffer, 'image/png');
        const url = await StorageService.getSignedUrl(key, 60 * 60 * 24 * 7);
        return url;
    }

    static parseQR(data: string): string | null {
        const prefix = 'servy:qr:';
        const t = data.trim();
        if (!t.startsWith(prefix)) return null;
        return t.slice(prefix.length);
    }
}
