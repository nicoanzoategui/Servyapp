import { StorageService } from './storage.service';
import { env } from '../utils/env';

const PHOTO_URL_TTL_SEC = 60 * 60;

/** Extrae la key de R2 aunque el valor guardado sea una URL firmada vieja. */
export function storageKeyFromPhotoRef(ref: string): string | null {
    const raw = (ref || '').trim();
    if (!raw) return null;
    if (!/^https?:\/\//i.test(raw)) {
        return raw.replace(/^\//, '');
    }
    try {
        const u = new URL(raw);
        let path = decodeURIComponent(u.pathname).replace(/^\//, '');
        const bucket = env.R2_BUCKET;
        if (bucket && (path === bucket || path.startsWith(`${bucket}/`))) {
            path = path.slice(bucket.length).replace(/^\//, '');
        }
        const marker = path.indexOf('requests/');
        if (marker >= 0) return path.slice(marker);
        return path || null;
    } catch {
        return null;
    }
}

export async function signedUrlsForPhotos(photos: string[] | null | undefined): Promise<string[]> {
    const refs = photos || [];
    const out: string[] = [];
    for (const ref of refs) {
        const key = storageKeyFromPhotoRef(ref);
        if (!key) continue;
        out.push(await StorageService.getSignedUrl(key, PHOTO_URL_TTL_SEC));
    }
    return out;
}
