'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-slate-50">
            <h1 className="text-2xl font-bold text-slate-900">Algo salió mal</h1>
            <p className="text-slate-500 text-sm text-center max-w-md">
                El panel tuvo un error al cargar esta pantalla. Probá de nuevo.
            </p>
            <button
                type="button"
                onClick={() => reset()}
                className="bg-servy-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-servy-700"
            >
                Reintentar
            </button>
        </div>
    );
}
