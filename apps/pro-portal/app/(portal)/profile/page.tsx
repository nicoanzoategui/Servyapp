'use client';

import { useState } from 'react';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';

export default function ProfilePage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        zones: '',
        categories: '',
        cbu_alias: '',
    });

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        try {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/professional/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    zones: formData.zones.split(',').map((s) => s.trim()).filter(Boolean),
                    categories: formData.categories.split(',').map((s) => s.trim()).filter(Boolean),
                    cbu_alias: formData.cbu_alias.trim() || undefined,
                    is_urgent: true,
                    is_scheduled: true,
                })
            });
            if (res.ok) setSuccess(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 flex flex-col gap-6 w-full pb-20 md:pb-6 animate-fade-in max-w-2xl">
            <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                {success && <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl font-medium border border-green-200">Perfil actualizado correctamente.</div>}

                <form onSubmit={handleUpdate} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Zonas (Separadas por coma)</label>
                        <input
                            type="text"
                            value={formData.zones}
                            onChange={e => setFormData({ ...formData, zones: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            placeholder="CABA, Olivos, Quilmes"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Categorías (Separadas por coma)</label>
                        <input
                            type="text"
                            value={formData.categories}
                            onChange={e => setFormData({ ...formData, categories: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            placeholder="Plomería, Cerrajería"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">CBU / Alias (cobros)</label>
                        <input
                            type="text"
                            value={formData.cbu_alias}
                            onChange={(e) => setFormData({ ...formData, cbu_alias: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            placeholder="CBU o alias de cobro"
                        />
                    </div>

                    <button disabled={loading} type="submit" className="w-full md:w-auto self-start bg-servy-600 hover:bg-servy-500 text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 mt-2">
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </form>
            </div>
        </div>
    );
}
