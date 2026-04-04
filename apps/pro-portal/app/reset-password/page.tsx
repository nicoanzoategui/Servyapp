'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!token) {
            setError('Link inválido: falta el token');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (password.length < 12) {
            setError('La contraseña debe tener al menos 12 caracteres');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/professional/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error?.message || 'No se pudo actualizar');
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
            <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
                <p className="text-slate-800 font-medium">Contraseña actualizada. Ya podés iniciar sesión.</p>
                <Link href="/login" className="mt-6 inline-block text-servy-600 font-semibold">
                    Ir al login
                </Link>
            </div>
        );
    }

    return (
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h2 className="text-center text-3xl font-extrabold text-servy-600">Nueva contraseña</h2>
            {error && (
                <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">{error}</div>
            )}
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-medium text-slate-900">Nueva contraseña</label>
                    <input
                        required
                        type="password"
                        autoComplete="new-password"
                        className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-900">Confirmar</label>
                    <input
                        required
                        type="password"
                        autoComplete="new-password"
                        className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-servy-600 py-3 text-sm font-semibold text-white hover:bg-servy-500 disabled:opacity-70"
                >
                    {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-white">
            <Suspense
                fallback={<div className="text-center text-slate-500 animate-pulse">Cargando...</div>}
            >
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
