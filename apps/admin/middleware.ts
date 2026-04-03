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

    // In a real app we'd verify the JWT signature here using jose or similar edge-compatible JWT library
    // For the sake of this implementation, presence of cookie is checked locally allowing API to handle strict auth
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
