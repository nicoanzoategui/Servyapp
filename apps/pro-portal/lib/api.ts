const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
export const API_URL = raw && raw.length > 0 ? raw : 'http://localhost:3000';
