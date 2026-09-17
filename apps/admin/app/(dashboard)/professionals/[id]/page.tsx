'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';
import { SERVICE_CATEGORIES } from '@/lib/service-categories';

type ProStatus = 'pending' | 'active' | 'suspended';

type Professional = {
    id: string;
    name: string;
    last_name: string;
    email: string;
    phone: string;
    categories: string[];
    zones: string[];
    status: ProStatus;
    rating: number;
    is_urgent: boolean;
    is_scheduled: boolean;
};

function authHeaders(): HeadersInit {
    return {
        Authorization: `Bearer ${Cookies.get('token') || ''}`,
        'Content-Type': 'application/json',
    };
}

const fetchProfessional = async (id: string): Promise<Professional> => {
    const res = await fetch(`${API_URL}/admin/professionals/${id}`, { headers: authHeaders() });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo cargar el profesional');
    if (!payload.data) throw new Error('Profesional no encontrado');
    return payload.data as Professional;
};

export default function EditProfessionalPage() {
    const params = useParams();
    const id = String(params.id || '');
    const qc = useQueryClient();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['adminProfessional', id],
        queryFn: () => fetchProfessional(id),
        enabled: Boolean(id),
    });

    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [zones, setZones] = useState('');
    const [status, setStatus] = useState<ProStatus>('pending');
    const [rating, setRating] = useState(0);
    const [isUrgent, setIsUrgent] = useState(false);
    const [isScheduled, setIsScheduled] = useState(true);
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [formOk, setFormOk] = useState<string | null>(null);

    useEffect(() => {
        if (!data) return;
        setName(data.name || '');
        setLastName(data.last_name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setZones((data.zones || []).join(', '));
        setStatus(data.status || 'pending');
        setRating(Number(data.rating) || 0);
        setIsUrgent(Boolean(data.is_urgent));
        setIsScheduled(data.is_scheduled !== false);
    }, [data]);

    const saveMut = useMutation({
        mutationFn: async () => {
            const body: Record<string, unknown> = {
                name: name.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                categories,
                zones: zones
                    .split(',')
                    .map((z) => z.trim())
                    .filter(Boolean),
                rating,
                is_urgent: isUrgent,
                is_scheduled: isScheduled,
            };
            if (password.trim()) body.password = password.trim();
            const res = await fetch(`${API_URL}/admin/professionals/${id}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(body),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo guardar');
            return payload.data;
        },
        onSuccess: () => {
            setFormOk('Cambios guardados');
            setFormError(null);
            setPassword('');
            qc.invalidateQueries({ queryKey: ['adminProfessional', id] });
            qc.invalidateQueries({ queryKey: ['adminProfessionals'] });
        },
        onError: (e: Error) => {
            setFormOk(null);
            setFormError(e.message);
        },
    });

    const statusMut = useMutation({
        mutationFn: async (next: ProStatus) => {
            const res = await fetch(`${API_URL}/admin/professionals/${id}/status`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ status: next }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error?.message || 'No se pudo cambiar el estado');
            return payload.data as Professional;
        },
        onSuccess: (pro) => {
            setStatus(pro.status);
            setFormOk(`Estado actualizado a ${pro.status}`);
            setFormError(null);
            qc.invalidateQueries({ queryKey: ['adminProfessional', id] });
            qc.invalidateQueries({ queryKey: ['adminProfessionals'] });
        },
        onError: (e: Error) => {
            setFormOk(null);
            setFormError(e.message);
        },
    });

    const toggleCategory = (cat: string) => {
        setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
    };

    if (isLoading) return <p className="text-slate-500">Cargando profesional...</p>;
    if (isError) {
        return (
            <div className="space-y-3">
                <p className="text-red-600">{(error as Error)?.message || 'No se pudo cargar el profesional.'}</p>
                <Link href="/professionals" className="text-blue-600 font-medium">
                    Volver al listado
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Editar profesional</h1>
                <Link href="/professionals" className="text-sm text-blue-600 font-medium">
                    Volver
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <p className="text-sm font-medium text-slate-700">Estado rápido</p>
                <div className="flex flex-wrap gap-2">
                    {(['pending', 'active', 'suspended'] as const).map((s) => (
                        <button
                            key={s}
                            type="button"
                            disabled={statusMut.isPending}
                            onClick={() => statusMut.mutate(s)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                status === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <form
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    setFormOk(null);
                    setFormError(null);
                    saveMut.mutate();
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
                        <span className="text-slate-600">Teléfono</span>
                        <input className="mt-1 w-full border rounded-lg px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </label>
                </div>

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
                    <span className="text-slate-600">Rating</span>
                    <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        className="mt-1 w-full border rounded-lg px-3 py-2"
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                    />
                </label>

                <div className="flex gap-6 text-sm">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
                        Toma urgentes
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />
                        Toma programados
                    </label>
                </div>

                <label className="block text-sm">
                    <span className="text-slate-600">Nueva contraseña (opcional)</span>
                    <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
                </label>

                {formError && <p className="text-red-600 text-sm">{formError}</p>}
                {formOk && <p className="text-green-700 text-sm">{formOk}</p>}

                <button
                    type="submit"
                    disabled={saveMut.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
                >
                    {saveMut.isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
            </form>
        </div>
    );
}
