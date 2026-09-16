'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';
import { QueryBanner } from '@/components/QueryBanner';

export default function AgentsQualityPage() {
    const reviewsQ = useQuery({
        queryKey: ['agentsQualityReviews'],
        queryFn: () => fetchAgentsApi('/api/quality/reviews'),
    });
    const complaintsQ = useQuery({
        queryKey: ['agentsQualityComplaints'],
        queryFn: () => fetchAgentsApi('/api/quality/complaints'),
    });

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-900">Calidad</h1>
            <QueryBanner isLoading={reviewsQ.isLoading || complaintsQ.isLoading} isError={reviewsQ.isError || complaintsQ.isError} error={reviewsQ.error || complaintsQ.error} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Reseñas</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(reviewsQ.data ?? [], null, 2)}</pre>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="font-semibold mb-3">Reclamos abiertos</h2>
                    <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">
                        {JSON.stringify(complaintsQ.data ?? [], null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}
