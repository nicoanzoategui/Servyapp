import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../middlewares/errorHandler';

describe('Error Handler Middleware', () => {
    it('should return 500 and success: false by default', () => {
        const req: any = {};
        const res: any = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        const next: any = vi.fn();
        const error = new Error('Generic error');

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    });
});
