'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { API_URL } from '@/lib/api';

type UserRow = {
    id: string;
    phone: string;
    name: string | null;
    last_name: string | null;
    status: 'active' | 'inactive';
    onboarding_completed: boolean;
    last_active_at: string;
    created_at: string;
};

const fetchUsers = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching data');
    return data.data as UserRow[];
};

export default function UsersPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: fetchUsers,
    });

    if (isLoading) return <div className="text-slate-500">Cargando usuarios...</div>;

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Usuarios</h1>
                <Link href="/users/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
                    + Nuevo usuario
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="p-4 font-medium">Nombre</th>
                            <th className="p-4 font-medium">Teléfono</th>
                            <th className="p-4 font-medium">Estado</th>
                            <th className="p-4 font-medium">Alta</th>
                            <th className="p-4 font-medium">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data || []).map((u) => (
                            <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="p-4 font-medium text-slate-900">
                                    {`${u.name || ''} ${u.last_name || ''}`.trim() || 'Sin nombre'}
                                </td>
                                <td className="p-4 text-slate-600">+{u.phone}</td>
                                <td className="p-4">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        {u.status === 'active' ? 'activo' : 'inactivo'}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-600">
                                    {format(new Date(u.created_at), 'dd MMM yyyy', { locale: es })}
                                </td>
                                <td className="p-4">
                                    <Link href={`/users/${u.id}`} className="text-blue-600 font-medium hover:text-blue-800">
                                        Editar
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {data?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    No hay usuarios registrados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
