'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';
import { JsonTable } from '@/components/JsonTable';

type Experiment = { id: string; name: string; status: string; results_summary?: unknown };
type WaitRow = { experiment_id: string | null; status?: string };

function targetEnrollments(exp: Experiment): number {
    const rs = exp.results_summary as { target_enrollments?: number } | null | undefined;
    return typeof rs?.target_enrollments === 'number' ? rs.target_enrollments : 50;
}

export default function AgentsExperimentsPage() {
    const { data: experiments } = useQuery({
        queryKey: ['agentsExperiments'],
        queryFn: () => fetchAgentsApi('/api/experiments') as Promise<Experiment[]>,
    });
    const { data: waitlist } = useQuery({
        queryKey: ['agentsExperimentsWaitlist'],
        queryFn: () => fetchAgentsApi('/api/experiments/waitlist') as Promise<WaitRow[]>,
    });

    const counts = new Map<string, number>();
    if (Array.isArray(waitlist)) {
        for (const w of waitlist) {
            if (!w.experiment_id) continue;
            counts.set(w.experiment_id, (counts.get(w.experiment_id) ?? 0) + 1);
        }
    }

    const running = Array.isArray(experiments) ? experiments.filter((e) => e.status === 'running') : [];

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Experimentos</h1>

            {running.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h2 className="font-semibold text-slate-800">En curso — lista de espera</h2>
                    <p className="text-sm text-slate-500">
                        Progreso = inscriptos / meta (`target_enrollments` en `results_summary`, default 50).
                    </p>
                    {running.map((exp) => {
                        const n = counts.get(exp.id) ?? 0;
                        const target = targetEnrollments(exp);
                        const pct = Math.min(100, Math.round((n / target) * 100));
                        return (
                            <div key={exp.id}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-800">{exp.name}</span>
                                    <span className="text-slate-500">
                                        {n} / {target}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Listado</h2>
                    <JsonTable data={experiments} />
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Lista de espera</h2>
                    <JsonTable data={waitlist} />
                </div>
            </div>
        </div>
    );
}
