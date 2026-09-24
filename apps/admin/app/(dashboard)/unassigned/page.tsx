'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { API_URL } from '@/lib/api';
import { ProblemPhotos } from '@/components/ProblemPhotos';

type UnassignedRequest = {
    id: string;
    category: string | null;
    description: string | null;
    address: string | null;
    priority: string | null;
    scheduled_slot: string | null;
    scheduled_date: string | null;
    visit_fee: number | null;
    photos: string[];
    waiting_since: string;
    waiting_ms: number;
    client: { name: string | null; last_name: string | null; phone: string };
};

type Professional = {
    id: string;
    name: string;
    last_name: string;
    status: string;
    categories: string[];
};

function authHeaders(): HeadersInit {
    return {
        Authorization: `Bearer ${Cookies.get('token') || ''}`,
        'Content-Type': 'application/json',
    };
}

async function fetchUnassigned(): Promise<UnassignedRequest[]> {
    const res = await fetch(`${API_URL}/admin/service-requests/unassigned`, { headers: authHeaders() });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error?.message || 'No se pudieron cargar los pedidos');
    return (payload.data || []) as UnassignedRequest[];
}

async function fetchProfessionals(): Promise<Professional[]> {
    const res = await fetch(`${API_URL}/admin/professionals?status=active`, { headers: authHeaders() });
    const payload = await res.json();
    if (!res.ok) throw new Error('No se pudieron cargar los técnicos');
    return (payload.data || []) as Professional[];
}

function clientName(r: UnassignedRequest): string {
    const full = `${r.client.name || ''} ${r.client.last_name || ''}`.trim();
    return full || r.client.phone;
}

function priorityLabel(p: string | null): string {
    if (p === 'urgent') return 'Urgente';
    if (p === 'scheduled') return 'Programado';
    return p || '—';
}

function matchesCategory(pro: Professional, category: string | null): boolean {
    if (!category) return true;
    const want = category.toLowerCase();
    return (pro.categories || []).some((c) => c.toLowerCase() === want || c.toLowerCase().includes(want));
}

export default function UnassignedRequestsPage() {
    const qc = useQueryClient();
    const { data: requests, isLoading, isError, error } = useQuery({
        queryKey: ['adminUnassignedRequests'],
        queryFn: fetchUnassigned,
        refetchInterval: 10_000,
    });
    const { data: professionals } = useQuery({
        queryKey: ['adminProfessionals', 'active'],
        queryFn: fetchProfessionals,
    });

    const [selected, setSelected] = useState<Record<string, string>>({});
    const [rowError, setRowError] = useState<Record<string, string>>({});

    const assignMut = useMutation({
        mutationFn: async ({ requestId, professionalId }: { requestId: string; professionalId: string }) => {
            const res = await fetch(`${API_URL}/admin/service-requests/${requestId}/assign-technician`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ professionalId }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo asignar');
            return payload.data;
        },
        onSuccess: (_data, vars) => {
            setRowError((prev) => {
                const next = { ...prev };
                delete next[vars.requestId];
                return next;
            });
            qc.invalidateQueries({ queryKey: ['adminUnassignedRequests'] });
        },
        onError: (e: Error, vars) => {
            setRowError((prev) => ({ ...prev, [vars.requestId]: e.message }));
        },
    });

    const activePros = useMemo(
        () => (professionals || []).filter((p) => p.status === 'active'),
        [professionals]
    );

    if (isLoading) return <p className="text-slate-500">Cargando pedidos sin técnico...</p>;
    if (isError) return <p className="text-red-600">{(error as Error)?.message || 'Error al cargar.'}</p>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Pedidos sin técnico</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Visitas pagadas que esperan asignación manual. Se actualiza cada 10 segundos.
                </p>
            </div>

            {(requests || []).length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    No hay pedidos pendientes de asignación.
                </div>
            ) : (
                <div className="space-y-4">
                    {(requests || []).map((r) => {
                        const candidates = activePros.filter((p) => matchesCategory(p, r.category));
                        const professionalId = selected[r.id] || '';
                        return (
                            <article key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{clientName(r)}</p>
                                        <p className="text-sm text-slate-600">{r.client.phone}</p>
                                    </div>
                                    <div className="text-right text-sm">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded-full font-medium ${
                                                r.priority === 'urgent'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            {priorityLabel(r.priority)}
                                        </span>
                                        <p className="text-slate-500 mt-1">
                                            Esperando{' '}
                                            {formatDistanceToNow(new Date(r.waiting_since), {
                                                locale: es,
                                                addSuffix: false,
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <dt className="text-slate-500">Categoría</dt>
                                        <dd className="text-slate-900">{r.category || '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-500">Horario</dt>
                                        <dd className="text-slate-900">{r.scheduled_slot || 'A coordinar'}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-slate-500">Dirección</dt>
                                        <dd className="text-slate-900">{r.address || '—'}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-slate-500">Problema</dt>
                                        <dd className="text-slate-900 whitespace-pre-wrap">{r.description || '—'}</dd>
                                    </div>
                                </dl>

                                <ProblemPhotos photos={r.photos} />

                                <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-2">
                                    <select
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                        value={professionalId}
                                        onChange={(e) => setSelected((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                    >
                                        <option value="">Elegir técnico activo…</option>
                                        {candidates.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.last_name} — {(p.categories || []).join(', ') || 'sin categoría'}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        disabled={!professionalId || assignMut.isPending}
                                        onClick={() =>
                                            assignMut.mutate({ requestId: r.id, professionalId })
                                        }
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                        Asignar técnico
                                    </button>
                                </div>
                                {candidates.length === 0 && (
                                    <p className="text-amber-700 text-sm">No hay técnicos activos en esta categoría.</p>
                                )}
                                {rowError[r.id] && <p className="text-red-600 text-sm">{rowError[r.id]}</p>}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
