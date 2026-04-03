'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';

const fetchJobs = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error');
    return data.data as any[];
};

export default function AdminJobsPage() {
    const { data, isLoading, isError } = useQuery({ queryKey: ['adminJobs'], queryFn: fetchJobs });

    if (isLoading) return <p className="text-slate-500">Cargando trabajos...</p>;
    if (isError) return <p className="text-red-600">No se pudieron cargar los trabajos.</p>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Trabajos</h1>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left">
                        <tr>
                            <th className="p-3">ID</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3">Categoría</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data || []).map((j) => (
                            <tr key={j.id} className="border-t border-slate-100">
                                <td className="p-3 font-mono text-xs">{j.id.slice(0, 12)}…</td>
                                <td className="p-3">{j.status}</td>
                                <td className="p-3">{j.quotation?.job_offer?.service_request?.category ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data?.length === 0 && <p className="p-6 text-slate-500">No hay trabajos.</p>}
            </div>
        </div>
    );
}
