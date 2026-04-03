'use client';

import Link from 'next/link';
import Providers from '../../components/Providers';
import { Home, MessageCircle, Users, Briefcase, DollarSign, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <div className="flex min-h-screen bg-slate-100">
                {/* Sidebar */}
                <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold">Servy Admin</h2>
                    </div>
                    <nav className="flex-1 px-4 py-4 space-y-2">
                        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <Home size={20} /> Panel Principal
                        </Link>
                        <Link href="/conversations" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <MessageCircle size={20} /> Conversaciones
                        </Link>
                        <Link href="/professionals" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <Users size={20} /> Profesionales
                        </Link>
                        <Link href="/jobs" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <Briefcase size={20} /> Trabajos
                        </Link>
                        <Link href="/finance" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <DollarSign size={20} /> Finanzas
                        </Link>
                        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <Settings size={20} /> Configuración
                        </Link>
                    </nav>
                    <div className="p-4 border-t border-slate-700">
                        <button className="flex w-full items-center gap-3 px-3 py-2 rounded hover:bg-red-900/50 text-red-400 transition" onClick={() => {
                            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                            window.location.href = '/login';
                        }}>
                            <LogOut size={20} /> Cerrar Sesión
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col p-8 overflow-y-auto w-full">
                    {children}
                </main>
            </div>
        </Providers>
    );
}
