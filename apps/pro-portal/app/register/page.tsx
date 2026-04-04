'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function validatePassword(password: string) {
    const errors = [];
    if (password.length < 12) errors.push('Mínimo 12 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula');
    if (!/[0-9]/.test(password)) errors.push('Al menos un número');
    return errors;
}

export default function RegisterPage() {
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
    });
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (e.target.name === 'password') {
            setErrors(validatePassword(e.target.value));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        const pwErrors = validatePassword(form.password);
        if (pwErrors.length > 0) {
            setErrors(pwErrors);
            return;
        }
        const parts = form.full_name.trim().split(' ');
        const name = parts[0];
        const last_name = parts.slice(1).join(' ') || '-';

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/professional/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, last_name, email: form.email, phone: form.phone, password: form.password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setApiError(data.error?.message || 'Error al registrarse');
                return;
            }
            setSuccess(true);
        } catch {
            setApiError('No se pudo conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex">
                {/* Formulario — izquierda */}
                <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
                    <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-servy-600 tracking-tighter mb-6">Servy.</div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">¡Bienvenido a Servy!</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Tu cuenta fue creada exitosamente.<br />
                                Ya podés ingresar y empezar a recibir trabajos.
                            </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 w-full text-left">
                            <p className="text-sm text-slate-500 mb-1">¿Qué sigue?</p>
                            <p className="text-sm text-slate-700 font-medium">
                                Completá tu perfil para aparecer en los resultados y recibir tus primeros trabajos.
                            </p>
                        </div>
                        <Link
                            href="/login"
                            className="bg-servy-600 text-white px-8 py-3 rounded-full font-bold hover:bg-servy-500 transition-all w-full text-center"
                        >
                            Iniciar sesión
                        </Link>
                    </div>
                </div>

                {/* Imagen — derecha */}
                <div className="hidden lg:block flex-1 relative">
                    <Image
                        src="/images/register-bg.png"
                        alt="Profesional Servy"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-servy-900/30" />
                    <div className="absolute bottom-12 left-12 right-12">
                        <p className="text-white text-3xl font-bold leading-snug">
                            Más trabajo.<br />Cobro garantizado.<br />Sin complicaciones.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Formulario — izquierda */}
            <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <div className="text-2xl font-black text-servy-600 tracking-tighter mb-6">Servy.</div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Crear cuenta</h1>
                        <p className="text-slate-500">Empezá a recibir trabajos hoy.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Nombre y apellido</label>
                            <input
                                name="full_name"
                                type="text"
                                placeholder="Juan Pérez"
                                value={form.full_name}
                                onChange={handleChange}
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-servy-400 transition"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="juan@email.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-servy-400 transition"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Teléfono</label>
                            <input
                                name="phone"
                                type="tel"
                                placeholder="11 1234 5678"
                                value={form.phone}
                                onChange={handleChange}
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-servy-400 transition"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Contraseña</label>
                            <input
                                name="password"
                                type="password"
                                placeholder="Mínimo 12 caracteres"
                                value={form.password}
                                onChange={handleChange}
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-servy-400 transition"
                            />
                            {form.password.length > 0 && (
                                <div className="mt-2 flex flex-col gap-1">
                                    {[
                                        { label: 'Mínimo 12 caracteres', ok: form.password.length >= 12 },
                                        { label: 'Una mayúscula', ok: /[A-Z]/.test(form.password) },
                                        { label: 'Una minúscula', ok: /[a-z]/.test(form.password) },
                                        { label: 'Un número', ok: /[0-9]/.test(form.password) },
                                    ].map((r) => (
                                        <div key={r.label} className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${r.ok ? 'bg-green-100' : 'bg-slate-100'}`}>
                                                {r.ok && <svg className="w-2.5 h-2.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                                            </div>
                                            <span className={`text-xs ${r.ok ? 'text-green-600' : 'text-slate-400'}`}>{r.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {apiError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                                {apiError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || errors.length > 0}
                            className="bg-servy-600 text-white py-3 rounded-full font-bold hover:bg-servy-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-sm mt-6">
                        ¿Ya tenés cuenta?{' '}
                        <Link href="/login" className="text-servy-600 font-semibold hover:underline">
                            Iniciá sesión
                        </Link>
                    </p>
                </div>
            </div>

            {/* Imagen — derecha */}
            <div className="hidden lg:block flex-1 relative">
                <Image
                    src="/images/register-bg.png"
                    alt="Profesional Servy"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-servy-900/30" />
                <div className="absolute bottom-12 left-12 right-12">
                    <p className="text-white text-3xl font-bold leading-snug">
                        Más trabajo.<br />Cobro garantizado.<br />Sin complicaciones.
                    </p>
                </div>
            </div>
        </div>
    );
}
