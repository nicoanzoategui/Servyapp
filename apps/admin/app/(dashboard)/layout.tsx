'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
    Menu,
    X,
} from 'lucide-react';

const MAIN_LINKS = [
    { href: '/dashboard', label: 'Panel Principal', icon: Home },
    { href: '/conversations', label: 'Conversaciones', icon: MessageCircle },
    { href: '/professionals', label: 'Profesionales', icon: Users },
    { href: '/jobs', label: 'Trabajos', icon: Briefcase },
    { href: '/finance', label: 'Finanzas', icon: DollarSign },
    { href: '/settings', label: 'Configuración', icon: Settings },
];

const AGENT_LINKS = [
    { href: '/pricing', label: 'Pricing', icon: Tag },
    { href: '/operations-map', label: 'Operaciones', icon: MapPin },
    { href: '/quality', label: 'Calidad', icon: Star },
    { href: '/provider-retention', label: 'Retención', icon: HeartHandshake },
    { href: '/fraud', label: 'Fraude', icon: Shield },
    { href: '/forecast', label: 'Forecast', icon: TrendingUp },
    { href: '/recruitment', label: 'Reclutamiento', icon: Megaphone },
    { href: '/experiments', label: 'Experimentos', icon: FlaskConical },
    { href: '/agent-logs', label: 'Logs agentes', icon: ScrollText },
];

function logout() {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login';
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const linkClass = (href: string) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return `flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
            active ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-200'
        }`;
    };

    return (
        <>
            {MAIN_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                    <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={onNavigate}>
                        <Icon size={20} /> {link.label}
                    </Link>
                );
            })}
            <div className="pt-4 pb-1 text-xs uppercase tracking-wide text-slate-500 px-3">Agentes</div>
            {AGENT_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                    <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={onNavigate}>
                        <Icon size={20} /> {link.label}
                    </Link>
                );
            })}
        </>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    return (
        <Providers>
            <div className="flex min-h-screen bg-slate-100">
                <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shrink-0">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold">Servy Admin</h2>
                    </div>
                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        <NavLinks />
                    </nav>
                    <div className="p-4 border-t border-slate-700">
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-900/50 text-red-400 transition"
                            onClick={logout}
                        >
                            <LogOut size={20} /> Cerrar sesión
                        </button>
                    </div>
                </aside>

                {open && (
                    <div className="md:hidden fixed inset-0 z-50">
                        <button
                            type="button"
                            aria-label="Cerrar menú"
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setOpen(false)}
                        />
                        <aside className="relative h-full w-[min(20rem,86vw)] bg-slate-900 text-white flex flex-col shadow-2xl">
                            <div className="p-4 flex items-center justify-between border-b border-slate-800">
                                <h2 className="text-lg font-bold">Servy Admin</h2>
                                <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-800" aria-label="Cerrar">
                                    <X size={22} />
                                </button>
                            </div>
                            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                                <NavLinks onNavigate={() => setOpen(false)} />
                            </nav>
                            <div className="p-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-900/50 text-red-400"
                                    onClick={logout}
                                >
                                    <LogOut size={20} /> Cerrar sesión
                                </button>
                            </div>
                        </aside>
                    </div>
                )}

                <div className="flex-1 flex flex-col min-w-0">
                    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white">
                        <button type="button" onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-slate-800" aria-label="Abrir menú">
                            <Menu size={22} />
                        </button>
                        <span className="font-bold">Servy Admin</span>
                        <button type="button" onClick={logout} className="p-2 -mr-2 rounded-lg text-red-300 hover:bg-slate-800" aria-label="Salir">
                            <LogOut size={20} />
                        </button>
                    </header>
                    <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto w-full min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </Providers>
    );
}
