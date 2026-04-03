'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { AlertCircle, TrendingUp, Calendar, Star } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

const fetchDashboard = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/professional/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching data');
    return data.data;
};

export default function ProDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['proDashboard'],
        queryFn: fetchDashboard,
    });

    if (isLoading) return <div className="p-6 text-slate-500 animate-pulse">Cargando tu panel...</div>;

    const pendingQuotes = data?.pending_quotes ?? 0;
    const upcomingJobs = data?.upcoming_jobs ?? 0;
    const monthNet = data?.month_earnings?.net ?? 0;
    const rating = data?.rating ?? 0;

    return (
        <div className="p-6 md:p-10 flex flex-col gap-6 w-full animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">Hola de nuevo 👋</h1>

            {pendingQuotes > 0 && (
                <Link
                    href="/jobs"
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center gap-4 hover:bg-red-100 transition cursor-pointer"
                >
                    <AlertCircle className="text-red-500 shrink-0" size={24} />
                    <div>
                        <h3 className="font-bold text-red-800">Tenés {pendingQuotes} solicitud(es) sin cotizar</h3>
                        <p className="text-red-600 text-sm">Ingresá para enviar tu presupuesto.</p>
                    </div>
                </Link>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 relative z-10 text-slate-600 font-medium">
                        <TrendingUp size={20} className="text-green-500" />
                        Ganancias netas del mes
                    </div>
                    <p className="text-4xl font-extrabold text-slate-900 relative z-10">${Number(monthNet).toLocaleString()}</p>
                    <Link href="/earnings" className="mt-4 text-servy-600 font-medium relative z-10">
                        Ver desglose →
                    </Link>
                </div>

                <div className="bg-servy-600 text-white p-6 rounded-2xl shadow-lg flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-white/20">
                        <Calendar size={64} />
                    </div>
                    <div className="relative z-10 font-medium text-white/80">Trabajos confirmados activos</div>
                    <p className="text-4xl font-extrabold relative z-10 my-1">{upcomingJobs}</p>
                    <Link href="/jobs" className="mt-auto text-white underline font-medium relative z-10">
                        Ir a trabajos
                    </Link>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Star size={20} className="text-amber-500" />
                        Tu calificación
                    </div>
                    <p className="text-4xl font-extrabold text-slate-900">{rating ? `${rating.toFixed(1)} ★` : '—'}</p>
                </div>
            </div>
        </div>
    );
}
