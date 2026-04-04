'use client';

import { useState } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
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
            const res = await fetch(`${API_URL}/auth/professional/login`, {
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
                throw new Error(data.error?.message || 'Login fallido');
            }

            Cookies.set('token', data.data.accessToken, {
                expires: 7,
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
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-white">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="mt-10 text-center text-3xl font-extrabold leading-9 tracking-tight text-servy-600">ServyProfesionales</h2>
                <p className="mt-2 text-center text-sm text-slate-600">Ingresá a tu cuenta para cotizar trabajos</p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">{error}</div>}
                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-medium leading-6 text-slate-900">Email</label>
                        <div className="mt-2">
                            <input
                                required
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-servy-600 sm:text-sm sm:leading-6"
                                placeholder="vos@ejemplo.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium leading-6 text-slate-900">Contraseña</label>
                        <div className="mt-2">
                            <input
                                required
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-servy-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            disabled={loading}
                            type="submit"
                            className="flex w-full justify-center rounded-xl bg-servy-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-servy-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-servy-600 disabled:opacity-70 transition-all"
                        >
                            {loading ? 'Iniciando sesión...' : 'Ingresar al Portal'}
                        </button>
                    </div>
                </form>
                <p className="mt-6 text-center text-sm text-slate-600">
                    ¿No tenés cuenta?{' '}
                    <Link href="/register" className="font-semibold text-servy-600">
                        Registrate
                    </Link>
                </p>
                <p className="mt-2 text-center text-sm text-slate-600">
                    <Link href="/forgot-password" className="font-semibold text-servy-600">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </p>
            </div>
        </div>
    );
}
