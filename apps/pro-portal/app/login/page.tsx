'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        const error = searchParams?.get('error');
        if (error) {
            try {
                setApiError(decodeURIComponent(error));
            } catch {
                setApiError(error);
            }
        }
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/professional/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
                credentials: 'include',
            });
            let data: { success?: boolean; data?: { accessToken?: string }; error?: { message?: string } };
            try {
                data = await res.json();
            } catch {
                setApiError('La API no respondió JSON. ¿Está corriendo en ' + API_URL + '?');
                return;
            }
            if (!res.ok || !data.success || !data.data?.accessToken) {
                setApiError(data.error?.message || 'Email o contraseña incorrectos');
                return;
            }
            Cookies.set('token', data.data.accessToken, {
                expires: 7,
                path: '/',
                sameSite: 'lax',
            });
            router.push('/dashboard');
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
                        Más trabajo.
                        <br />
                        Cobro garantizado.
                        <br />
                        Sin complicaciones.
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <div className="text-2xl font-black text-servy-600 tracking-tighter mb-6">Servy.</div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido</h1>
                        <p className="text-slate-500">Ingresá a tu cuenta para administrar tus clientes.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="juan@email.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                                autoComplete="email"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-servy-400 transition"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Contraseña</label>
                            <input
                                name="password"
                                type="password"
                                placeholder="Tu contraseña"
                                value={form.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-servy-400 transition"
                            />
                        </div>

                        <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-sm text-servy-600 hover:underline">
                                ¿Olvidaste tu contraseña?
                            </Link>
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
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-sm mt-6">
                        ¿No tenés cuenta?{' '}
                        <Link href="/register" className="text-servy-600 font-semibold hover:underline">
                            Registrate
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <div className="text-2xl font-black text-servy-600 tracking-tighter">Servy.</div>
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
