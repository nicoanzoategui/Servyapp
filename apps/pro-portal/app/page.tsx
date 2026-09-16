import { redirect } from 'next/navigation';

/** La raíz no tiene layout de portal; el middleware ya manda sin token a /login. */
export default function ProHomePage() {
    redirect('/dashboard');
}
