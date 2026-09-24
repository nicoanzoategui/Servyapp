import crypto from 'crypto';
import { prisma, ProfessionalDocumentKind } from '@servy/db';
import { StorageService } from './storage.service';
import { recomputeProfileOperationalCompleteAndNotify } from './professional-profile-completion.service';

export const PROFESSIONAL_DOCUMENT_KINDS = [
    'dni_front',
    'dni_back',
    'criminal_record',
    'certification',
] as const;

export type ProfessionalDocumentKindId = (typeof PROFESSIONAL_DOCUMENT_KINDS)[number];

const ALLOWED_KINDS = new Set<string>(PROFESSIONAL_DOCUMENT_KINDS);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_KIND_LABELS: Record<ProfessionalDocumentKindId, string> = {
    dni_front: 'DNI frente',
    dni_back: 'DNI dorso',
    criminal_record: 'Antecedentes penales',
    certification: 'Matrícula / certificación',
};

export type DocumentUploadBody = {
    kind?: string;
    filename?: string;
    content_type?: string;
    content_base64?: string;
};

export type DocumentPublicRow = {
    id: string;
    kind: string;
    filename: string | null;
    content_type: string;
    created_at: string;
    url: string;
};

function extFromMime(mime: string): string {
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'image/png') return 'png';
    return 'jpg';
}

export function isAllowedDocumentKind(kind: string): kind is ProfessionalDocumentKindId {
    return ALLOWED_KINDS.has(kind);
}

export async function listDocumentsForProfessional(professionalId: string): Promise<DocumentPublicRow[]> {
    const rows = await prisma.professionalDocument.findMany({
        where: { professional_id: professionalId },
        orderBy: { created_at: 'desc' },
    });
    return Promise.all(
        rows.map(async (r) => ({
            id: r.id,
            kind: r.kind,
            filename: r.filename,
            content_type: r.content_type,
            created_at: r.created_at.toISOString(),
            url: await StorageService.getSignedUrl(r.storage_key),
        }))
    );
}

export async function saveDocumentForProfessional(
    professionalId: string,
    body: DocumentUploadBody
): Promise<{ ok: true; data: DocumentPublicRow } | { ok: false; status: number; message: string }> {
    const rawKind = String(body.kind || '').trim();
    if (!isAllowedDocumentKind(rawKind)) {
        return {
            ok: false,
            status: 400,
            message: 'kind inválido: dni_front, dni_back, criminal_record o certification',
        };
    }
    const kind = rawKind as ProfessionalDocumentKind;
    const contentType = String(body.content_type || '').trim();
    if (!ALLOWED_MIME.has(contentType)) {
        return { ok: false, status: 400, message: 'Tipo de archivo no permitido (JPG, PNG o PDF)' };
    }
    const b64 = String(body.content_base64 || '').trim();
    if (!b64) {
        return { ok: false, status: 400, message: 'Archivo vacío' };
    }
    let buffer: Buffer;
    try {
        buffer = Buffer.from(b64, 'base64');
    } catch {
        return { ok: false, status: 400, message: 'Base64 inválido' };
    }
    if (!buffer.length || buffer.length > MAX_BYTES) {
        return { ok: false, status: 400, message: `El archivo debe pesar menos de ${MAX_BYTES / (1024 * 1024)} MB` };
    }

    const id = crypto.randomUUID();
    const ext = extFromMime(contentType);
    const key = `professionals/${professionalId}/documents/${id}.${ext}`;

    const existing = await prisma.professionalDocument.findMany({
        where: { professional_id: professionalId, kind },
    });
    for (const e of existing) {
        try {
            await StorageService.deleteFile(e.storage_key);
        } catch {
            /* ignore */
        }
        await prisma.professionalDocument.delete({ where: { id: e.id } });
    }

    await StorageService.uploadFile(key, buffer, contentType);

    const filename = typeof body.filename === 'string' ? body.filename.trim().slice(0, 200) : null;
    const doc = await prisma.professionalDocument.create({
        data: {
            professional_id: professionalId,
            kind,
            storage_key: key,
            filename: filename || null,
            content_type: contentType,
            size_bytes: buffer.length,
        },
    });
    const url = await StorageService.getSignedUrl(doc.storage_key);
    await recomputeProfileOperationalCompleteAndNotify(professionalId);
    return {
        ok: true,
        data: {
            id: doc.id,
            kind: doc.kind,
            filename: doc.filename,
            content_type: doc.content_type,
            created_at: doc.created_at.toISOString(),
            url,
        },
    };
}

export async function deleteDocumentForProfessional(
    professionalId: string,
    documentId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
    const row = await prisma.professionalDocument.findUnique({ where: { id: documentId } });
    if (!row || row.professional_id !== professionalId) {
        return { ok: false, status: 404, message: 'No encontrado' };
    }
    try {
        await StorageService.deleteFile(row.storage_key);
    } catch {
        /* object may not exist */
    }
    await prisma.professionalDocument.delete({ where: { id: documentId } });
    await recomputeProfileOperationalCompleteAndNotify(professionalId);
    return { ok: true };
}
