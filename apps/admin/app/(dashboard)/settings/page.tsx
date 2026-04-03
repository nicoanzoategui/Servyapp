'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

export default function AdminSettingsPage() {
    const qc = useQueryClient();
    const [commission, setCommission] = useState('15');
    const [schedule, setSchedule] = useState('9-18');

    const { data, isLoading } = useQuery({
        queryKey: ['adminConfig'],
        queryFn: async () => {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/admin/config`, { headers: { Authorization: `Bearer ${token}` } });
            const j = await res.json();
            if (!res.ok) throw new Error('Error');
            return j.data as { commission?: number; schedule?: string };
        },
    });

    useEffect(() => {
        if (!data) return;
        if (data.commission != null) setCommission(String(data.commission));
        if (data.schedule) setSchedule(data.schedule);
    }, [data]);

    const save = useMutation({
        mutationFn: async () => {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/admin/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ commission: Number(commission), schedule }),
            });
            if (!res.ok) throw new Error('Error');
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['adminConfig'] }),
    });

    if (isLoading) return <p className="text-slate-500">Cargando...</p>;

    return (
        <div className="max-w-lg space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
            <p className="text-slate-600 text-sm">Valores en Redis (comisión y horario de referencia del bot).</p>
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Comisión (%)</label>
                    <input
                        type="number"
                        className="w-full border rounded-lg px-3 py-2"
                        value={commission}
                        onChange={(e) => setCommission(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Horario bot (texto)</label>
                    <input
                        className="w-full border rounded-lg px-3 py-2"
                        value={schedule}
                        onChange={(e) => setSchedule(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                    {save.isPending ? 'Guardando...' : 'Guardar'}
                </button>
                {save.isSuccess && <p className="text-green-600 text-sm">Guardado.</p>}
            </div>
        </div>
    );
}
