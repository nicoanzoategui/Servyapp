'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { API_URL } from '@/lib/api';

function SetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const [email, setEmail] = useState('');
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

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Ingresá un email válido');
            return;
        }

        if (password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/professional/set-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password, email }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error?.message || 'No se pudo crear la contraseña');
            }
            setDone(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al crear la contraseña');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <CheckCircle className="w-16 h-16 text-servy-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-3">¡Cuenta activada!</h2>
                <p className="text-slate-600 mb-6">
                    Tu contraseña fue creada correctamente. Ya podés iniciar sesión con tu email.
                </p>
                <Link
                    href="/login"
                    className="inline-block bg-servy-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-servy-500 transition"
                >
                    Ir al login
                </Link>
            </div>
        );
    }

    return (
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center mb-10">
                <div className="text-4xl font-black text-servy-600 tracking-tighter mb-4">
                    Servy.
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
                    Activá tu cuenta
                </h2>
                <p className="text-slate-600 text-lg mb-2">
                    Último paso para empezar a recibir trabajos
                </p>
                <p className="text-slate-500 text-sm">
                    Ingresá tu email y elegí una contraseña segura
                </p>
            </div>

            {error && (
                <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
                    {error}
                </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Email</label>
                    <input
                        required
                        type="email"
                        autoComplete="email"
                        className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-servy-600 outline-none"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Contraseña</label>
                    <input
                        required
                        type="password"
                        autoComplete="new-password"
                        className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-servy-600 outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="mt-2 text-sm text-slate-500">Mínimo 8 caracteres</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Confirmar contraseña</label>
                    <input
                        required
                        type="password"
                        autoComplete="new-password"
                        className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-servy-600 outline-none"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-servy-600 py-3 text-sm font-semibold text-white hover:bg-servy-500 disabled:opacity-70 transition mt-6"
                >
                    {loading ? 'Creando cuenta...' : 'Activar cuenta'}
                </button>
            </form>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50">
            <Suspense fallback={<div className="text-center text-slate-500 animate-pulse">Cargando...</div>}>
                <SetPasswordForm />
            </Suspense>
        </div>
    );
}
