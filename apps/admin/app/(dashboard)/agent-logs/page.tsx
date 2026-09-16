'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';
import { JsonTable } from '@/components/JsonTable';
import { QueryBanner } from '@/components/QueryBanner';

export default function AgentLogsPage() {
    const logsQ = useQuery({
        queryKey: ['agentsLogs'],
        queryFn: () => fetchAgentsApi('/api/agents/logs'),
    });

    const tasksQ = useQuery({
        queryKey: ['agentsTasks'],
        queryFn: () => fetchAgentsApi('/api/agents/tasks'),
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Logs y tareas de agentes</h1>
            <QueryBanner
                isError={logsQ.isError || tasksQ.isError}
                error={logsQ.error || tasksQ.error}
            />

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-3">Cola `agent_tasks` (contenido / otros)</h2>
                {tasksQ.isLoading ? (
                    <p className="text-slate-500 text-sm">Cargando…</p>
                ) : (
                    <JsonTable data={tasksQ.data} maxRows={40} />
                )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-3">Logs recientes</h2>
                {logsQ.isLoading ? (
                    <p className="text-slate-500 text-sm">Cargando…</p>
                ) : (
                    <JsonTable data={logsQ.data} maxRows={100} />
                )}
            </div>
        </div>
    );
}
