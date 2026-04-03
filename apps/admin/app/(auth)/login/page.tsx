'use client';

import { useState } from 'react';
import Cookies from 'js-cookie';
import { Shield } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            let data: { success?: boolean; data?: { accessToken?: string }; error?: { message?: string } };
            try {
                data = await res.json();
            } catch {
                throw new Error('La API no respondió JSON. ¿Está corriendo en ' + API_URL + '?');
            }

            if (!res.ok || !data.success || !data.data?.accessToken) {
                throw new Error(data.error?.message || 'Credenciales incorrectas');
            }

            Cookies.set('token', data.data.accessToken, {
                expires: 1,
                path: '/',
                sameSite: 'lax',
            });
            window.location.assign('/dashboard');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error';
            setError(
                msg === 'Failed to fetch'
                    ? `No se pudo conectar con la API. ¿Corre en ${API_URL}?`
                    : msg
            );
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-servy-50 via-white to-slate-100 px-4 py-12">
            <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                    backgroundImage: `radial-gradient(circle at 20% 20%, rgb(14 165 233 / 0.12), transparent 45%),
            radial-gradient(circle at 80% 80%, rgb(2 132 199 / 0.1), transparent 40%)`,
                }}
            />

            <div className="relative w-full max-w-md">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-servy-600 text-white shadow-lg shadow-servy-600/25">
                        <Shield className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Servy Admin</h1>
                    <p className="mt-2 text-sm text-slate-600">Ingresá con tu cuenta de operador</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
                    {error && (
                        <div
                            role="alert"
                            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        <div>
                            <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-slate-800">
                                Email
                            </label>
                            <input
                                id="admin-email"
                                type="email"
                                autoComplete="email"
                                placeholder="admin@servy.local"
                                className="block w-full rounded-xl border-0 bg-slate-50 py-3 pl-4 pr-4 text-slate-900 shadow-inner ring-1 ring-inset ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-servy-500"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-slate-800">
                                Contraseña
                            </label>
                            <input
                                id="admin-password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="block w-full rounded-xl border-0 bg-slate-50 py-3 pl-4 pr-4 text-slate-900 shadow-inner ring-1 ring-inset ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-servy-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 flex w-full items-center justify-center rounded-xl bg-servy-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-servy-600/20 transition hover:bg-servy-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-servy-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'Ingresando…' : 'Iniciar sesión'}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-xs text-slate-500">Backoffice Servy · uso interno</p>
            </div>
        </div>
    );
}
