'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';

export default function AgentsForecastPage() {
    const { data: weekly } = useQuery({
        queryKey: ['agentsForecastWeekly'],
        queryFn: () => fetchAgentsApi('/api/forecast/weekly'),
    });
    const { data: expansion } = useQuery({
        queryKey: ['agentsForecastExpansion'],
        queryFn: () => fetchAgentsApi('/api/forecast/expansion'),
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Forecast y expansión</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Demanda semanal (últimos registros)</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(weekly, null, 2)}</pre>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Oportunidades</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(expansion, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
