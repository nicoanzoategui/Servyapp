'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ProfesionalesPage() {
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            zone: formData.get('zone'),
            categories: formData.getAll('categories'),
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

            if (response.ok) {
                setSuccess(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 py-12 px-6 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <Link href="/" className="inline-flex items-center gap-2 text-servy-600 font-medium hover:text-servy-700 transition mb-8">
                    <ArrowLeft size={20} /> Volver al Inicio
                </Link>
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Unite a Servy Profesionales</h1>
                    <p className="text-slate-600 mb-8">Completá el formulario para recibir más información y empezar a conectarte con clientes por WhatsApp.</p>

                    {success ? (
                        <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-8 text-center animate-fade-in">
                            <h2 className="text-2xl font-bold mb-2">¡Gracias por tu interés!</h2>
                            <p>Te contactaremos pronto para continuar con el alta y validación de tu perfil.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-fade-in">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre y Apellido</label>
                                <input required name="name" type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-servy-500 outline-none transition" placeholder="Juan Pérez" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                    <input required name="email" type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-servy-500 outline-none transition" placeholder="juan@ejemplo.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Celular</label>
                                    <input required name="phone" type="tel" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-servy-500 outline-none transition" placeholder="1122334455" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Servicios que ofreces</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="categories" value="Plomería" className="w-5 h-5 text-servy-600 rounded focus:ring-servy-500" />
                                        <span>Plomería</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="categories" value="Electricidad" className="w-5 h-5 text-servy-600 rounded focus:ring-servy-500" />
                                        <span>Electricidad</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="categories" value="Cerrajería" className="w-5 h-5 text-servy-600 rounded focus:ring-servy-500" />
                                        <span>Cerrajería</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Zonas de cobertura (Ej. Capital, GBA Norte)</label>
                                <input required name="zone" type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-servy-500 outline-none transition" placeholder="CABA, Olivos" />
                            </div>

                            <button disabled={loading} type="submit" className="w-full bg-servy-600 hover:bg-servy-500 text-white font-bold py-4 rounded-xl mt-4 transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
                                {loading ? 'Enviando...' : 'Quiero sumarme a Servy'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
