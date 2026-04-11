import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma, ProfessionalDocumentKind } from '@servy/db';
import { StorageService } from '../services/storage.service';

const ALLOWED_KINDS = new Set<string>(['dni_front', 'dni_back', 'certification']);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_BYTES = 10 * 1024 * 1024;

function extFromMime(mime: string): string {
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'image/png') return 'png';
    return 'jpg';
}

export const listProfessionalDocuments = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const rows = await prisma.professionalDocument.findMany({
            where: { professional_id: professionalId },
            orderBy: { created_at: 'desc' },
        });
        const data = await Promise.all(
            rows.map(async (r) => ({
                id: r.id,
                kind: r.kind,
                filename: r.filename,
                content_type: r.content_type,
                created_at: r.created_at.toISOString(),
                url: await StorageService.getSignedUrl(r.storage_key),
            }))
        );
        res.json({ success: true, data });
    } catch {
        res.status(500).json({ success: false, error: { message: 'Error al listar documentos' } });
    }
};

export const uploadProfessionalDocument = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const body = req.body as {
            kind?: string;
            filename?: string;
            content_type?: string;
            content_base64?: string;
        };
        const rawKind = String(body.kind || '').trim();
        if (!ALLOWED_KINDS.has(rawKind)) {
            return res.status(400).json({
                success: false,
                error: { message: 'kind inválido: dni_front, dni_back o certification' },
            });
        }
        const kind = rawKind as ProfessionalDocumentKind;
        const contentType = String(body.content_type || '').trim();
        if (!ALLOWED_MIME.has(contentType)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Tipo de archivo no permitido (JPG, PNG o PDF)' },
            });
        }
        const b64 = String(body.content_base64 || '').trim();
        if (!b64) {
            return res.status(400).json({ success: false, error: { message: 'Archivo vacío' } });
        }
        let buffer: Buffer;
        try {
            buffer = Buffer.from(b64, 'base64');
        } catch {
            return res.status(400).json({ success: false, error: { message: 'Base64 inválido' } });
        }
        if (!buffer.length || buffer.length > MAX_BYTES) {
            return res.status(400).json({
                success: false,
                error: { message: `El archivo debe pesar menos de ${MAX_BYTES / (1024 * 1024)} MB` },
            });
        }

        const id = crypto.randomUUID();
        const ext = extFromMime(contentType);
        const key = `professionals/${professionalId}/documents/${id}.${ext}`;

        if (kind === ProfessionalDocumentKind.dni_front || kind === ProfessionalDocumentKind.dni_back) {
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
        res.status(201).json({
            success: true,
            data: {
                id: doc.id,
                kind: doc.kind,
                filename: doc.filename,
                content_type: doc.content_type,
                created_at: doc.created_at.toISOString(),
                url,
            },
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: { message: 'Error al subir documento' } });
    }
};

export const deleteProfessionalDocument = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { id } = req.params;
        const row = await prisma.professionalDocument.findUnique({ where: { id } });
        if (!row || row.professional_id !== professionalId) {
            return res.status(404).json({ success: false, error: { message: 'No encontrado' } });
        }
        try {
            await StorageService.deleteFile(row.storage_key);
        } catch {
            /* object may not exist */
        }
        await prisma.professionalDocument.delete({ where: { id } });
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false, error: { message: 'Error al eliminar' } });
    }
};
