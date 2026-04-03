'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';

const fetchSummary = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/finance/summary`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error');
    return data.data;
};

const fetchPending = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/finance/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error');
    return data.data as any[];
};

export default function AdminFinancePage() {
    const { data: summary, isLoading: s1 } = useQuery({ queryKey: ['adminFinanceSummary'], queryFn: fetchSummary });
    const { data: pending, isLoading: s2 } = useQuery({ queryKey: ['adminFinancePending'], queryFn: fetchPending });

    if (s1 || s2) return <p className="text-slate-500">Cargando...</p>;

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-slate-900">Finanzas</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <p className="text-slate-500 text-sm">Bruto acumulado</p>
                    <p className="text-2xl font-bold">${summary?.total_gross?.toLocaleString?.() ?? 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <p className="text-slate-500 text-sm">Neto profesionales</p>
                    <p className="text-2xl font-bold">${summary?.total_net_professionals?.toLocaleString?.() ?? 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <p className="text-slate-500 text-sm">Comisiones retenidas</p>
                    <p className="text-2xl font-bold">${summary?.total_commissions_retained?.toLocaleString?.() ?? 0}</p>
                </div>
            </div>
            <div>
                <h2 className="text-lg font-semibold mb-3">Acreditaciones pendientes</h2>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {(pending || []).length === 0 && <p className="p-4 text-slate-500">Nada pendiente.</p>}
                    {(pending || []).map((e: any) => (
                        <div key={e.id} className="p-4 flex justify-between items-center text-sm">
                            <span className="font-mono">{e.id.slice(0, 10)}…</span>
                            <span>${e.net_amount}</span>
                            <span className="text-slate-500">{e.professional?.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
