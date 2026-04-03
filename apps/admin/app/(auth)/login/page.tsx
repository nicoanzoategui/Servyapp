'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error?.message || 'Login failed');
            }

            Cookies.set('token', data.data.accessToken, { expires: 1 });
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl border border-slate-100">
                <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Servy Admin</h1>
                {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            autoComplete="email"
                            className="w-full rounded-md border p-2 outline-none focus:border-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            className="w-full rounded-md border p-2 outline-none focus:border-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-4 w-full rounded-md bg-blue-600 p-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
