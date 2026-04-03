import { redirect } from 'next/navigation';

/** La raíz no tiene layout de dashboard; el middleware ya manda sin token a /login. */
export default function AdminHomePage() {
    redirect('/dashboard');
}
