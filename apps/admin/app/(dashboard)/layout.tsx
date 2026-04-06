'use client';

import Link from 'next/link';
import Providers from '../../components/Providers';
import {
    Home,
    MessageCircle,
    Users,
    Briefcase,
    DollarSign,
    Settings,
    LogOut,
    Tag,
    MapPin,
    Star,
    HeartHandshake,
    Shield,
    TrendingUp,
    Megaphone,
    FlaskConical,
    ScrollText,
} from 'lucide-react';

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
                        <div className="pt-4 pb-1 text-xs uppercase tracking-wide text-slate-500 px-3">Agentes</div>
                        <Link href="/pricing" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <Tag size={20} /> Pricing
                        </Link>
                        <Link href="/operations-map" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <MapPin size={20} /> Operaciones
                        </Link>
                        <Link href="/quality" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <Star size={20} /> Calidad
                        </Link>
                        <Link href="/provider-retention" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <HeartHandshake size={20} /> Retención
                        </Link>
                        <Link href="/fraud" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <Shield size={20} /> Fraude
                        </Link>
                        <Link href="/forecast" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <TrendingUp size={20} /> Forecast
                        </Link>
                        <Link href="/recruitment" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <Megaphone size={20} /> Reclutamiento
                        </Link>
                        <Link href="/experiments" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <FlaskConical size={20} /> Experimentos
                        </Link>
                        <Link href="/agent-logs" className="flex items-center gap-3 px-3 py-2 rounded flex-1 hover:bg-slate-800 transition">
                            <ScrollText size={20} /> Logs agentes
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
