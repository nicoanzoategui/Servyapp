'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-slate-50">
            <div className="text-2xl font-black text-servy-600 tracking-tighter">Servy.</div>
            <h1 className="text-xl font-bold text-slate-900">Algo salió mal</h1>
            <p className="text-slate-500 text-sm text-center max-w-sm">
                El portal no pudo cargar esta página. Probá de nuevo o recargá.
            </p>
            <button
                type="button"
                onClick={() => reset()}
                className="bg-servy-600 text-white px-6 py-3 rounded-full font-bold hover:bg-servy-500 transition"
            >
                Reintentar
            </button>
        </div>
    );
}
