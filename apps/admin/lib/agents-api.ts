import Cookies from 'js-cookie';
import { API_URL } from './api';

export async function fetchAgentsApi(path: string): Promise<unknown> {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const j = (await res.json()) as { success?: boolean; data?: unknown; error?: string };
    if (!res.ok) throw new Error(j.error || 'Error al cargar datos');
    return j.data;
}
