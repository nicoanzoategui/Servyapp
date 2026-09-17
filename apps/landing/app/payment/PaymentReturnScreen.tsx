import Link from 'next/link';

type PaymentStatus = 'success' | 'failure' | 'pending';

const COPY: Record<
    PaymentStatus,
    { title: string; body: string; accent: string }
> = {
    success: {
        title: 'Pago recibido',
        body: 'Mercado Pago confirmó tu pago. En unos minutos te llega la confirmación por WhatsApp. Podés cerrar esta ventana.',
        accent: '#0D4638',
    },
    failure: {
        title: 'No pudimos completar el pago',
        body: 'El pago no se acreditó. Volvé a WhatsApp y tocá el link de nuevo, o escribí ayuda si necesitás que te lo reenviemos.',
        accent: '#b45309',
    },
    pending: {
        title: 'Pago en proceso',
        body: 'Mercado Pago está procesando el pago. Te avisamos por WhatsApp cuando se acredite. No hace falta que hagas nada más.',
        accent: '#0369a1',
    },
};

export function PaymentReturnScreen({ status }: { status: PaymentStatus }) {
    const c = COPY[status];
    return (
        <main className="flex min-h-screen flex-col items-center bg-white">
            <header className="w-full h-20 flex items-center justify-between px-6 md:px-12 bg-white border-b border-slate-100">
                <Link href="/" className="text-2xl font-bold text-[#0D4638] tracking-tighter">
                    servy.
                </Link>
            </header>
            <div className="w-full max-w-lg px-6 py-16 text-center">
                <h1 className="text-3xl font-bold mb-4" style={{ color: c.accent }}>
                    {c.title}
                </h1>
                <p className="text-slate-600 leading-relaxed mb-10">{c.body}</p>
                <Link
                    href="/"
                    className="inline-block rounded-full bg-[#0D4638] text-white px-6 py-3 text-sm font-medium"
                >
                    Volver al inicio
                </Link>
            </div>
        </main>
    );
}
