import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '@servy/db';
import { EmailService } from '../services/email.service';

const MIN_PASSWORD_LEN = 12;

export const registerProfessional = async (req: Request, res: Response) => {
    try {
        const { name, last_name, email, phone, password } = req.body;
        if (!name || !last_name || !email || !phone || !password) {
            return res.status(400).json({ success: false, error: { message: 'Todos los campos son requeridos' } });
        }
        if (typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
            return res.status(400).json({
                success: false,
                error: { message: `La contraseña debe tener al menos ${MIN_PASSWORD_LEN} caracteres` },
            });
        }
        const emailNorm = String(email).trim().toLowerCase();
        const phoneNorm = String(phone).replace(/\s/g, '');
        const existing = await prisma.professional.findFirst({
            where: { OR: [{ email: emailNorm }, { phone: phoneNorm }] },
        });
        if (existing) {
            const msg = existing.email === emailNorm ? 'El email ya está registrado' : 'El teléfono ya está registrado';
            return res.status(400).json({ success: false, error: { message: msg } });
        }
        const password_hash = await bcrypt.hash(password, 12);
        const professional = await prisma.professional.create({
            data: {
                name: String(name).trim(),
                last_name: String(last_name).trim(),
                email: emailNorm,
                phone: phoneNorm,
                password_hash,
                status: 'pending',
                onboarding_completed: false,
                categories: [],
                zones: [],
            },
        });
        res.status(201).json({ success: true, data: { id: professional.id } });
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
        if (!token || !password || typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
            return res.status(400).json({
                success: false,
                error: { message: `Token y contraseña requeridos (mín. ${MIN_PASSWORD_LEN} caracteres)` },
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
        const { token, password } = req.body;
        if (!token || !password || typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
            return res.status(400).json({
                success: false,
                error: { message: `Token y contraseña requeridos (mín. ${MIN_PASSWORD_LEN} caracteres)` },
            });
        }
        const record = await prisma.passwordToken.findUnique({ where: { token } });
        if (!record || record.used || record.expires_at < new Date() || record.type !== 'set') {
            return res.status(400).json({ success: false, error: { message: 'Token inválido o expirado' } });
        }
        const password_hash = await bcrypt.hash(password, 12);
        await prisma.professional.update({ where: { email: record.email }, data: { password_hash } });
        await prisma.passwordToken.update({ where: { token }, data: { used: true } });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: 'Error al setear contraseña' } });
    }
};
