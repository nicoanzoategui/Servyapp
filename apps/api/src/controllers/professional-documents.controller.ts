import { Request, Response } from 'express';
import {
    deleteDocumentForProfessional,
    listDocumentsForProfessional,
    saveDocumentForProfessional,
} from '../services/professional-documents.service';

export const listProfessionalDocuments = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const data = await listDocumentsForProfessional(professionalId);
        res.json({ success: true, data });
    } catch {
        res.status(500).json({ success: false, error: { message: 'Error al listar documentos' } });
    }
};

export const uploadProfessionalDocument = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const result = await saveDocumentForProfessional(professionalId, req.body);
        if (result.ok === false) {
            return res.status(result.status).json({ success: false, error: { message: result.message } });
        }
        res.status(201).json({ success: true, data: result.data });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: { message: 'Error al subir documento' } });
    }
};

export const deleteProfessionalDocument = async (req: Request, res: Response) => {
    try {
        const professionalId = req.user!.userId;
        const { id } = req.params;
        const result = await deleteDocumentForProfessional(professionalId, id);
        if (result.ok === false) {
            return res.status(result.status).json({ success: false, error: { message: result.message } });
        }
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false, error: { message: 'Error al eliminar' } });
    }
};
