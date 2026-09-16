export function QueryBanner({
    isLoading,
    isError,
    error,
}: {
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
}) {
    if (isLoading) return <p className="text-slate-500 text-sm mb-3">Cargando…</p>;
    if (isError) {
        const msg = error instanceof Error ? error.message : 'Error al cargar';
        return <p className="text-amber-800 text-sm mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{msg}</p>;
    }
    return null;
}
