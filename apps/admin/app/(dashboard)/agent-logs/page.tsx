'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';
import { JsonTable } from '@/components/JsonTable';

export default function AgentLogsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['agentsLogs'],
        queryFn: () => fetchAgentsApi('/api/agents/logs'),
    });

    const { data: tasks, isLoading: loadT } = useQuery({
        queryKey: ['agentsTasks'],
        queryFn: () => fetchAgentsApi('/api/agents/tasks'),
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Logs y tareas de agentes</h1>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-3">Cola `agent_tasks` (contenido / otros)</h2>
                {loadT ? (
                    <p className="text-slate-500 text-sm">Cargando…</p>
                ) : (
                    <JsonTable data={tasks} maxRows={40} />
                )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-3">Logs recientes</h2>
                {isLoading ? (
                    <p className="text-slate-500 text-sm">Cargando…</p>
                ) : (
                    <JsonTable data={data} maxRows={100} />
                )}
            </div>
        </div>
    );
}
