import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '@servy/db';
import bcrypt from 'bcrypt';

vi.mock('@servy/db', () => ({
    prisma: {
        professional: {
            findUnique: vi.fn(),
        },
    },
}));

describe('API Endpoints (Black Box Integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /health', () => {
        it('should return 200 with status ok', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('POST /auth/professional/login', () => {
        it('should return 400 if email or password missing', async () => {
            const res = await request(app)
                .post('/auth/professional/login')
                .send({ email: '' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 401 if credentials invalid', async () => {
            (prisma.professional.findUnique as any).mockResolvedValue(null);

            const res = await request(app)
                .post('/auth/professional/login')
                .send({ email: 'nonexistent@example.com', password: 'password123' });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should login successfully and return tokens', async () => {
            const hash = await bcrypt.hash('secret123', 10);
            (prisma.professional.findUnique as any).mockResolvedValue({
                id: 'pro-1',
                email: 'test@example.com',
                password_hash: hash,
            });

            const res = await request(app)
                .post('/auth/professional/login')
                .send({ email: 'test@example.com', password: 'secret123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
        });
    });
});
