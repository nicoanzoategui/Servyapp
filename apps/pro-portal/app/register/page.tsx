'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

export default function RegisterPage() {
    const [form, setForm] = useState({
        name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        confirm: '',
    });
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (form.password.length < 12) {
            setError('La contraseña debe tener al menos 12 caracteres');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/professional/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    last_name: form.last_name,
                    email: form.email,
                    phone: form.phone,
                    password: form.password,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error?.message || 'No se pudo registrar');
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
                    <p className="text-slate-800 font-medium">Cuenta creada. Revisá tu email para verificar.</p>
                    <Link href="/login" className="mt-6 inline-block text-servy-600 font-semibold">
                        Ir al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-white">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="text-center text-3xl font-extrabold text-servy-600">Crear cuenta</h2>
                <p className="mt-2 text-center text-sm text-slate-600">Registrate como profesional en Servy</p>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
                {error && (
                    <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">{error}</div>
                )}
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Nombre</label>
                        <input
                            required
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Apellido</label>
                        <input
                            required
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={form.last_name}
                            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Email</label>
                        <input
                            required
                            type="email"
                            autoComplete="email"
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Teléfono</label>
                        <input
                            required
                            type="tel"
                            autoComplete="tel"
                            placeholder="5491112345678"
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Contraseña (mín. 12)</label>
                        <input
                            required
                            type="password"
                            autoComplete="new-password"
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Confirmar contraseña</label>
                        <input
                            required
                            type="password"
                            autoComplete="new-password"
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={form.confirm}
                            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-servy-600 py-3 text-sm font-semibold text-white hover:bg-servy-500 disabled:opacity-70"
                    >
                        {loading ? 'Registrando...' : 'Registrarme'}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-slate-600">
                    ¿Ya tenés cuenta?{' '}
                    <Link href="/login" className="font-semibold text-servy-600">
                        Iniciá sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
