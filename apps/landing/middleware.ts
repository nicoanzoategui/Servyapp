import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const DEFAULT_TECNICOS_HOST = 'tecnicos.servy.lat';

function isTecnicosHost(host: string): boolean {
    const primary = (process.env.NEXT_PUBLIC_TECNICOS_HOST?.trim() || DEFAULT_TECNICOS_HOST).toLowerCase();
    const h = host.split(':')[0]?.toLowerCase() ?? '';
    return h === primary || h === `www.${primary}`;
}

export function middleware(request: NextRequest) {
    const rawHost = request.headers.get('host') ?? '';
    const host = rawHost.split(':')[0] ?? '';

    if (!isTecnicosHost(host)) {
        return NextResponse.next();
    }

    if (request.nextUrl.pathname === '/') {
        return NextResponse.rewrite(new URL('/tecnicos', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
