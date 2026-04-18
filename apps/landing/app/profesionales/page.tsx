'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function ProfesionalesPage() {
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const categories = formData.getAll('categories');

        if (categories.length === 0) {
            setError('Seleccioná al menos un servicio que ofrezcas');
            setLoading(false);
            return;
        }

        const data = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            zone: formData.get('zone'),
            categories,
        };

        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        try {
            const response = await fetch(`${apiBase}/leads/professional`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                setSuccess(true);
            } else {
                setError(result.error?.message || 'Hubo un error. Intentá de nuevo.');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 py-12 px-6 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <Link href="/tecnicos" className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 transition mb-8">
                    <ArrowLeft size={20} /> Volver
                </Link>
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Unite a Servy</h1>
                    <p className="text-slate-600 mb-8">
                        Completá el formulario y te enviamos un WhatsApp para activar tu cuenta.
                    </p>

                    {success ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center animate-fade-in">
                            <CheckCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">¡Listo!</h2>
                            <p className="text-slate-700 text-lg mb-4">
                                Te enviamos un WhatsApp con el link para activar tu cuenta.
                            </p>
                            <p className="text-slate-600 text-sm">
                                Revisá tu WhatsApp y seguí los pasos para completar tu registro.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-fade-in">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Nombre completo *
                                </label>
                                <input
                                    required
                                    name="name"
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Celular (WhatsApp) *
                                </label>
                                <input
                                    required
                                    name="phone"
                                    type="tel"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="1122334455"
                                />
                                <p className="text-sm text-slate-500 mt-2">
                                    Te vamos a enviar un WhatsApp a este número
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">
                                    Servicios que ofrecés *
                                </label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="categories"
                                            value="Plomería"
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Plomería</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="categories"
                                            value="Electricidad"
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Electricidad</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="categories"
                                            value="Cerrajería"
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Cerrajería</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="categories"
                                            value="Gas"
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Gas</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="categories"
                                            value="Aires acondicionados"
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Aires</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Zonas de cobertura *
                                </label>
                                <input
                                    required
                                    name="zone"
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="CABA, Olivos, Vicente López"
                                />
                                <p className="text-sm text-slate-500 mt-2">
                                    Separadas por comas
                                </p>
                            </div>

                            <button
                                disabled={loading}
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-4 transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Enviando...' : 'Registrarme en Servy'}
                            </button>

                            <p className="text-sm text-slate-500 text-center">
                                Al registrarte aceptás nuestros{' '}
                                <Link href="/terminos" className="text-blue-600 hover:underline">
                                    Términos y Condiciones
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
