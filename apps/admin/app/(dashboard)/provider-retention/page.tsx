'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';
import { QueryBanner } from '@/components/QueryBanner';

export default function ProviderRetentionPage() {
    const atRiskQ = useQuery({
        queryKey: ['agentsRetentionAtRisk'],
        queryFn: () => fetchAgentsApi('/api/retention/at-risk'),
    });
    const messagesQ = useQuery({
        queryKey: ['agentsRetentionMessages'],
        queryFn: () => fetchAgentsApi('/api/retention/messages'),
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Retención de proveedores</h1>
            <QueryBanner isLoading={atRiskQ.isLoading || messagesQ.isLoading} isError={atRiskQ.isError || messagesQ.isError} error={atRiskQ.error || messagesQ.error} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Salud / riesgo</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(atRiskQ.data ?? [], null, 2)}</pre>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Mensajes enviados</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(messagesQ.data ?? [], null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
