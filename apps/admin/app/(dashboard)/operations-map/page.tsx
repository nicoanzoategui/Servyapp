'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgentsApi } from '@/lib/agents-api';
import { JsonTable } from '@/components/JsonTable';
import { OperationsMap } from '@/components/OperationsMap';

type MapPayload = {
    center: { lat: number; lng: number };
    bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
    markers: { providerId: string; lat: number; lng: number; status: string }[];
};

export default function OperationsMapPage() {
    const { data: active, isLoading: loadA } = useQuery({
        queryKey: ['agentsAvailabilityActive'],
        queryFn: () => fetchAgentsApi('/api/availability/active'),
    });

    const { data: mapData, isLoading: loadM } = useQuery({
        queryKey: ['agentsMapMarkers'],
        queryFn: () => fetchAgentsApi('/api/availability/map-markers') as Promise<MapPayload>,
    });

    const bbox = mapData?.bbox ?? {
        minLng: -58.75,
        minLat: -34.85,
        maxLng: -58.25,
        maxLat: -34.45,
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Operaciones</h1>
                <p className="text-slate-600 text-sm mt-1">
                    Mapa aproximado (embed OSM + puntos desde Redis). Coordenadas proyectadas al recuadro AMBA.
                </p>
            </div>

            {loadM ? (
                <p className="text-slate-500">Cargando mapa…</p>
            ) : (
                <OperationsMap markers={mapData?.markers ?? []} bbox={bbox} />
            )}

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-3">Estados en Redis</h2>
                {loadA ? <p className="text-slate-500">Cargando…</p> : <JsonTable data={active} />}
            </div>
        </div>
    );
}
