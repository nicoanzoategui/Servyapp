'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { ArrowLeft, User, Phone, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { API_URL } from '@/lib/api';

const fetchConversation = async (phone: string) => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/conversations/${phone}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching conversation');
    return data.data;
};

export default function ConversationDetailPage() {
    const params = useParams();
    const phone = params.phone as string;

    const { data, isLoading } = useQuery({
        queryKey: ['conversation', phone],
        queryFn: () => fetchConversation(phone),
    });

    if (isLoading) {
        return <div className="text-slate-500 animate-pulse">Cargando conversación...</div>;
    }

    const user = data?.user;
    const session = data?.session;
    const requests = data?.requests || [];

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <Link 
                    href="/conversations" 
                    className="text-slate-600 hover:text-slate-900 transition"
                >
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">Conversación</h1>
            </div>

            {/* Info del usuario */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-servy-100 rounded-full flex items-center justify-center">
                        <User className="text-servy-600" size={24} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900">
                            {user?.name || 'Usuario sin nombre'}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-600 mt-1">
                            <Phone size={16} />
                            <span>+{phone}</span>
                        </div>
                        {session && (
                            <div className="mt-3 flex items-center gap-3">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                    Estado: {session.state}
                                </span>
                                <span className="text-sm text-slate-500">
                                    Expira: {format(new Date(session.expires_at), "dd MMM 'a las' HH:mm", { locale: es })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Solicitudes de servicio */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="text-slate-600" size={20} />
                    <h3 className="text-lg font-bold text-slate-900">
                        Solicitudes de servicio ({requests.length})
                    </h3>
                </div>
                
                {requests.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        No hay solicitudes de servicio registradas
                    </p>
                ) : (
                    <div className="space-y-4">
                        {requests.map((req: any) => (
                            <div 
                                key={req.id} 
                                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-servy-600">
                                        {req.category}
                                    </span>
                                    <span className="text-sm text-slate-500">
                                        {format(new Date(req.created_at), "dd MMM HH:mm", { locale: es })}
                                    </span>
                                </div>
                                <p className="text-slate-700">
                                    {req.description || 'Sin descripción'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Placeholder para mensajes futuros */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <MessageSquare className="mx-auto text-slate-400 mb-3" size={48} />
                <p className="text-slate-600 font-medium mb-1">
                    Historial de mensajes no disponible
                </p>
                <p className="text-slate-500 text-sm">
                    Los mensajes de WhatsApp no se guardan actualmente en la base de datos
                </p>
            </div>
        </div>
    );
}
