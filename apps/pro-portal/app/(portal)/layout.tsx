'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Providers from '../../components/Providers';
import { LayoutDashboard, Briefcase, DollarSign, UserCog, LogOut } from 'lucide-react';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const token = Cookies.get('token');
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/professional/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (cancelled || !json?.data) return;
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pathname]);

    const navLinks = [
        { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
        { href: '/jobs', label: 'Trabajos', icon: Briefcase },
        { href: '/earnings', label: 'Ganancias', icon: DollarSign },
        { href: '/profile', label: 'Perfil', icon: UserCog },
    ];

    const logout = () => {
        Cookies.remove('token');
        window.location.href = '/login';
    };

    return (
        <Providers>
            <div className="flex min-h-screen bg-slate-50 flex-col md:flex-row pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
                <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
                    <span className="text-xl font-black text-servy-600 tracking-tighter">Servy Pro</span>
                    <button
                        type="button"
                        onClick={logout}
                        className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                        aria-label="Salir"
                    >
                        <LogOut size={20} />
                    </button>
                </header>

                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex flex-col items-center gap-0.5 min-w-[4.25rem] p-2 rounded-xl transition ${
                                    isActive ? 'text-servy-600' : 'text-slate-500'
                                }`}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-medium">{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-2xl font-black text-servy-600 tracking-tighter">Servy Pro</h2>
                    </div>
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                                        isActive ? 'bg-servy-50 text-servy-600' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon size={20} /> {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="p-4 border-t border-slate-100">
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition font-medium"
                            onClick={logout}
                        >
                            <LogOut size={20} /> Salir
                        </button>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto min-w-0">{children}</main>
            </div>
        </Providers>
    );
}
