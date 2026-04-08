'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { API_URL } from '@/lib/api';

type WhatsappSessionRow = {
    phone: string;
    step: string;
    data_json: unknown;
    expires_at: string;
};

type ChatMessage = {
    role: 'user' | 'bot';
    body: string;
    at: string;
};

type ConversationDetail = {
    phone: string;
    session: WhatsappSessionRow | null;
    messages: ChatMessage[];
};

async function fetchConversation(phone: string): Promise<ConversationDetail> {
    const token = Cookies.get('token');
    const pathPhone = encodeURIComponent(phone);
    const res = await fetch(`${API_URL}/admin/conversations/${pathPhone}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Error al cargar la conversación');
    return data.data as ConversationDetail;
}

export default function ConversationDetailPage() {
    const params = useParams();
    const phoneParam = typeof params.phone === 'string' ? params.phone : params.phone?.[0] ?? '';
    const phone = phoneParam ? decodeURIComponent(phoneParam) : '';

    const qc = useQueryClient();
    const [draft, setDraft] = useState('');

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['adminConversation', phone],
        queryFn: () => fetchConversation(phone),
        enabled: Boolean(phone),
    });

    const send = useMutation({
        mutationFn: async (text: string) => {
            const token = Cookies.get('token');
            const pathPhone = encodeURIComponent(phone);
            const res = await fetch(`${API_URL}/admin/conversations/${pathPhone}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j?.error?.message || 'Error al enviar');
            return j;
        },
        onSuccess: () => {
            setDraft('');
            void qc.invalidateQueries({ queryKey: ['adminConversation', phone] });
        },
    });

    if (!phone) {
        return <div className="text-slate-500">Teléfono inválido.</div>;
    }

    if (isLoading) return <div className="text-slate-500">Cargando conversación...</div>;

    if (isError) {
        return (
            <div className="text-red-600">
                {error instanceof Error ? error.message : 'No se pudo cargar el chat.'}
                <div className="mt-4">
                    <Link href="/conversations" className="text-blue-600 font-medium hover:text-blue-800">
                        ← Volver a conversaciones
                    </Link>
                </div>
            </div>
        );
    }

    const session = data?.session;
    const messages = data?.messages ?? [];
    const displayPhone = data?.phone ?? phone;

    return (
        <div className="flex flex-col gap-6 animate-fade-in max-w-3xl mx-auto pb-24">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <Link href="/conversations" className="text-sm text-blue-600 font-medium hover:text-blue-800 mb-1 inline-block">
                        ← Conversaciones
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">Chat +{displayPhone}</h1>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Estado de sesión</h2>
                {session ? (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">{session.step}</span>
                        <span className="text-slate-600">
                            Expira: {format(new Date(session.expires_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                        </span>
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm">Sin fila en whatsapp_sessions (el historial en Redis puede existir igual).</p>
                )}
                {session?.data_json != null && (
                    <pre className="mt-2 text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-x-auto text-slate-700 max-h-32">
                        {JSON.stringify(session.data_json, null, 2)}
                    </pre>
                )}
            </div>

            <div className="bg-slate-100 rounded-xl border border-slate-200 min-h-[320px] max-h-[55vh] overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">Aún no hay mensajes registrados para este número.</p>
                ) : (
                    messages.map((m, i) => (
                        <div key={`${m.at}-${i}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={
                                    m.role === 'user'
                                        ? 'max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 text-white px-4 py-2 shadow-sm'
                                        : 'max-w-[85%] rounded-2xl rounded-bl-md bg-white text-slate-900 border border-slate-200 px-4 py-2 shadow-sm'
                                }
                            >
                                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                                <p
                                    className={
                                        m.role === 'user' ? 'text-[10px] text-blue-100 mt-1' : 'text-[10px] text-slate-400 mt-1'
                                    }
                                >
                                    {format(new Date(m.at), 'dd/MM HH:mm:ss', { locale: es })}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                <div className="max-w-3xl mx-auto flex gap-2">
                    <input
                        type="text"
                        className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Escribí un mensaje como el bot (Twilio)…"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (draft.trim() && !send.isPending) send.mutate(draft.trim());
                            }
                        }}
                    />
                    <button
                        type="button"
                        disabled={!draft.trim() || send.isPending}
                        onClick={() => draft.trim() && send.mutate(draft.trim())}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {send.isPending ? 'Enviando…' : 'Enviar'}
                    </button>
                </div>
                {send.isError && (
                    <p className="text-red-600 text-sm mt-2 max-w-3xl mx-auto">
                        {send.error instanceof Error ? send.error.message : 'Error al enviar'}
                    </p>
                )}
            </div>
        </div>
    );
}
