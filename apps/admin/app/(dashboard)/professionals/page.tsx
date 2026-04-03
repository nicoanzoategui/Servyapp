'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { API_URL } from '@/lib/api';

const fetchProfessionals = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/professionals`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching data');
    return data.data;
};

export default function ProfessionalsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['adminProfessionals'],
        queryFn: fetchProfessionals,
    });

    if (isLoading) return <div className="text-slate-500">Cargando profesionales...</div>;

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Profesionales</h1>
                <Link href="/professionals/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
                    + Nuevo Profesional
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="p-4 font-medium">Nombre Completo</th>
                            <th className="p-4 font-medium">Categorías</th>
                            <th className="p-4 font-medium">Teléfono</th>
                            <th className="p-4 font-medium">Estado</th>
                            <th className="p-4 font-medium">Alta</th>
                            <th className="p-4 font-medium">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data || []).map((pro: any) => (
                            <tr key={pro.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                <td className="p-4 font-medium text-slate-900">{pro.name} {pro.last_name}</td>
                                <td className="p-4 text-slate-600">
                                    {pro.categories.join(', ')}
                                </td>
                                <td className="p-4 text-slate-600">+{pro.phone}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${pro.status === 'active' ? 'bg-green-100 text-green-700' : pro.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {pro.status}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-600">
                                    {format(new Date(pro.created_at), "dd MMM yyyy", { locale: es })}
                                </td>
                                <td className="p-4">
                                    <Link href={`/professionals/${pro.id}`} className="text-blue-600 font-medium hover:text-blue-800 transition">
                                        Editar
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {data?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">No hay profesionales registrados</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
