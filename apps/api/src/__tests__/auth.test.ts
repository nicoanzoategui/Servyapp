import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';

vi.mock('jsonwebtoken');
vi.mock('../utils/env', () => ({
    env: {
        JWT_SECRET: 'test_secret'
    }
}));

describe('Auth Middleware', () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe('authenticateJWT', () => {
        it('should return 401 if header missing', () => {
            authenticateJWT(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 403 if token invalid', () => {
            req.headers.authorization = 'Bearer invalid';
            (jwt.verify as any).mockImplementation(
                (_token: string, _secret: string, cb: jwt.VerifyCallback) =>
                    cb(new Error('Invalid') as jwt.VerifyErrors, undefined)
            );

            authenticateJWT(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should call next if token valid', () => {
            req.headers.authorization = 'Bearer valid';
            const mockUser = { userId: '1', role: 'admin' };
            (jwt.verify as any).mockImplementation(
                (_token: string, _secret: string, cb: jwt.VerifyCallback) => cb(null, mockUser)
            );

            authenticateJWT(req, res, next);
            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('requireRole', () => {
        it('should return 403 if role mismatch', () => {
            req.user = { role: 'professional' };
            const middleware = requireRole('admin');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should call next if role match', () => {
            req.user = { role: 'admin' };
            const middleware = requireRole('admin');
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
