'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { AlertCircle, TrendingUp, Calendar, Star } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

type ProfileCompletion = {
    complete: boolean;
    percent: number;
    done_steps: number;
    total_steps: number;
    missing_sample: string[];
    missing_count: number;
};

const fetchDashboard = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/professional/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching data');
    return data.data as {
        pending_quotes: number;
        upcoming_jobs: number;
        month_earnings: { net: number };
        rating: number;
        onboarding_completed?: boolean;
        profile_completion?: ProfileCompletion;
    };
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

    const onboardingDone = data?.onboarding_completed === true;
    const pc = data?.profile_completion;
    const profileIncomplete = onboardingDone && pc && !pc.complete;

    return (
        <div className="p-6 md:p-10 flex flex-col gap-6 w-full animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">Hola de nuevo 👋</h1>

            {onboardingDone && pc?.complete && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                    <div>
                        <p className="font-semibold text-emerald-900">Perfil completo</p>
                        <p className="text-emerald-800 text-sm">
                            Ya podés recibir solicitudes por WhatsApp y gestionar trabajos desde el portal. Si te llegó un
                            mensaje de confirmación, ¡todo listo para arrancar!
                        </p>
                    </div>
                    <Link
                        href="/profile"
                        className="shrink-0 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold text-center hover:bg-emerald-500"
                    >
                        Ver mi perfil
                    </Link>
                </div>
            )}

            {profileIncomplete && pc && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-4 mb-2">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-amber-900">Completá tu perfil para la aprobación</p>
                            <p className="text-amber-800 text-sm mt-1">
                                Hasta no tener el perfil al 100% no vas a recibir ofertas de trabajo por WhatsApp. Te
                                falta completar requisitos de datos, trabajo, facturación y documentación.
                            </p>
                        </div>
                        <Link
                            href="/profile"
                            className="shrink-0 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold text-center hover:bg-amber-600"
                        >
                            Ir al perfil
                        </Link>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-medium text-amber-900 mb-1">
                            <span>Progreso del perfil</span>
                            <span>
                                {pc.done_steps} / {pc.total_steps} ({pc.percent}%)
                            </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-amber-200/80 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                                style={{ width: `${pc.percent}%` }}
                            />
                        </div>
                    </div>
                    {pc.missing_sample.length > 0 && (
                        <div className="text-sm text-amber-900">
                            <span className="font-semibold">Ejemplos de lo que falta: </span>
                            <span className="text-amber-800">
                                {pc.missing_sample.join(' · ')}
                                {pc.missing_count > pc.missing_sample.length
                                    ? ` · y ${pc.missing_count - pc.missing_sample.length} más…`
                                    : ''}
                            </span>
                        </div>
                    )}
                </div>
            )}

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
