'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';
import { JsonTable } from '@/components/JsonTable';

type CoverageRow = {
    zone: string;
    activeProviders: number;
    coverage: 'green' | 'yellow' | 'red';
    expansionHighPriority: boolean;
};

function badge(c: CoverageRow['coverage']) {
    if (c === 'green') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (c === 'yellow') return 'bg-amber-100 text-amber-900 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
}

export default function AgentsRecruitmentPage() {
    const { data: candidates } = useQuery({
        queryKey: ['agentsRecruitmentCandidates'],
        queryFn: () => fetchAgentsApi('/api/recruitment/candidates'),
    });
    const { data: campaigns } = useQuery({
        queryKey: ['agentsRecruitmentCampaigns'],
        queryFn: () => fetchAgentsApi('/api/recruitment/campaigns'),
    });
    const { data: coverage } = useQuery({
        queryKey: ['agentsRecruitmentCoverage'],
        queryFn: () => fetchAgentsApi('/api/recruitment/coverage') as Promise<CoverageRow[]>,
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Reclutamiento</h1>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-3">Cobertura por zona</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Verde ≥3 activos, amarillo 1–2, rojo sin activos o con brecha de expansión prioritaria.
                </p>
                {!coverage || !Array.isArray(coverage) || coverage.length === 0 ? (
                    <p className="text-slate-500 text-sm">Sin datos de zonas (agregá zonas a profesionales activos).</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {coverage.map((row) => (
                            <div
                                key={row.zone}
                                className={`px-3 py-2 rounded-lg border text-sm font-medium ${badge(row.coverage)}`}
                                title={
                                    row.expansionHighPriority
                                        ? 'Prioridad alta en expansion_opportunities'
                                        : undefined
                                }
                            >
                                {row.zone}: {row.activeProviders} pro.
                                {row.expansionHighPriority ? ' · ⚠' : ''}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Candidatos</h2>
                    <JsonTable data={candidates} />
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Campañas</h2>
                    <JsonTable data={campaigns} />
                </div>
            </div>
        </div>
    );
}
