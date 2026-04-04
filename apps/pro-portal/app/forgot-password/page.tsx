'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/professional/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error?.message || 'Error');
            }
            setDone(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-white">
                <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                    <p className="text-slate-800 font-medium">Si el email existe, recibirás un link en breve.</p>
                    <Link href="/login" className="mt-6 inline-block text-servy-600 font-semibold">
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-white">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="text-center text-3xl font-extrabold text-servy-600">Recuperar contraseña</h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
                {error && (
                    <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">{error}</div>
                )}
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Email</label>
                        <input
                            required
                            type="email"
                            autoComplete="email"
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-servy-600 py-3 text-sm font-semibold text-white hover:bg-servy-500 disabled:opacity-70"
                    >
                        {loading ? 'Enviando...' : 'Enviar link'}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-slate-600">
                    <Link href="/login" className="font-semibold text-servy-600">
                        Volver al login
                    </Link>
                </p>
            </div>
        </div>
    );
}
