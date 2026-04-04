import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@servy/db';
import { env } from '../utils/env';

const generateTokens = (userId: string, role: string) => {
    const accessToken = jwt.sign(
        { userId, role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    const refreshToken = jwt.sign(
        { userId, role },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
};

export const professionalLogin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'Email and password are required' },
            });
        }

        const emailNorm = String(email).trim().toLowerCase();
        const professional = await prisma.professional.findUnique({
            where: { email: emailNorm },
        });

        if (!professional) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
            });
        }

        const isMatch = await bcrypt.compare(password, professional.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
            });
        }

        const tokens = generateTokens(professional.id, 'professional');

        res.json({
            success: true,
            data: tokens,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
        });
    }
};

export const adminLogin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'Email and password are required' },
            });
        }

        const admin = await prisma.admin.findUnique({
            where: { email },
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
            });
        }

        const tokens = generateTokens(admin.id, 'admin');

        res.json({
            success: true,
            data: tokens,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
        });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'Refresh token is required' },
            });
        }

        jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, (err: any, decoded: any) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Invalid or expired refresh token' },
                });
            }

            const { userId, role } = decoded;
            const accessToken = jwt.sign(
                { userId, role },
                env.JWT_SECRET,
                { expiresIn: env.JWT_EXPIRES_IN as any }
            );

            res.json({
                success: true,
                data: { accessToken },
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
        });
    }
};
