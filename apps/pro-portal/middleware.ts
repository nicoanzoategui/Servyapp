import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;

    if (request.nextUrl.pathname.startsWith('/login')) {
        if (token) return NextResponse.redirect(new URL('/dashboard', request.url));
        return NextResponse.next();
    }

    if (!token) return NextResponse.redirect(new URL('/login', request.url));

    return NextResponse.next();
}

/** Lista blanca: no tocar `/_next/*` (CSS/JS). */
export const config = {
    matcher: ['/login', '/dashboard/:path*', '/jobs/:path*', '/earnings/:path*', '/profile/:path*'],
};
