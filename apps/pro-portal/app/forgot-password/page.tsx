'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/professional/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                setApiError('Hubo un error. Intentá de nuevo.');
                return;
            }
            setSent(true);
        } catch {
            setApiError('No se pudo conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Imagen lateral */}
            <div className="hidden lg:block flex-1 relative">
                <Image
                    src="/images/login-hero.png"
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

            {/* Formulario */}
            <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <div className="text-2xl font-black text-servy-600 tracking-tighter mb-6">Servy.</div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Recuperar contraseña</h1>
                        <p className="text-slate-500">Te enviamos un código a tu email para restablecer tu contraseña.</p>
                    </div>

                    {sent ? (
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Email enviado!</h2>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Te enviamos un código a <span className="font-semibold text-slate-700">{email}</span> para recuperar tu
                                    contraseña.
                                    <br />
                                    Revisá tu bandeja de entrada y también la carpeta de spam.
                                </p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 w-full text-left">
                                <p className="text-sm text-slate-600 font-medium mb-1">¿No recibiste el email?</p>
                                <button
                                    type="button"
                                    onClick={() => setSent(false)}
                                    className="text-servy-600 text-sm font-semibold hover:underline"
                                >
                                    Intentar con otro email
                                </button>
                            </div>
                            <Link href="/login" className="text-slate-400 text-sm hover:underline">
                                Volver al login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                                <input
                                    type="email"
                                    placeholder="juan@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-servy-400 transition"
                                />
                            </div>

                            {apiError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                                    {apiError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-servy-600 text-white py-3 rounded-full font-bold hover:bg-servy-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? 'Enviando...' : 'Enviar código'}
                            </button>

                            <Link href="/login" className="text-center text-slate-500 text-sm hover:underline">
                                Volver al login
                            </Link>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
