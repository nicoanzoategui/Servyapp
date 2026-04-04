/**
 * Alta de profesional (portal) con contraseña hasheada (bcrypt).
 *
 *   cd packages/db
 *   PRO_EMAIL=pro@servy.ar PRO_PASSWORD='clave_min_12' PRO_NAME=Nicolás PRO_LAST_NAME=Anzoategui PRO_PHONE=5491115000999 pnpm create-professional
 *
 * Opcionales (env):
 *   PRO_CATEGORIES=Plomería,Electricidad
 *   PRO_ZONES=Capital Federal,GBA Norte
 *   PRO_STATUS=active|pending  (default active)
 *
 * Para enviar el email de “crear contraseña”, definí también (misma API que en apps/api/.env):
 *   RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_PRO_URL
 */
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaClient, ProfessionalStatus } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();

function parseList(raw: string | undefined, fallback: string[]): string[] {
    if (!raw?.trim()) return fallback;
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
    const email = process.env.PRO_EMAIL?.trim();
    const password = process.env.PRO_PASSWORD;
    const name = process.env.PRO_NAME?.trim();
    const last_name = process.env.PRO_LAST_NAME?.trim();
    const phone = process.env.PRO_PHONE?.trim().replace(/\s/g, '');

    if (!email || !password || !name || !last_name || !phone) {
        console.error(`
Faltan variables obligatorias:

  PRO_EMAIL=correo@dominio.com
  PRO_PASSWORD='mínimo_12_caracteres'
  PRO_NAME=Nombre
  PRO_LAST_NAME=Apellido
  PRO_PHONE=5491112345678

Opcionales:
  PRO_CATEGORIES=Plomería,Electricidad
  PRO_ZONES=Capital Federal
  PRO_STATUS=active|pending

Ejemplo:
  PRO_EMAIL=pro@servy.ar PRO_PASSWORD='...' PRO_NAME=Nico PRO_LAST_NAME=A. PRO_PHONE=5491115000999 pnpm create-professional
`);
        process.exit(1);
    }

    if (password.length < 12) {
        console.error('PRO_PASSWORD debe tener al menos 12 caracteres.');
        process.exit(1);
    }

    const categories = parseList(process.env.PRO_CATEGORIES, ['Plomería']);
    const zones = parseList(process.env.PRO_ZONES, ['Capital Federal']);
    const statusRaw = (process.env.PRO_STATUS || 'active').toLowerCase();
    const status: ProfessionalStatus =
        statusRaw === 'pending' ? ProfessionalStatus.pending : ProfessionalStatus.active;

    const password_hash = await bcrypt.hash(password, 12);

    const byEmail = await prisma.professional.findUnique({ where: { email } });
    const byPhone = await prisma.professional.findUnique({ where: { phone } });

    if (byPhone && byPhone.email !== email) {
        console.error(`El teléfono ya está en uso por: ${byPhone.email}`);
        process.exit(1);
    }
    if (byEmail && byPhone && byEmail.id !== byPhone.id) {
        console.error('Conflicto: email y teléfono corresponden a dos registros distintos.');
        process.exit(1);
    }

    let pro;
    if (byEmail) {
        pro = await prisma.professional.update({
            where: { id: byEmail.id },
            data: {
                password_hash,
                name,
                last_name,
                phone,
                categories,
                zones,
                status,
                onboarding_completed: true,
                is_urgent: true,
                is_scheduled: true,
            },
        });
        console.log(`Profesional actualizado: ${email}`);
    } else {
        pro = await prisma.professional.create({
            data: {
                email,
                password_hash,
                name,
                last_name,
                phone,
                categories,
                zones,
                status,
                onboarding_completed: true,
                is_urgent: true,
                is_scheduled: true,
            },
        });
        console.log(`Profesional creado: ${email}`);
    }

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordToken.create({
        data: {
            token,
            email: pro.email,
            type: 'set',
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
    });

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@servy.lat';
    const frontendPro = process.env.FRONTEND_PRO_URL;

    if (resendKey && frontendPro) {
        try {
            const resend = new Resend(resendKey);
            const link = `${frontendPro.replace(/\/$/, '')}/set-password?token=${encodeURIComponent(token)}`;
            await resend.emails.send({
                from: fromEmail,
                to: pro.email,
                subject: 'Bienvenido a Servy — Creá tu contraseña',
                html: `
        <h2>Hola ${pro.name}!</h2>
        <p>Tu cuenta en Servy fue creada. Hacé clic para crear tu contraseña.</p>
        <a href="${link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin:16px 0;">
            Crear mi contraseña
        </a>
        <p style="color:#888;font-size:13px;">Este link expira en 48 horas.</p>
    `,
            });
            console.log(`Email enviado a ${pro.email} con link para setear contraseña.`);
        } catch (e) {
            console.error('No se pudo enviar el email (Resend):', e);
        }
    } else {
        console.warn(
            'Omitiendo envío de email: definí RESEND_API_KEY y FRONTEND_PRO_URL en el entorno (p. ej. exportando desde apps/api/.env).'
        );
    }

    console.log('Podés entrar al portal profesional con ese email y contraseña (o usá el link del email).');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
