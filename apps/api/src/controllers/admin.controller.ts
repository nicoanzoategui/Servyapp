import { Request, Response } from 'express';
import { prisma } from '@servy/db';

export const getConversations = async (req: Request, res: Response) => {
    try {
        const sessions = await prisma.whatsappSession.findMany({
            orderBy: { expires_at: 'desc' },
            take: 100,
        });
        res.json({ success: true, data: sessions });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error fetching conversations' } });
    }
};

export const getConversationMessages = async (req: Request, res: Response) => {
    try {
        const { phone } = req.params;
        
        // Buscar usuario o profesional
        const user = await prisma.user.findUnique({ 
            where: { phone },
            select: { name: true, phone: true }
        });
        
        const professional = await prisma.professional.findUnique({
            where: { phone },
            select: { name: true, phone: true }
        });
        
        // Buscar sesión activa
        const session = await prisma.whatsappSession.findUnique({
            where: { phone }
        });
        
        // Buscar solicitudes de servicio del usuario (mensajes implícitos)
        const requests = await prisma.serviceRequest.findMany({
            where: { user_phone: phone },
            orderBy: { created_at: 'desc' },
            take: 20,
            select: {
                id: true,
                category: true,
                description: true,
                created_at: true,
            }
        });
        
        res.json({
            success: true,
            data: {
                user: user || professional,
                session,
                requests,
                // TODO: Agregar mensajes reales si guardás historial en DB
                messages: []
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error fetching messages' } });
    }
};
