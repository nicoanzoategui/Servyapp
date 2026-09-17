'use client';

import { useMutation } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_URL } from '@/lib/api';
import { SERVICE_CATEGORIES } from '@/lib/service-categories';

type ProStatus = 'pending' | 'active' | 'suspended';

function authHeaders(): HeadersInit {
    return {
        Authorization: `Bearer ${Cookies.get('token') || ''}`,
        'Content-Type': 'application/json',
    };
}

export default function NewProfessionalPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [zones, setZones] = useState('');
    const [status, setStatus] = useState<ProStatus>('pending');
    const [formError, setFormError] = useState<string | null>(null);

    const toggleCategory = (cat: string) => {
        setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
    };

    const createMut = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_URL}/admin/professionals`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    name: name.trim(),
                    last_name: lastName.trim(),
                    email: email.trim(),
                    phone: phone.trim().replace(/\s/g, ''),
                    password,
                    categories,
                    zones: zones
                        .split(',')
                        .map((z) => z.trim())
                        .filter(Boolean),
                    status,
                    is_urgent: true,
                    is_scheduled: true,
                    onboarding_completed: true,
                }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo crear el profesional');
            return payload.data as { id: string };
        },
        onSuccess: (pro) => {
            if (pro?.id) router.push(`/professionals/${pro.id}`);
            else router.push('/professionals');
        },
        onError: (e: Error) => setFormError(e.message),
    });

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Nuevo profesional</h1>
                <Link href="/professionals" className="text-sm text-blue-600 font-medium">
                    Volver
                </Link>
            </div>

            <form
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    setFormError(null);
                    if (categories.length === 0) {
                        setFormError('Elegí al menos una categoría');
                        return;
                    }
                    createMut.mutate();
                }}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block text-sm">
                        <span className="text-slate-600">Nombre</span>
                        <input className="mt-1 w-full border rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
                    </label>
                    <label className="block text-sm">
                        <span className="text-slate-600">Apellido</span>
                        <input className="mt-1 w-full border rounded-lg px-3 py-2" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </label>
                    <label className="block text-sm">
                        <span className="text-slate-600">Email</span>
                        <input type="email" className="mt-1 w-full border rounded-lg px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </label>
                    <label className="block text-sm">
                        <span className="text-slate-600">Teléfono (solo dígitos)</span>
                        <input className="mt-1 w-full border rounded-lg px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="54911..." />
                    </label>
                </div>

                <label className="block text-sm">
                    <span className="text-slate-600">Contraseña inicial</span>
                    <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </label>

                <fieldset>
                    <legend className="text-sm text-slate-600 mb-2">Categorías</legend>
                    <div className="flex flex-wrap gap-2">
                        {SERVICE_CATEGORIES.map((cat) => (
                            <label key={cat} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5">
                                <input type="checkbox" checked={categories.includes(cat)} onChange={() => toggleCategory(cat)} />
                                {cat}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <label className="block text-sm">
                    <span className="text-slate-600">Zonas (separadas por coma)</span>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={zones} onChange={(e) => setZones(e.target.value)} placeholder="Pilar, 1631" />
                </label>

                <label className="block text-sm max-w-xs">
                    <span className="text-slate-600">Estado inicial</span>
                    <select className="mt-1 w-full border rounded-lg px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as ProStatus)}>
                        <option value="pending">pending</option>
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                    </select>
                </label>

                {formError && <p className="text-red-600 text-sm">{formError}</p>}

                <button
                    type="submit"
                    disabled={createMut.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
                >
                    {createMut.isPending ? 'Creando…' : 'Crear profesional'}
                </button>
            </form>
        </div>
    );
}
