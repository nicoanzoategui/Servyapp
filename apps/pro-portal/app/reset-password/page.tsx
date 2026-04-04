'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function validatePassword(password: string) {
    const rules = [
        { label: 'Mínimo 12 caracteres', ok: password.length >= 12 },
        { label: 'Una mayúscula', ok: /[A-Z]/.test(password) },
        { label: 'Una minúscula', ok: /[a-z]/.test(password) },
        { label: 'Un número', ok: /[0-9]/.test(password) },
    ];
    return rules;
}

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState('');

    const rules = validatePassword(password);
    const isValid = rules.every((r) => r.ok);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setApiError('Link inválido: falta el token. ');
            return;
        }
        if (!isValid) return;
        setApiError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/professional/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            let data: { error?: { message?: string } };
            try {
                data = await res.json();
            } catch {
                setApiError('La API no respondió correctamente.');
                return;
            }
            if (!res.ok) {
                setApiError(data.error?.message || 'El link expiró o es inválido. Solicitá uno nuevo.');
                return;
            }
            setSuccess(true);
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
                    {success ? (
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Contraseña actualizada!</h2>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Tu contraseña fue cambiada con éxito. Ya podés ingresar con tu nueva contraseña.
                                </p>
                            </div>
                            <Link
                                href="/login"
                                className="bg-servy-600 text-white px-8 py-3 rounded-full font-bold hover:bg-servy-500 transition-all w-full text-center"
                            >
                                Ir al login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <div className="text-2xl font-black text-servy-600 tracking-tighter mb-6">Servy.</div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-2">Nueva contraseña</h1>
                                <p className="text-slate-500">Elegí una contraseña segura para tu cuenta.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nueva contraseña</label>
                                    <input
                                        type="password"
                                        placeholder="Tu nueva contraseña"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-servy-400 transition"
                                    />
                                    {password.length > 0 && (
                                        <div className="mt-2 flex flex-col gap-1">
                                            {rules.map((r) => (
                                                <div key={r.label} className="flex items-center gap-2">
                                                    <div
                                                        className={`w-4 h-4 rounded-full flex items-center justify-center ${r.ok ? 'bg-green-100' : 'bg-slate-100'}`}
                                                    >
                                                        {r.ok && (
                                                            <svg
                                                                className="w-2.5 h-2.5 text-green-500"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={3}
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs ${r.ok ? 'text-green-600' : 'text-slate-400'}`}>{r.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {!token && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
                                        Este enlace no tiene token válido.{' '}
                                        <Link href="/forgot-password" className="font-semibold underline">
                                            Pedí un link nuevo
                                        </Link>
                                    </div>
                                )}

                                {apiError && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                                        {apiError}{' '}
                                        <Link href="/forgot-password" className="font-semibold underline">
                                            Solicitá uno nuevo
                                        </Link>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !isValid || !token}
                                    className="bg-servy-600 text-white py-3 rounded-full font-bold hover:bg-servy-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {loading ? 'Guardando...' : 'Guardar contraseña'}
                                </button>

                                <Link href="/login" className="text-center text-slate-400 text-sm hover:underline">
                                    Volver al login
                                </Link>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white text-slate-500 animate-pulse">
                    Cargando...
                </div>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}
