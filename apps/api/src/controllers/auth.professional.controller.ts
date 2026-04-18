import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@servy/db';
import { EmailService } from '../services/email.service';
import bcrypt from 'bcrypt';
import {
    MIN_PROFESSIONAL_PASSWORD_LEN,
    registerProfessionalViaHttp,
} from '../services/professional-registration.internal';

export const registerProfessional = async (req: Request, res: Response) => {
    try {
        const { name, last_name, email, phone, password } = req.body;
        const result = await registerProfessionalViaHttp({
            name: String(name ?? ''),
            last_name: String(last_name ?? ''),
            email: String(email ?? ''),
            phone: String(phone ?? ''),
            password: String(password ?? ''),
        });
        if (!result.ok) {
            return res.status(result.status).json({ success: false, error: { message: result.message } });
        }
        res.status(201).json({ success: true, data: { id: result.id } });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error al registrar' } });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, error: { message: 'Email requerido' } });
        }
        const emailNorm = String(email).trim().toLowerCase();
        const professional = await prisma.professional.findUnique({ where: { email: emailNorm } });
        if (!professional) {
            return res.status(200).json({ success: true });
        }
        const token = crypto.randomBytes(32).toString('hex');
        await prisma.passwordToken.create({
            data: {
                token,
                email: emailNorm,
                type: 'reset',
                expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
            },
        });
        await EmailService.sendResetPasswordEmail(emailNorm, professional.name || '', token);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error al procesar' } });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;
        if (!token || !password || typeof password !== 'string' || password.length < MIN_PROFESSIONAL_PASSWORD_LEN) {
            return res.status(400).json({
                success: false,
                error: { message: `Token y contraseña requeridos (mín. ${MIN_PROFESSIONAL_PASSWORD_LEN} caracteres)` },
            });
        }
        const record = await prisma.passwordToken.findUnique({ where: { token } });
        if (!record || record.used || record.expires_at < new Date() || record.type !== 'reset') {
            return res.status(400).json({ success: false, error: { message: 'Token inválido o expirado' } });
        }
        const password_hash = await bcrypt.hash(password, 12);
        await prisma.professional.update({ where: { email: record.email }, data: { password_hash } });
        await prisma.passwordToken.update({ where: { token }, data: { used: true } });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error al resetear' } });
    }
};

export const setPassword = async (req: Request, res: Response) => {
    try {
        const { token, password, email } = req.body;

        if (!token || !password || typeof password !== 'string' || password.length < MIN_PROFESSIONAL_PASSWORD_LEN) {
            return res.status(400).json({
                success: false,
                error: { message: `Token y contraseña requeridos (mín. ${MIN_PROFESSIONAL_PASSWORD_LEN} caracteres)` },
            });
        }

        // Email es opcional: si viene, debe ser válido
        let emailNorm: string | null = null;
        if (email && typeof email === 'string') {
            const trimmed = email.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Email inválido' },
                });
            }
            emailNorm = trimmed;
        }

        const record = await prisma.passwordToken.findUnique({ where: { token } });
        if (!record || record.used || record.expires_at < new Date() || record.type !== 'set') {
            return res.status(400).json({
                success: false,
                error: { message: 'Token inválido o expirado' },
            });
        }

        if (emailNorm) {
            const existingWithEmail = await prisma.professional.findUnique({
                where: { email: emailNorm },
            });

            if (existingWithEmail && existingWithEmail.email !== record.email) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Este email ya está registrado' },
                });
            }
        }

        const password_hash = await bcrypt.hash(password, 12);
        await prisma.professional.update({
            where: { email: record.email },
            data: {
                password_hash,
                ...(emailNorm ? { email: emailNorm } : {}),
            },
        });

        await prisma.passwordToken.update({
            where: { token },
            data: { used: true },
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[setPassword] Error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Error al activar la cuenta' },
        });
    }
};
