'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Loader2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }

        const verify = async () => {
            try {
                const res = await fetch(
                    `${API_URL}/auth/professional/magic-verify?token=${encodeURIComponent(token)}`
                );
                const data = await res.json();

                if (!res.ok || !data.success) {
                    const errorMsg = data.error?.message || 'Link inválido o expirado';

                    router.push(`/login?error=${encodeURIComponent(errorMsg)}`);
                    return;
                }

                Cookies.set('token', data.data.accessToken, {
                    expires: 7,
                    path: '/',
                    sameSite: 'lax',
                });

                router.push('/dashboard');
            } catch (error) {
                console.error('Error verificando link:', error);
                router.push('/login?error=Error de conexión');
            }
        };

        void verify();
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center max-w-md px-6">
                <div className="mb-6">
                    <div className="text-3xl font-black text-servy-600 tracking-tighter mb-8">Servy.</div>
                </div>
                <Loader2 className="w-12 h-12 animate-spin text-servy-600 mx-auto mb-4" />
                <p className="text-slate-900 font-semibold text-lg mb-2">Verificando tu acceso</p>
                <p className="text-slate-600 text-sm">Estamos activando tu cuenta...</p>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <Loader2 className="w-12 h-12 animate-spin text-servy-600" />
                </div>
            }
        >
            <VerifyContent />
        </Suspense>
    );
}
