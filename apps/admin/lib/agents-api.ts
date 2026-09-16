import Cookies from 'js-cookie';
import { API_URL } from './api';

export async function fetchAgentsApi(path: string): Promise<unknown> {
    const token = Cookies.get('token');
    let res: Response;
    try {
        res = await fetch(`${API_URL}${path}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch {
        throw new Error(`No se pudo conectar con la API (${API_URL})`);
    }

    let j: { success?: boolean; data?: unknown; error?: string } = {};
    try {
        j = (await res.json()) as { success?: boolean; data?: unknown; error?: string };
    } catch {
        throw new Error(`La API no respondió JSON (${res.status})`);
    }

    if (!res.ok) {
        const err = typeof j.error === 'string' ? j.error : `Error ${res.status}`;
        if (res.status === 500 && /does not exist|42P01|relation /i.test(err)) {
            return [];
        }
        throw new Error(err);
    }
    return j.data ?? [];
}
