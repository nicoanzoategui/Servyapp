'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { API_URL } from '@/lib/api';
import { ProblemPhotos } from '@/components/ProblemPhotos';
import Link from 'next/link';

type Payment = {
    amount?: number;
    status?: string;
    paid_at?: string | null;
    payment_type?: string;
};

type Quotation = {
    quotation_type?: string;
    total_price?: number;
    payment?: Payment | null;
};

type AdminJob = {
    id: string;
    status: string;
    scheduled_at?: string | null;
    updated_at?: string;
    quotation?: {
        total_price?: number;
        payment?: Payment | null;
        job_offer?: {
            professional?: { name?: string; last_name?: string } | null;
            quotations?: Quotation[];
            service_request?: {
                category?: string | null;
                address?: string | null;
                visit_fee?: number | null;
                user_phone?: string;
                photos?: string[];
                user?: { name?: string | null; last_name?: string | null; phone?: string } | null;
            };
        };
    };
};

const JOB_STATUS_LABELS: Record<string, string> = {
    confirmed: 'Visita confirmada',
    in_progress: 'En curso',
    completed: 'Completado',
    cancelled: 'Cancelado',
};

function money(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '—';
    return `$${Number(n).toLocaleString('es-AR')}`;
}

function jobStatusLabel(status: string | undefined): string {
    const key = status || 'unknown';
    return JOB_STATUS_LABELS[key] || key.replace(/_/g, ' ');
}

function clientLabel(job: AdminJob): string {
    const u = job.quotation?.job_offer?.service_request?.user;
    const full = `${u?.name || ''} ${u?.last_name || ''}`.trim();
    if (full) return full;
    return u?.phone || job.quotation?.job_offer?.service_request?.user_phone || '—';
}

function techLabel(job: AdminJob): string {
    const p = job.quotation?.job_offer?.professional;
    const full = `${p?.name || ''} ${p?.last_name || ''}`.trim();
    return full || '—';
}

function quotationsOf(job: AdminJob): Quotation[] {
    const nested = job.quotation?.job_offer?.quotations;
    if (nested?.length) return nested;
    return job.quotation ? [job.quotation] : [];
}

function quoteByType(job: AdminJob, type: string): Quotation | undefined {
    return quotationsOf(job).find((q) => q.quotation_type === type);
}

function paidAmount(q?: Quotation): number | null {
    if (q?.payment?.status === 'approved') return q.payment.amount ?? null;
    return null;
}

function totalPaid(job: AdminJob): number {
    return quotationsOf(job).reduce((sum, q) => sum + (paidAmount(q) || 0), 0);
}

function formatJobDate(job: AdminJob): string {
    const raw = job.scheduled_at || job.updated_at;
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, "dd MMM yyyy, HH:mm", { locale: es });
}

const fetchJobs = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error');
    return (Array.isArray(data.data) ? data.data : []) as AdminJob[];
};

export default function AdminJobsPage() {
    const { data, isLoading, isError } = useQuery({ queryKey: ['adminJobs'], queryFn: fetchJobs });

    if (isLoading) return <p className="text-slate-500">Cargando trabajos...</p>;
    if (isError) return <p className="text-red-600">No se pudieron cargar los trabajos.</p>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Trabajos</h1>
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                    <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                            <th className="p-3 font-medium">Cliente</th>
                            <th className="p-3 font-medium">Técnico</th>
                            <th className="p-3 font-medium">Categoría</th>
                            <th className="p-3 font-medium">Dirección</th>
                            <th className="p-3 font-medium">Fotos</th>
                            <th className="p-3 font-medium">Montos</th>
                            <th className="p-3 font-medium">Estado</th>
                            <th className="p-3 font-medium">Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data || []).map((j) => {
                            const sr = j.quotation?.job_offer?.service_request;
                            const visit = quoteByType(j, 'visit');
                            const repair = quoteByType(j, 'repair');
                            const visitPaid = paidAmount(visit);
                            const repairPaid = paidAmount(repair);
                            return (
                                <tr key={j.id} className="border-t border-slate-100 align-top" title={`ID ${j.id}`}>
                                    <td className="p-3 font-medium text-slate-900">
                                        <Link href={`/jobs/${j.id}`} className="text-blue-700 hover:underline">
                                            {clientLabel(j)}
                                        </Link>
                                    </td>
                                    <td className="p-3 text-slate-700">{techLabel(j)}</td>
                                    <td className="p-3">{sr?.category ?? '—'}</td>
                                    <td className="p-3 text-slate-600 max-w-[180px]">{sr?.address || '—'}</td>
                                    <td className="p-3">
                                        <ProblemPhotos photos={sr?.photos} />
                                    </td>
                                    <td className="p-3 text-slate-700 whitespace-nowrap">
                                        <div>Visita: {money(visitPaid ?? visit?.total_price ?? sr?.visit_fee)}</div>
                                        <div>Arreglo: {repair ? money(repairPaid ?? repair.total_price) : '—'}</div>
                                        <div className="font-semibold">Pagado: {money(totalPaid(j))}</div>
                                    </td>
                                    <td className="p-3">{jobStatusLabel(j.status)}</td>
                                    <td className="p-3 text-slate-600 whitespace-nowrap">{formatJobDate(j)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {data?.length === 0 && <p className="p-6 text-slate-500">No hay trabajos.</p>}
            </div>
        </div>
    );
}
