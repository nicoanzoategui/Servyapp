'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, CheckCircle2, Clock } from 'lucide-react';

const fetchEarnings = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/professional/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching data');
    return data.data;
};

const downloadReceipt = async (id: string) => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/professional/earnings/${id}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.data?.url) {
        window.open(data.data.url, '_blank');
    }
};

export default function EarningsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['proEarnings'],
        queryFn: fetchEarnings,
    });

    if (isLoading) return <div className="p-6 text-slate-500">Cargando ganancias...</div>;

    return (
        <div className="p-6 flex flex-col gap-6 w-full pb-20 md:pb-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">Historial de Ganancias</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                                <th className="p-4 font-medium rounded-tl-2xl">Fecha</th>
                                <th className="p-4 font-medium">Comisión Servy</th>
                                <th className="p-4 font-medium">Tu Neto ($)</th>
                                <th className="p-4 font-medium">Estado</th>
                                <th className="p-4 font-medium rounded-tr-2xl text-right">Comprobante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data || []).map((earning: any) => (
                                <tr key={earning.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                                    <td className="p-4 text-slate-600 font-medium">
                                        {format(new Date(earning.created_at), "dd MMM yyyy", { locale: es })}
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        <span className="text-xs mr-2">{earning.commission_pct}%</span>
                                        -${(earning.gross_amount - earning.net_amount).toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <span className="font-bold text-green-600">${earning.net_amount.toLocaleString()}</span>
                                    </td>
                                    <td className="p-4">
                                        {earning.transferred_at ? (
                                            <span className="flex items-center gap-1.5 text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full w-max">
                                                <CheckCircle2 size={14} /> Transferido
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-xs font-bold bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full w-max">
                                                <Clock size={14} /> Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => downloadReceipt(earning.id)} className="text-servy-600 hover:text-servy-800 bg-servy-50 hover:bg-servy-100 p-2 rounded-xl transition inline-flex items-center gap-2 text-sm font-medium">
                                            <Download size={16} /> PDF R2
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {data?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">No registras ganancias aún. ¡Aceptá trabajos y empezá a ganar!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
