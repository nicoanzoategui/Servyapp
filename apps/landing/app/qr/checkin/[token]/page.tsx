import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckinConfirmButton } from './CheckinConfirmButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Confirmar llegada | Servy',
    robots: { index: false, follow: false },
};

type CheckinData = {
    professionalName: string;
    category: string;
    alreadyConfirmed: boolean;
    confirmedAtLabel: string | null;
};

const GENERIC_FAIL = 'No pudimos validar este código.';

async function loadCheckin(token: string): Promise<CheckinData | null> {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    try {
        const res = await fetch(`${apiBase}/public/checkin/${encodeURIComponent(token)}`, {
            cache: 'no-store',
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success || !json.data) return null;
        return json.data as CheckinData;
    } catch {
        return null;
    }
}

export default async function CheckinPage({ params }: { params: { token: string } }) {
    const token = (params.token || '').trim();
    const data = token ? await loadCheckin(token) : null;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    return (
        <main className="min-h-screen bg-[#F2F9EF] flex flex-col items-center px-6 py-10">
            <Link href="/" className="text-2xl font-bold text-[#0D4638] tracking-tighter mb-10">
                servy.
            </Link>
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                {!data ? (
                    <>
                        <h1 className="text-2xl font-bold text-[#0B3A31] mb-3">Algo no salió bien</h1>
                        <p className="text-[#0D4638]/80 leading-relaxed">{GENERIC_FAIL}</p>
                    </>
                ) : data.alreadyConfirmed ? (
                    <>
                        <p className="text-sm font-semibold text-[#0D4638]/60 uppercase tracking-wide mb-2">
                            {data.category}
                        </p>
                        <h1 className="text-2xl font-bold text-[#0B3A31] mb-3">Llegada ya confirmada</h1>
                        <p className="text-[#0D4638]/80 leading-relaxed">
                            Esta llegada ya fue confirmada
                            {data.confirmedAtLabel ? ` el ${data.confirmedAtLabel}` : ''}.
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm font-semibold text-[#0D4638]/60 uppercase tracking-wide mb-2">
                            {data.category}
                        </p>
                        <h1 className="text-2xl font-bold text-[#0B3A31] mb-4">¿Llegó el técnico?</h1>
                        <p className="text-[#0D4638]/80 leading-relaxed mb-8">
                            ¿Confirmás que <span className="font-semibold text-[#0D4638]">{data.professionalName}</span>{' '}
                            llegó a tu domicilio?
                        </p>
                        <CheckinConfirmButton
                            token={token}
                            professionalName={data.professionalName}
                            apiBase={apiBase}
                        />
                    </>
                )}
            </div>
        </main>
    );
}
