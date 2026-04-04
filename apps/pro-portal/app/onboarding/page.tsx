'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';

const OFFERINGS = [
    { key: 'plomero', label: 'Plomero', category: 'Plomería' },
    { key: 'electricista', label: 'Electricista', category: 'Electricidad' },
    { key: 'cerrajero', label: 'Cerrajero', category: 'Cerrajería' },
    { key: 'gasista', label: 'Gasista', category: 'Gas' },
    { key: 'aire', label: 'Técnico en aire acondicionado', category: 'Aires acondicionados' },
] as const;

export default function OnboardingPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [last_name, setLastName] = useState('');
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const token = Cookies.get('token');
            if (!token) {
                router.replace('/login');
                return;
            }
            try {
                const res = await fetch(`${API_URL}/professional/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (cancelled) return;
                if (!res.ok) throw new Error('No se pudo cargar el perfil');
                if (json.data?.onboarding_completed) {
                    router.replace('/dashboard');
                    return;
                }
                setName(json.data.name || '');
                setLastName(json.data.last_name || '');
            } catch {
                if (!cancelled) setError('Error al cargar datos');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [router]);

    const toggle = (key: string) => {
        setSelected((s) => ({ ...s, [key]: !s[key] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const categories = OFFERINGS.filter((o) => selected[o.key]).map((o) => o.category);
        if (!name.trim() || !last_name.trim() || categories.length === 0) {
            setError('Completá nombre, apellido y al menos un oficio');
            return;
        }
        setSaving(true);
        try {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/professional/onboarding/complete`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: name.trim(), last_name: last_name.trim(), categories }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error?.message || 'No se pudo guardar');
            }
            router.replace('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
                Cargando...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-6 py-12">
            <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-bold text-slate-900">Completá tu perfil</h1>
                <p className="mt-2 text-sm text-slate-600">Confirmá tus datos y elegí en qué oficios trabajás.</p>
                {error && (
                    <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Nombre</label>
                        <input
                            required
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-900">Apellido</label>
                        <input
                            required
                            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                            value={last_name}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    <fieldset>
                        <legend className="text-sm font-semibold text-slate-900">Oficios</legend>
                        <div className="mt-3 flex flex-col gap-3">
                            {OFFERINGS.map((o) => (
                                <label key={o.key} className="flex cursor-pointer items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={!!selected[o.key]}
                                        onChange={() => toggle(o.key)}
                                        className="h-4 w-4 rounded border-slate-300 text-servy-600 focus:ring-servy-500"
                                    />
                                    <span className="text-slate-800">{o.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-xl bg-servy-600 py-3 text-sm font-semibold text-white hover:bg-servy-500 disabled:opacity-70"
                    >
                        {saving ? 'Guardando...' : 'Continuar al panel'}
                    </button>
                </form>
            </div>
        </div>
    );
}
