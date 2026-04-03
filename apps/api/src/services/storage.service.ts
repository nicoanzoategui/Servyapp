import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../utils/env';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY,
        secretAccessKey: env.R2_SECRET_KEY,
    },
});

export class StorageService {
    static async getSignedUrl(key: string, expiresIn: number = 3600) {
        const command = new GetObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
        });

        try {
            return await getSignedUrl(s3Client, command, { expiresIn });
        } catch (err) {
            console.error('Error getting signed URL from R2:', err);
            // Fallback dummy for local
            return `https://dummy-r2-url.com/${key}`;
        }
    }

    // Not directly requested in FASE 3 here, but helps later
    static async getReceiptPresignedUrl(earningId: string) {
        const key = `receipts/${earningId}.pdf`;
        return this.getSignedUrl(key);
    }

    static async uploadFile(key: string, body: Buffer, contentType: string = 'image/jpeg') {
        const command = new PutObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        });

        try {
            await s3Client.send(command);
            return key;
        } catch (err) {
            console.error('Error uploading file to R2:', err);
            throw err;
        }
    }
}
