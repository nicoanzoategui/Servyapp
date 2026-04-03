import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const code = err.code || 'INTERNAL_ERROR';

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
        },
    });
};
