import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/** Raíz: el middleware ya redirige sin token; esto cubre sesión activa (evita 404 en `/`). */
export default function ProHomePage() {
    const token = cookies().get('token')?.value;
    if (token) redirect('/dashboard');
    redirect('/login');
}
