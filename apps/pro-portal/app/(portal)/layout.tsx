'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Providers from '../../components/Providers';
import { LayoutDashboard, Briefcase, DollarSign, UserCog, LogOut } from 'lucide-react';
import Cookies from 'js-cookie';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navLinks = [
        { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
        { href: '/jobs', label: 'Trabajos', icon: Briefcase },
        { href: '/earnings', label: 'Ganancias', icon: DollarSign },
        { href: '/profile', label: 'Perfil', icon: UserCog },
    ];

    return (
        <Providers>
            <div className="flex min-h-screen bg-slate-50 flex-col md:flex-row pb-16 md:pb-0">
                {/* Mobile Bottom Nav */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-50 safe-area-bottom">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link key={link.href} href={link.href} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${isActive ? 'text-servy-600' : 'text-slate-500'}`}>
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-medium">{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Desktop Sidebar */}
                <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-2xl font-black text-servy-600 tracking-tighter">Servy Pro</h2>
                    </div>
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname.startsWith(link.href);
                            return (
                                <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${isActive ? 'bg-servy-50 text-servy-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    <Icon size={20} /> {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="p-4 border-t border-slate-100">
                        <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition font-medium" onClick={() => {
                            Cookies.remove('token');
                            window.location.href = '/login';
                        }}>
                            <LogOut size={20} /> Salir
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </Providers>
    );
}
