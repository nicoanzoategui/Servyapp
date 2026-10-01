'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { Activity, AlertTriangle, Users, DollarSign, ClipboardList, MapPin, Banknote, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

type LiveArrival = {
    job_id: string;
    address: string | null;
    client: { name: string | null; last_name: string | null; phone: string } | null;
    technician: string | null;
    status: string;
};

type LiveRefund = {
    payment_id: string;
    amount: number;
    address: string | null;
    user_phone: string;
};

const fetchDashboard = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    let payload: { success?: boolean; data?: unknown; error?: { message?: string } };
    try {
        payload = await res.json();
    } catch {
        throw new Error('La API no respondió JSON');
    }
    if (!res.ok) throw new Error(payload.error?.message || 'Error al cargar el panel');
    return payload.data as {
        active_conversations?: number;
        delayed_quotes?: number;
        active_professionals?: number;
        total_users?: number;
        gmv?: { day?: number };
        live?: {
            unassigned_count?: number;
            completed_today?: number;
            completed_week?: number;
            awaiting_arrival?: LiveArrival[];
            refund_pending?: LiveRefund[];
        };
    };
};

function clientLabel(c: LiveArrival['client']): string {
    if (!c) return 'Cliente';
    const n = `${c.name || ''} ${c.last_name || ''}`.trim();
    return n || c.phone;
}

export default function DashboardPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['adminDashboard'],
        queryFn: fetchDashboard,
        refetchInterval: 15000,
    });

    if (isLoading) return <div className="text-slate-500">Cargando métricas...</div>;
    if (isError) return <div className="text-red-500">Error cargando información. Revisá que la API esté corriendo.</div>;

    const unassigned = data?.live?.unassigned_count || 0;
    const completedToday = data?.live?.completed_today || 0;
    const completedWeek = data?.live?.completed_week || 0;
    const arrivals = data?.live?.awaiting_arrival || [];
    const refunds = data?.live?.refund_pending || [];
    const todoCount = unassigned + arrivals.length + refunds.length;

    return (
        <div className="flex flex-col gap-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Órdenes al vivo</h2>
                        <p className="text-sm text-slate-500">Lo que hay que hacer ahora. Se actualiza cada 15 segundos.</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${todoCount ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                        {todoCount === 0 ? 'Nada pendiente' : `${todoCount} pendiente${todoCount === 1 ? '' : 's'}`}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Link href="/unassigned" className="border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-slate-600 font-medium">Sin técnico</p>
                            <ClipboardList className="text-amber-600" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{unassigned}</p>
                        <p className="text-sm text-blue-600 mt-2 font-medium">Ir a Órdenes →</p>
                    </Link>
                    <div className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-slate-600 font-medium">Esperando llegada</p>
                            <MapPin className="text-blue-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{arrivals.length}</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-slate-600 font-medium">Reembolso pendiente</p>
                            <Banknote className="text-red-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{refunds.length}</p>
                    </div>
                    <Link href="/unassigned?status=completada" className="border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-slate-600 font-medium">Completadas hoy</p>
                            <CheckCircle2 className="text-green-600" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{completedToday}</p>
                        <p className="text-xs text-slate-500 mt-2">{completedWeek} esta semana · ver en Órdenes</p>
                    </Link>
                </div>

                {arrivals.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Visitas sin check-in</h3>
                        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                            {arrivals.map((row) => (
                                <li key={row.job_id}>
                                    <Link href={`/jobs/${row.job_id}`} className="flex justify-between gap-3 p-3 hover:bg-slate-50">
                                        <span className="text-slate-800">
                                            {clientLabel(row.client)}
                                            {row.technician ? ` · ${row.technician}` : ''}
                                        </span>
                                        <span className="text-slate-500 text-sm truncate max-w-[40%]">{row.address || 'Sin dirección'}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {refunds.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Devoluciones a procesar</h3>
                        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                            {refunds.map((row) => (
                                <li key={row.payment_id} className="flex justify-between gap-3 p-3 text-sm">
                                    <span>+{row.user_phone} · {row.address || '—'}</span>
                                    <span className="font-semibold">${row.amount?.toLocaleString('es-AR')}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">Conversaciones activas</h3>
                        <Activity className="text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{data?.active_conversations || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">Profesionales activos</h3>
                        <Users className="text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{data?.active_professionals || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">Usuarios</h3>
                        <Users className="text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{data?.total_users || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">GMV (hoy)</h3>
                        <DollarSign className="text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">${data?.gmv?.day?.toLocaleString() || 0}</p>
                </div>
            </div>

            {(data?.delayed_quotes || 0) > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="text-red-500" />
                    <p className="text-red-800 font-medium">{data?.delayed_quotes} ofertas de técnico sin respuesta (&gt;30 min)</p>
                </div>
            )}
        </div>
    );
}
