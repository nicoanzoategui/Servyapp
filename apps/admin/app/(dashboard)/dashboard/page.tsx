'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { Activity, AlertTriangle, Users, DollarSign } from 'lucide-react';
import { API_URL } from '@/lib/api';

const fetchDashboard = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching data');
    return data.data;
};

export default function DashboardPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['adminDashboard'],
        queryFn: fetchDashboard,
        refetchInterval: 30000, // polling cada 30s
    });

    if (isLoading) return <div className="text-slate-500">Cargando métricas...</div>;
    if (isError) return <div className="text-red-500">Error cargando información. Revisa la consola o asegúrate que la API esté corriendo.</div>;

    return (
        <div className="flex flex-col gap-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-900">Panel Principal</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">Conversaciones Activas</h3>
                        <Activity className="text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{data?.active_conversations || 0}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 bg-red-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-700 font-medium">Alertas: Cotizaciones ({'>30m'})</h3>
                        <AlertTriangle className="text-red-500" />
                    </div>
                    <p className="text-3xl font-bold text-red-600">{data?.delayed_quotes || 0}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">Profesionales Activos</h3>
                        <Users className="text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{data?.active_professionals || 0}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">GMV (Diario)</h3>
                        <DollarSign className="text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">${data?.gmv?.day?.toLocaleString() || 0}</p>
                </div>
            </div>

            {/* Podrían expandirse gráficos aquí debajo */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 h-96 flex justify-center items-center">
                <span className="text-slate-400">Espacio para gráfico de transacciones futuras</span>
            </div>
        </div>
    );
}
