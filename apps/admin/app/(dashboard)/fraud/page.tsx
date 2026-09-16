'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';
import { QueryBanner } from '@/components/QueryBanner';

export default function AgentsFraudPage() {
    const alertsQ = useQuery({
        queryKey: ['agentsFraudAlerts'],
        queryFn: () => fetchAgentsApi('/api/fraud/alerts'),
    });
    const patternsQ = useQuery({
        queryKey: ['agentsFraudPatterns'],
        queryFn: () => fetchAgentsApi('/api/fraud/patterns'),
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Anti-fraude</h1>
            <QueryBanner isLoading={alertsQ.isLoading || patternsQ.isLoading} isError={alertsQ.isError || patternsQ.isError} error={alertsQ.error || patternsQ.error} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Alertas</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(alertsQ.data ?? [], null, 2)}</pre>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Patrones</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(patternsQ.data ?? [], null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
