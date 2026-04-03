import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';

export const authenticateJWT = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Token is invalid or expired' },
                });
            }

            req.user = user as { userId: string; role: 'professional' | 'admin' | 'user' };
            next();
        });
    } else {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Auth token is missing' },
        });
    }
};

export const requireRole = (role: 'professional' | 'admin' | 'user') => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Insufficient role permissions' },
            });
        }
        next();
    };
};
