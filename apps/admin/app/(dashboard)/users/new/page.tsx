'use client';

import { useMutation } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_URL } from '@/lib/api';

function authHeaders(): HeadersInit {
    return {
        Authorization: `Bearer ${Cookies.get('token') || ''}`,
        'Content-Type': 'application/json',
    };
}

export default function NewUserPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [formError, setFormError] = useState<string | null>(null);

    const createMut = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_URL}/admin/users`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    name: name.trim(),
                    last_name: lastName.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    status,
                    onboarding_completed: Boolean(name.trim() && lastName.trim()),
                }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo crear el usuario');
            return payload.data as { id: string };
        },
        onSuccess: (user) => {
            if (user?.id) router.push(`/users/${user.id}`);
            else router.push('/users');
        },
        onError: (e: Error) => setFormError(e.message),
    });

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Nuevo usuario</h1>
                <Link href="/users" className="text-sm text-blue-600 font-medium">
                    Volver
                </Link>
            </div>
            <form
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    createMut.mutate();
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
                    <span className="text-slate-600">Teléfono (con código de país, sin +)</span>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="54911..." />
                </label>
                <label className="block text-sm">
                    <span className="text-slate-600">Dirección</span>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <label className="block text-sm max-w-xs">
                    <span className="text-slate-600">Estado</span>
                    <select className="mt-1 w-full border rounded-lg px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
                        <option value="active">activo</option>
                        <option value="inactive">inactivo</option>
                    </select>
                </label>
                {formError && <p className="text-red-600 text-sm">{formError}</p>}
                <button type="submit" disabled={createMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60">
                    {createMut.isPending ? 'Creando…' : 'Crear usuario'}
                </button>
            </form>
        </div>
    );
}
