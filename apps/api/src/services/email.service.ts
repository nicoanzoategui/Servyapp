import { Resend } from 'resend';
import { env } from '../utils/env';

const resend = new Resend(env.RESEND_API_KEY);

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export class EmailService {
    static async sendSetPasswordEmail(to: string, name: string, token: string) {
        const safe = escapeHtml(name);
        const link = `${env.FRONTEND_PRO_URL}/set-password?token=${encodeURIComponent(token)}`;
        await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to,
            subject: 'Bienvenido a Servy — Creá tu contraseña',
            html: `
                <h2>Hola ${safe}!</h2>
                <p>Tu cuenta en Servy fue creada. Hacé clic en el botón para crear tu contraseña y empezar a recibir trabajos.</p>
                <a href="${link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin:16px 0;">
                    Crear mi contraseña
                </a>
                <p style="color:#888;font-size:13px;">Este link expira en 48 horas.</p>
            `,
        });
    }

    static async sendResetPasswordEmail(to: string, name: string, token: string) {
        const safe = escapeHtml(name);
        const link = `${env.FRONTEND_PRO_URL}/reset-password?token=${encodeURIComponent(token)}`;
        await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to,
            subject: 'Servy — Recuperá tu contraseña',
            html: `
                <h2>Hola ${safe}!</h2>
                <p>Recibimos una solicitud para resetear tu contraseña de Servy.</p>
                <a href="${link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin:16px 0;">
                    Resetear contraseña
                </a>
                <p style="color:#888;font-size:13px;">Si no lo solicitaste, ignorá este email. El link expira en 2 horas.</p>
            `,
        });
    }
}
