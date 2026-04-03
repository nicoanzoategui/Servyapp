import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@servy/db';

const leadSchema = z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(320),
    phone: z.string().min(6).max(40),
    categories: z.array(z.string()).optional(),
    zone: z.string().max(200).optional(),
});

export const createProfessionalLead = async (req: Request, res: Response) => {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: { code: 'BAD_REQUEST', message: 'Datos inválidos', details: parsed.error.flatten() },
        });
    }

    const { name, email, phone, categories, zone } = parsed.data;

    await prisma.professionalLead.create({
        data: {
            name,
            email,
            phone,
            categories: categories ?? [],
            zone: zone ?? null,
        },
    });

    res.status(201).json({ success: true, message: 'Recibido correctamente' });
};
