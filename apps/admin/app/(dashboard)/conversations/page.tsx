'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

const fetchConversations = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching data');
    return data.data;
};

export default function ConversationsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['adminConversations'],
        queryFn: fetchConversations,
    });

    if (isLoading) return <div className="text-slate-500">Cargando conversaciones...</div>;

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Conversaciones WhatsApp</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="p-4 font-medium">Usuario / Teléfono</th>
                            <th className="p-4 font-medium">Estado del Bot</th>
                            <th className="p-4 font-medium">Expira en</th>
                            <th className="p-4 font-medium">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data || []).map((session: any) => (
                            <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                <td className="p-4 font-medium text-slate-900 tracking-tight">+{session.phone}</td>
                                <td className="p-4">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {session.step}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-600">
                                    {format(new Date(session.expires_at), "dd MMM 'a las' HH:mm", { locale: es })}
                                </td>
                                <td className="p-4">
                                    <Link href={`/conversations/${session.phone}`} className="text-blue-600 font-medium hover:text-blue-800 transition">
                                        Ver chat
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {data?.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">No hay interacciones activas</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
