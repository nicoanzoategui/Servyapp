'use client';

type Marker = { providerId: string; lat: number; lng: number; status: string };

type Bbox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

function project(lat: number, lng: number, bbox: Bbox): { x: number; y: number } {
    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * 100;
    const y = 100 - ((lat - bbox.minLat) / (bbox.maxLat - bbox.minLat)) * 100;
    return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
}

function statusColor(st: string): string {
    if (st === 'active') return 'bg-emerald-500';
    if (st === 'active_no_location') return 'bg-amber-500';
    if (st === 'busy') return 'bg-orange-500';
    if (st === 'inactive') return 'bg-slate-400';
    return 'bg-blue-500';
}

export function OperationsMap({
    markers,
    bbox,
}: {
    markers: Marker[];
    bbox: Bbox;
}) {
    return (
        <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/10]">
            <iframe
                title="Mapa base OpenStreetMap (AMBA)"
                className="absolute inset-0 w-full h-full opacity-90 pointer-events-none"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-58.75%2C-34.85%2C-58.25%2C-34.45&amp;layer=mapnik"
                loading="lazy"
            />
            <div className="absolute inset-0 pointer-events-none">
                {markers.map((m) => {
                    const { x, y } = project(m.lat, m.lng, bbox);
                    return (
                        <div
                            key={m.providerId}
                            className={`absolute w-3 h-3 rounded-full border-2 border-white shadow ${statusColor(m.status)}`}
                            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                            title={`${m.providerId.slice(0, 8)}… · ${m.status}`}
                        />
                    );
                })}
            </div>
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-3 text-xs bg-white/90 px-3 py-2 rounded-lg border border-slate-200">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> activo
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> sin ubicación
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> ocupado
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> inactivo
                </span>
            </div>
        </div>
    );
}
