'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { API_URL } from '@/lib/api';
import { ProblemPhotos } from '@/components/ProblemPhotos';
import { moneyArs, visitFeeNightNote } from '@/lib/visit-fee';

type OrderBucket = 'nueva' | 'pendiente' | 'completada' | 'cancelada';

type Order = {
    id: string;
    bucket: OrderBucket;
    category: string | null;
    description: string | null;
    address: string | null;
    priority: string | null;
    scheduled_slot: string | null;
    visit_fee: number | null;
    photos: string[];
    waiting_since: string;
    created_at: string;
    client: { name: string | null; last_name: string | null; phone: string };
    technician: string | null;
    job_id: string | null;
    job_status: string | null;
    completed_at: string | null;
};

type Counts = {
    todas: number;
    nueva: number;
    pendiente: number;
    completada: number;
    cancelada: number;
};

type Professional = {
    id: string;
    name: string;
    last_name: string;
    status: string;
    categories: string[];
};

const FILTERS: { id: 'todas' | OrderBucket; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'nueva', label: 'Nuevas' },
    { id: 'pendiente', label: 'Pendientes' },
    { id: 'completada', label: 'Completadas' },
    { id: 'cancelada', label: 'Canceladas' },
];

const BUCKET_LABEL: Record<OrderBucket, string> = {
    nueva: 'Nueva',
    pendiente: 'Pendiente',
    completada: 'Completada',
    cancelada: 'Cancelada',
};

function authHeaders(): HeadersInit {
    return {
        Authorization: `Bearer ${Cookies.get('token') || ''}`,
        'Content-Type': 'application/json',
    };
}

async function fetchOrders(status: string): Promise<{ data: Order[]; counts: Counts }> {
    const res = await fetch(`${API_URL}/admin/orders?status=${encodeURIComponent(status)}`, {
        headers: authHeaders(),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error?.message || 'No se pudieron cargar las órdenes');
    return {
        data: (payload.data || []) as Order[],
        counts: payload.counts as Counts,
    };
}

async function fetchProfessionals(): Promise<Professional[]> {
    const res = await fetch(`${API_URL}/admin/professionals?status=active`, { headers: authHeaders() });
    const payload = await res.json();
    if (!res.ok) throw new Error('No se pudieron cargar los técnicos');
    return (payload.data || []) as Professional[];
}

function clientName(r: Order): string {
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

export default function OrdersPage() {
    const qc = useQueryClient();
    const searchParams = useSearchParams();
    const initialStatus = searchParams.get('status');
    const [filter, setFilter] = useState<'todas' | OrderBucket>(
        initialStatus === 'nueva' || initialStatus === 'pendiente' || initialStatus === 'completada' || initialStatus === 'cancelada'
            ? initialStatus
            : 'todas',
    );
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['adminOrders', filter],
        queryFn: () => fetchOrders(filter),
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
            qc.invalidateQueries({ queryKey: ['adminOrders'] });
            qc.invalidateQueries({ queryKey: ['adminDashboard'] });
        },
        onError: (e: Error, vars) => {
            setRowError((prev) => ({ ...prev, [vars.requestId]: e.message }));
        },
    });

    const activePros = useMemo(
        () => (professionals || []).filter((p) => p.status === 'active'),
        [professionals]
    );

    const requests = data?.data || [];
    const counts = data?.counts;

    if (isLoading) return <p className="text-slate-500">Cargando órdenes...</p>;
    if (isError) return <p className="text-red-600">{(error as Error)?.message || 'Error al cargar.'}</p>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Órdenes</h1>
                <p className="text-sm text-slate-500 mt-1">Nuevas, pendientes, completadas y canceladas. Se actualiza cada 10 segundos.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => {
                    const n = counts?.[f.id];
                    const active = filter === f.id;
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                                active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {f.label}
                            {typeof n === 'number' ? ` (${n})` : ''}
                        </button>
                    );
                })}
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    No hay órdenes en este filtro.
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((r) => {
                        const candidates = activePros.filter((p) => matchesCategory(p, r.category));
                        const professionalId = selected[r.id] || '';
                        const nightNote = visitFeeNightNote(r.visit_fee, r.priority, r.scheduled_slot);
                        const canAssign = r.bucket === 'nueva';
                        return (
                            <article key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{clientName(r)}</p>
                                        <p className="text-sm text-slate-600">{r.client.phone}</p>
                                        {r.technician && (
                                            <p className="text-sm text-slate-700 mt-1">Técnico: {r.technician}</p>
                                        )}
                                    </div>
                                    <div className="text-right text-sm">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded-full font-medium mr-1 ${
                                                r.bucket === 'completada'
                                                    ? 'bg-green-100 text-green-800'
                                                    : r.bucket === 'cancelada'
                                                      ? 'bg-slate-200 text-slate-700'
                                                      : r.bucket === 'nueva'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-blue-100 text-blue-800'
                                            }`}
                                        >
                                            {BUCKET_LABEL[r.bucket]}
                                        </span>
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded-full font-medium ${
                                                r.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            {priorityLabel(r.priority)}
                                        </span>
                                        <p className="text-slate-500 mt-1">
                                            {r.bucket === 'completada' && r.completed_at
                                                ? format(new Date(r.completed_at), "dd MMM yyyy, HH:mm", { locale: es })
                                                : r.bucket === 'nueva'
                                                  ? `Esperando ${formatDistanceToNow(new Date(r.waiting_since), { locale: es, addSuffix: false })}`
                                                  : format(new Date(r.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
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
                                    <div>
                                        <dt className="text-slate-500">Visita</dt>
                                        <dd className="text-slate-900">
                                            {r.visit_fee != null ? moneyArs(r.visit_fee) : '—'}
                                            {nightNote ? <span className="text-xs text-slate-500"> ({nightNote})</span> : null}
                                        </dd>
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

                                {r.job_id && (
                                    <Link href={`/jobs/${r.job_id}`} className="text-sm text-blue-600 font-medium">
                                        Ver trabajo →
                                    </Link>
                                )}

                                {canAssign && (
                                    <>
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
                                                onClick={() => assignMut.mutate({ requestId: r.id, professionalId })}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                                            >
                                                Asignar técnico
                                            </button>
                                        </div>
                                        {candidates.length === 0 && (
                                            <p className="text-amber-700 text-sm">No hay técnicos activos en esta categoría.</p>
                                        )}
                                        {rowError[r.id] && <p className="text-red-600 text-sm">{rowError[r.id]}</p>}
                                    </>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
