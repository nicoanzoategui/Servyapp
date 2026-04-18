'use client';

import { useEffect } from 'react';

export default function RegisterPage() {
    useEffect(() => {
        // Redirigir a la landing de técnicos donde está el form de registro
        window.location.href = 'https://servy.lat/profesionales';
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center">
                <div className="text-3xl font-black text-servy-600 tracking-tighter mb-4">
                    Servy.
                </div>
                <p className="text-slate-600 animate-pulse">Redirigiendo al formulario de registro...</p>
            </div>
        </div>
    );
}
