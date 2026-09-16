'use client';

export default function DashboardError({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-start gap-4 max-w-lg">
            <h1 className="text-2xl font-bold text-slate-900">No se pudo cargar esta pantalla</h1>
            <p className="text-slate-500 text-sm">
                Si es una sección de agentes, puede no haber datos todavía. El resto del panel sigue disponible.
            </p>
            <button
                type="button"
                onClick={() => reset()}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800"
            >
                Reintentar
            </button>
        </div>
    );
}
