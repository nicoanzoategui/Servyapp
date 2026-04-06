'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';

export default function AgentsFraudPage() {
    const { data: alerts } = useQuery({
        queryKey: ['agentsFraudAlerts'],
        queryFn: () => fetchAgentsApi('/api/fraud/alerts'),
    });
    const { data: patterns } = useQuery({
        queryKey: ['agentsFraudPatterns'],
        queryFn: () => fetchAgentsApi('/api/fraud/patterns'),
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Anti-fraude</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Alertas</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(alerts, null, 2)}</pre>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Patrones</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(patterns, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
