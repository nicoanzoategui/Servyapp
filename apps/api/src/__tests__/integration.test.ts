import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middlewares/errorHandler';

const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use(errorHandler);

describe('API Integration', () => {
    it('should return 200 on /health', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
