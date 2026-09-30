'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

type UserStatus = 'active' | 'inactive';

type User = {
    id: string;
    phone: string;
    name: string | null;
    last_name: string | null;
    address: string | null;
    postal_code: string | null;
    status: UserStatus;
    onboarding_completed: boolean;
    service_requests?: { id: string; category: string | null; status: string; created_at: string }[];
};

function authHeaders(): HeadersInit {
    return {
        Authorization: `Bearer ${Cookies.get('token') || ''}`,
        'Content-Type': 'application/json',
    };
}

export default function EditUserPage() {
    const params = useParams();
    const id = String(params.id || '');
    const router = useRouter();
    const qc = useQueryClient();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['adminUser', id],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/admin/users/${id}`, { headers: authHeaders() });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo cargar el usuario');
            return payload.data as User;
        },
        enabled: Boolean(id),
    });

    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [status, setStatus] = useState<UserStatus>('active');
    const [formError, setFormError] = useState<string | null>(null);
    const [formOk, setFormOk] = useState<string | null>(null);

    useEffect(() => {
        if (!data) return;
        setName(data.name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setPostalCode(data.postal_code || '');
        setStatus(data.status || 'active');
    }, [data]);

    const saveMut = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_URL}/admin/users/${id}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({
                    name,
                    last_name: lastName,
                    phone,
                    address,
                    postal_code: postalCode,
                    status,
                }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo guardar');
            return payload.data;
        },
        onSuccess: () => {
            setFormOk('Cambios guardados');
            setFormError(null);
            qc.invalidateQueries({ queryKey: ['adminUser', id] });
            qc.invalidateQueries({ queryKey: ['adminUsers'] });
        },
        onError: (e: Error) => {
            setFormOk(null);
            setFormError(e.message);
        },
    });

    const statusMut = useMutation({
        mutationFn: async (next: UserStatus) => {
            const res = await fetch(`${API_URL}/admin/users/${id}/status`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ status: next }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo cambiar el estado');
            return payload.data as User;
        },
        onSuccess: (user) => {
            setStatus(user.status);
            setFormOk(`Estado actualizado a ${user.status}`);
            qc.invalidateQueries({ queryKey: ['adminUser', id] });
            qc.invalidateQueries({ queryKey: ['adminUsers'] });
        },
        onError: (e: Error) => setFormError(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo eliminar');
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['adminUsers'] });
            router.push('/users');
        },
        onError: (e: Error) => setFormError(e.message),
    });

    if (isLoading) return <p className="text-slate-500">Cargando usuario...</p>;
    if (isError) {
        return (
            <div className="space-y-3">
                <p className="text-red-600">{(error as Error)?.message || 'No se pudo cargar.'}</p>
                <Link href="/users" className="text-blue-600 font-medium">Volver</Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Editar usuario</h1>
                <Link href="/users" className="text-sm text-blue-600 font-medium">Volver</Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <p className="text-sm font-medium text-slate-700">Estado rápido</p>
                <div className="flex flex-wrap gap-2">
                    {(['active', 'inactive'] as const).map((s) => (
                        <button
                            key={s}
                            type="button"
                            disabled={statusMut.isPending}
                            onClick={() => statusMut.mutate(s)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                status === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            {s === 'active' ? 'activo' : 'inactivo'}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500">Inactivo: el bot no le responde por WhatsApp.</p>
            </div>

            <form
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    saveMut.mutate();
                }}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block text-sm">
                        <span className="text-slate-600">Nombre</span>
                        <input className="mt-1 w-full border rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label className="block text-sm">
                        <span className="text-slate-600">Apellido</span>
                        <input className="mt-1 w-full border rounded-lg px-3 py-2" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </label>
                </div>
                <label className="block text-sm">
                    <span className="text-slate-600">Teléfono</span>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </label>
                <label className="block text-sm">
                    <span className="text-slate-600">Dirección</span>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <label className="block text-sm max-w-xs">
                    <span className="text-slate-600">Código postal</span>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </label>
                {formError && <p className="text-red-600 text-sm">{formError}</p>}
                {formOk && <p className="text-green-700 text-sm">{formOk}</p>}
                <button type="submit" disabled={saveMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60">
                    {saveMut.isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
            </form>

            {(data?.service_requests?.length || 0) > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="font-semibold mb-3">Pedidos recientes</h2>
                    <ul className="text-sm text-slate-700 space-y-1">
                        {data?.service_requests?.map((r) => (
                            <li key={r.id}>{r.category || '—'} · {r.status}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="border border-red-200 bg-red-50 rounded-xl p-5 space-y-3">
                <p className="font-medium text-red-800">Eliminar usuario</p>
                <p className="text-sm text-red-700">
                    Solo si no tiene pedidos. Si tiene historial, ponelo inactivo.
                </p>
                <button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                    disabled={deleteMut.isPending}
                    onClick={() => {
                        if (confirm('¿Eliminar este usuario?')) deleteMut.mutate();
                    }}
                >
                    {deleteMut.isPending ? 'Eliminando…' : 'Eliminar'}
                </button>
            </div>
        </div>
    );
}
