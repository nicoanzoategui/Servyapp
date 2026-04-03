declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: 'professional' | 'admin' | 'user';
            };
        }
    }
}

export {};
