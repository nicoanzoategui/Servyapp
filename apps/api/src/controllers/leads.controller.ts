import { Request, Response } from 'express';
import { z } from 'zod';
import { createProfessionalFromWebForm } from '../services/professional-registration.internal';
import { WhatsAppService } from '../services/whatsapp.service';
import { env } from '../utils/env';

const leadSchema = z.object({
    name: z.string().min(1).max(200),
    phone: z.string().min(6).max(40),
    categories: z.array(z.string()).min(1, 'Seleccioná al menos una categoría'),
    zone: z.string().min(1).max(200),
});

export const createProfessionalLead = async (req: Request, res: Response) => {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: { code: 'BAD_REQUEST', message: 'Datos inválidos', details: parsed.error.flatten() },
        });
    }

    const { name, phone, categories, zone } = parsed.data;

    const zones = zone.split(',').map((z) => z.trim()).filter(Boolean);

    const result = await createProfessionalFromWebForm({
        name,
        phone,
        categories,
        zones,
    });

    if (!result.ok) {
        return res.status(400).json({
            success: false,
            error: {
                code: (result as any).code,
                message: 'Este número de teléfono ya está registrado. Si ya tenés cuenta, iniciá sesión en el portal.',
            },
        });
    }

    const base = env.FRONTEND_PRO_URL.replace(/\/$/, '');
    const link = `${base}/auth/verify?token=${encodeURIComponent(result.token)}`;

    try {
        await WhatsAppService.sendTextMessage(
            result.phone,
            `✅ *¡Hola ${result.firstName}!* Gracias por sumarte a Servy.\n\nPara entrar al portal (iniciás sesión automática) y completar tu perfil, abrí este link:\n👉 ${link}\n\n_El link es válido por 24 horas._\n\nDespués podés definir tu contraseña desde el portal si querés. Cuando completes el perfil vas a poder recibir trabajos en tu zona. 💪`
        );
    } catch (error) {
        console.error('[leads] Error enviando WhatsApp:', error);
    }

    res.status(201).json({
        success: true,
        message: 'Registro exitoso. Te enviamos un WhatsApp con el link para activar tu cuenta.',
    });
};
