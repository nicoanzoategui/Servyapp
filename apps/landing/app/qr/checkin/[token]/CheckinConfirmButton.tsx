'use client';

import { useState } from 'react';

type Props = {
    token: string;
    professionalName: string;
    apiBase: string;
};

export function CheckinConfirmButton({ token, professionalName, apiBase }: Props) {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const onConfirm = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${apiBase}/public/checkin/${encodeURIComponent(token)}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) {
                setError('No pudimos validar este código.');
                return;
            }
            setDone(true);
        } catch {
            setError('No pudimos validar este código.');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <p className="text-[#0D4638] text-center leading-relaxed">
                Confirmaste la llegada de <span className="font-semibold">{professionalName}</span>. ¡Que tengan un buen
                trabajo!
            </p>
        );
    }

    return (
        <div className="flex flex-col items-stretch gap-3">
            <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="bg-[#A7E23C] text-[#0D4638] px-6 py-4 rounded-full font-bold hover:bg-[#A7E23C]/90 disabled:opacity-60 transition"
            >
                {loading ? 'Confirmando…' : 'Confirmar llegada'}
            </button>
            {error ? <p className="text-sm text-center text-red-700">{error}</p> : null}
        </div>
    );
}
