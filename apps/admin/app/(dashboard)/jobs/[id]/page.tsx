'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { ProblemPhotos } from '@/components/ProblemPhotos';

type JobDetail = {
    id: string;
    status: string;
    scheduled_at?: string | null;
    quotation?: {
        job_offer?: {
            professional?: { name?: string; last_name?: string; phone?: string } | null;
            service_request?: {
                category?: string | null;
                address?: string | null;
                description?: string | null;
                photos?: string[];
                scheduled_slot?: string | null;
                priority?: string | null;
                user_phone?: string;
                user?: { name?: string | null; last_name?: string | null; phone?: string } | null;
            };
        };
    };
};

function authHeaders(): HeadersInit {
    return { Authorization: `Bearer ${Cookies.get('token') || ''}` };
}

export default function AdminJobDetailPage() {
    const params = useParams();
    const id = String(params.id || '');

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['adminJob', id],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/admin/jobs/${id}`, { headers: authHeaders() });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo cargar el trabajo');
            if (!payload.data) throw new Error('Trabajo no encontrado');
            return payload.data as JobDetail;
        },
        enabled: Boolean(id),
    });

    if (isLoading) return <p className="text-slate-500">Cargando trabajo...</p>;
    if (isError || !data) {
        return (
            <div className="space-y-3">
                <p className="text-red-600">{(error as Error)?.message || 'No se pudo cargar el trabajo.'}</p>
                <Link href="/jobs" className="text-blue-600 font-medium">
                    Volver a trabajos
                </Link>
            </div>
        );
    }

    const sr = data.quotation?.job_offer?.service_request;
    const pro = data.quotation?.job_offer?.professional;
    const client = sr?.user;
    const clientName = `${client?.name || ''} ${client?.last_name || ''}`.trim() || sr?.user_phone || '—';
    const techName = `${pro?.name || ''} ${pro?.last_name || ''}`.trim() || '—';

    return (
        <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Trabajo</h1>
                <Link href="/jobs" className="text-sm text-blue-600 font-medium">
                    Volver
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-sm">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <dt className="text-slate-500">Cliente</dt>
                        <dd className="text-slate-900 font-medium">{clientName}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Teléfono</dt>
                        <dd className="text-slate-900">{sr?.user_phone || client?.phone || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Técnico</dt>
                        <dd className="text-slate-900">{techName}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Estado</dt>
                        <dd className="text-slate-900">{data.status}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Categoría</dt>
                        <dd className="text-slate-900">{sr?.category || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Horario</dt>
                        <dd className="text-slate-900">{sr?.scheduled_slot || '—'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-slate-500">Dirección</dt>
                        <dd className="text-slate-900">{sr?.address || '—'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-slate-500">Problema</dt>
                        <dd className="text-slate-900 whitespace-pre-wrap">{sr?.description || '—'}</dd>
                    </div>
                </dl>
                <ProblemPhotos photos={sr?.photos} />
            </div>
        </div>
    );
}
