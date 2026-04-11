import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '@servy/db';

export const MIN_PROFESSIONAL_PASSWORD_LEN = 12;

function normalizeProfessionalEmail(email: string): string {
    return String(email).trim().toLowerCase();
}

function normalizeProfessionalPhone(phone: string): string {
    return String(phone).replace(/\s/g, '').replace(/\D/g, '');
}

export async function registerProfessionalViaHttp(body: {
    name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
}): Promise<{ ok: true; id: string } | { ok: false; status: 400; message: string }> {
    if (!body.name?.trim() || !body.last_name?.trim() || !body.email?.trim() || !body.phone?.trim() || !body.password) {
        return { ok: false, status: 400, message: 'Todos los campos son requeridos' };
    }
    if (body.password.length < MIN_PROFESSIONAL_PASSWORD_LEN) {
        return {
            ok: false,
            status: 400,
            message: `La contraseña debe tener al menos ${MIN_PROFESSIONAL_PASSWORD_LEN} caracteres`,
        };
    }
    const emailNorm = normalizeProfessionalEmail(body.email);
    const phoneNorm = normalizeProfessionalPhone(body.phone);
    const existing = await prisma.professional.findFirst({
        where: { OR: [{ email: emailNorm }, { phone: phoneNorm }] },
    });
    if (existing) {
        const msg = existing.email === emailNorm ? 'El email ya está registrado' : 'El teléfono ya está registrado';
        return { ok: false, status: 400, message: msg };
    }
    const password_hash = await bcrypt.hash(body.password, 12);
    const professional = await prisma.professional.create({
        data: {
            name: body.name.trim(),
            last_name: body.last_name.trim(),
            email: emailNorm,
            phone: phoneNorm,
            password_hash,
            status: 'pending',
            onboarding_completed: false,
            categories: [],
            zones: [],
        },
    });
    return { ok: true, id: professional.id };
}

/** Crea profesional con contraseña aleatoria + token `set` (24h) para `/set-password`. No loguea DNI. */
export async function createProfessionalFromWhatsAppWizard(input: {
    name: string;
    last_name: string;
    phone: string;
    email: string;
    dniDigits: string;
    categories: string[];
    zones: string[];
}): Promise<{ ok: true; token: string; firstName: string } | { ok: false; code: 'duplicate_phone' | 'duplicate_email' }> {
    const emailNorm = normalizeProfessionalEmail(input.email);
    const phoneNorm = normalizeProfessionalPhone(input.phone);
    const existing = await prisma.professional.findFirst({
        where: { OR: [{ email: emailNorm }, { phone: phoneNorm }] },
    });
    if (existing) {
        return { ok: false, code: existing.email === emailNorm ? 'duplicate_email' : 'duplicate_phone' };
    }
    const randomPassword = crypto.randomBytes(32).toString('base64url');
    const password_hash = await bcrypt.hash(randomPassword, 12);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
        await tx.professional.create({
            data: {
                name: input.name.trim(),
                last_name: input.last_name.trim(),
                email: emailNorm,
                phone: phoneNorm,
                password_hash,
                dni: input.dniDigits,
                categories: input.categories,
                zones: input.zones,
                status: 'pending',
                onboarding_completed: false,
            },
        });
        await tx.passwordToken.create({
            data: {
                token,
                email: emailNorm,
                type: 'set',
                expires_at: expiresAt,
            },
        });
    });

    return { ok: true, token, firstName: input.name.trim() };
}
