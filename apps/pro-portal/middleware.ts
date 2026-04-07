import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/register', '/forgot-password'];

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/login')) {
        if (token) return NextResponse.redirect(new URL('/dashboard', request.url));
        return NextResponse.next();
    }

    /** Links con token en query: deben abrirse aunque haya sesión previa. */
    if (pathname === '/reset-password' || pathname === '/set-password') {
        return NextResponse.next();
    }

    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        if (token) return NextResponse.redirect(new URL('/dashboard', request.url));
        return NextResponse.next();
    }

    if (pathname.startsWith('/onboarding')) {
        if (!token) return NextResponse.redirect(new URL('/login', request.url));
        return NextResponse.next();
    }

    if (!token) return NextResponse.redirect(new URL('/login', request.url));

    return NextResponse.next();
}

/** Lista blanca: no tocar `/_next/*` (CSS/JS). */
export const config = {
    matcher: [
        '/',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/set-password',
        '/onboarding',
        '/dashboard/:path*',
        '/jobs/:path*',
        '/earnings/:path*',
        '/profile/:path*',
    ],
};
