'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';
import { fetchAgentsApi } from '@/lib/agents-api';

export default function AgentsPricingPage() {
    const [category, setCategory] = useState('plomeria');
    const [jobType, setJobType] = useState('plomeria_simple');
    const [zone, setZone] = useState('caba_resto');

    const { data: materials } = useQuery({
        queryKey: ['agentsMaterials', category],
        queryFn: () => fetchAgentsApi(`/api/pricing/materials?category=${encodeURIComponent(category)}`),
    });

    const { data: recent } = useQuery({
        queryKey: ['agentsQuotesRecent'],
        queryFn: () => fetchAgentsApi('/api/pricing/quotes/recent'),
    });

    const quoteMut = useMutation({
        mutationFn: async () => {
            const token = Cookies.get('token');
            const qs = new URLSearchParams({
                category,
                jobType,
                zone,
                datetime: new Date().toISOString(),
            });
            const res = await fetch(`${API_URL}/api/pricing/quote?${qs}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || 'Error');
            return j.data;
        },
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-5xl">
            <h1 className="text-3xl font-bold text-slate-900">Agente — Pricing</h1>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="font-semibold text-slate-800">Nueva cotización</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex flex-col gap-1 text-sm">
                        Categoría
                        <input
                            className="border rounded px-3 py-2"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        Tipo de trabajo
                        <input
                            className="border rounded px-3 py-2"
                            value={jobType}
                            onChange={(e) => setJobType(e.target.value)}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        Zona
                        <input className="border rounded px-3 py-2" value={zone} onChange={(e) => setZone(e.target.value)} />
                    </label>
                </div>
                <button
                    type="button"
                    onClick={() => quoteMut.mutate()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    Calcular
                </button>
                {quoteMut.isError && (
                    <p className="text-red-600 text-sm">{(quoteMut.error as Error).message}</p>
                )}
                {quoteMut.data && (
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-64">
                        {JSON.stringify(quoteMut.data, null, 2)}
                    </pre>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold text-slate-800 mb-3">Materiales recientes ({category})</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-80">
                        {JSON.stringify(materials, null, 2)}
                    </pre>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold text-slate-800 mb-3">Cotizaciones recientes</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-80">
                        {JSON.stringify(recent, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}
