'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { ArrowLeft, User, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';

const SESSION_STATE_LABELS: Record<string, string> = {
    IDLE: 'Inactivo',
    AWAITING_SPEED_SELECTION: 'Eligiendo modalidad',
    AWAITING_SCHEDULE: 'Eligiendo horario',
    AWAITING_SCHEDULE_DAY: 'Eligiendo día',
    AWAITING_SCHEDULE_TIME: 'Eligiendo franja',
    AWAITING_TECH_CONFIRMATION: 'Esperando técnico',
    VISIT_PAYMENT_PENDING: 'Pago visita pendiente',
    PAYMENT_PENDING: 'Pago en proceso',
    COMPLETED: 'Completado',
    AWAITING_REVIEW: 'Calificando',
};

type Msg = {
    id: string;
    direction: string;
    type: string;
    body: string;
    created_at: string;
};

const fetchConversation = async (phone: string) => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/conversations/${phone}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching conversation');
    return data.data as {
        user?: { name?: string; phone?: string };
        session?: { state?: string; expires_at?: string };
        requests?: { id: string; category: string; description: string | null; created_at: string }[];
        messages?: Msg[];
    };
};

export default function ConversationDetailPage() {
    const params = useParams();
    const phone = params.phone as string;
    const qc = useQueryClient();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [draft, setDraft] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['conversation', phone],
        queryFn: () => fetchConversation(phone),
        refetchInterval: 5000,
    });

    const messages = data?.messages || [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const sendMut = useMutation({
        mutationFn: async (text: string) => {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/admin/conversations/${phone}/send`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo enviar');
        },
        onSuccess: () => {
            setDraft('');
            qc.invalidateQueries({ queryKey: ['conversation', phone] });
        },
    });

    if (isLoading) {
        return <div className="text-slate-500 animate-pulse">Cargando conversación...</div>;
    }

    const user = data?.user;
    const session = data?.session;
    const requests = data?.requests || [];

    return (
        <div className="flex flex-col gap-6 animate-fade-in max-w-4xl">
            <div className="flex items-center gap-4">
                <Link href="/conversations" className="text-slate-600 hover:text-slate-900 transition">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">Conversación</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-servy-100 rounded-full flex items-center justify-center">
                        <User className="text-servy-600" size={24} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900">{user?.name || 'Usuario sin nombre'}</h2>
                        <div className="flex items-center gap-2 text-slate-600 mt-1">
                            <Phone size={16} />
                            <span>+{phone}</span>
                        </div>
                        {session?.state && (
                            <div className="mt-3">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                    Estado: {SESSION_STATE_LABELS[(session.state || '').toUpperCase()] || session.state}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-[#ECE5DD] rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-[420px] max-h-[70vh]">
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {messages.length === 0 ? (
                        <p className="text-center text-slate-500 py-12 text-sm">
                            Todavía no hay mensajes guardados para este número. A partir de ahora se persiste el hilo completo.
                        </p>
                    ) : (
                        messages.map((m) => {
                            const inbound = m.direction === 'inbound';
                            return (
                                <div key={m.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                                            inbound ? 'bg-white text-slate-800 rounded-bl-md' : 'bg-[#DCF8C6] text-slate-800 rounded-br-md'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                                        <p className="text-[11px] text-slate-500 mt-1 text-right">
                                            {format(new Date(m.created_at), 'HH:mm', { locale: es })}
                                            {m.type !== 'text' ? ` · ${m.type}` : ''}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>
                <form
                    className="bg-white border-t border-slate-200 p-3 flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const text = draft.trim();
                        if (text) sendMut.mutate(text);
                    }}
                >
                    <input
                        className="flex-1 border rounded-full px-4 py-2 text-sm"
                        placeholder="Escribir como Servy…"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={sendMut.isPending || !draft.trim()}
                        className="bg-[#075E54] text-white px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                    >
                        Enviar
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Pedidos ({requests.length})</h3>
                {requests.length === 0 ? (
                    <p className="text-slate-500 text-center py-6">No hay solicitudes de servicio</p>
                ) : (
                    <div className="space-y-3">
                        {requests.map((req) => (
                            <div key={req.id} className="border border-slate-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-servy-600">{req.category}</span>
                                    <span className="text-sm text-slate-500">
                                        {format(new Date(req.created_at), 'dd MMM HH:mm', { locale: es })}
                                    </span>
                                </div>
                                <p className="text-slate-700">{req.description || 'Sin descripción'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
