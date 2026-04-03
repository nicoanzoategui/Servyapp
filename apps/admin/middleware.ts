import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;

    if (request.nextUrl.pathname.startsWith('/login')) {
        if (token) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.next();
    }

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

/**
 * Solo rutas de la app. Nunca `/_next/*` (CSS/JS/fuentes) → evita redirect a /login
 * que rompe Tailwind (el navegador recibe HTML en lugar del .css).
 */
export const config = {
    matcher: [
        '/',
        '/login',
        '/dashboard/:path*',
        '/conversations/:path*',
        '/professionals/:path*',
        '/jobs/:path*',
        '/finance/:path*',
        '/settings/:path*',
    ],
};
