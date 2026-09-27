'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { WA_LINK } from '@/lib/whatsapp';

const navItems = [
    { href: '#como-funciona', label: 'Cómo Funciona' },
    { href: '#categorias', label: 'Servicios' },
    { href: '/tecnicos', label: 'Soy técnico', internal: true },
];

function WhatsAppCta({ className }: { className?: string }) {
    return (
        <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
        >
            Hablar con Servy
        </a>
    );
}

export function SiteHeader() {
    const [open, setOpen] = useState(false);

    return (
        <header className="w-full bg-white/80 backdrop-blur fixed top-0 z-50 border-b border-slate-100">
            <div className="h-20 px-4 sm:px-6 md:px-12 flex items-center justify-between gap-3">
                <Link href="/" className="text-2xl font-bold text-[#0D4638] tracking-tighter shrink-0">
                    servy.
                </Link>

                <nav className="gap-6 hidden md:flex font-medium text-[#0D4638]/80 text-sm items-center">
                    {navItems.map((item) =>
                        item.internal ? (
                            <Link key={item.href} href={item.href} className="hover:text-[#A7E23C] transition">
                                {item.label}
                            </Link>
                        ) : (
                            <a key={item.href} href={item.href} className="hover:text-[#A7E23C] transition">
                                {item.label}
                            </a>
                        )
                    )}
                    <WhatsAppCta className="bg-[#A7E23C] text-[#0D4638] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#A7E23C]/90 transition" />
                </nav>

                <div className="flex md:hidden items-center gap-2">
                    <WhatsAppCta className="bg-[#A7E23C] text-[#0D4638] px-3 py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap hover:bg-[#A7E23C]/90 transition" />
                    <button
                        type="button"
                        className="p-2 rounded-lg text-[#0D4638] hover:bg-slate-100"
                        aria-expanded={open}
                        aria-controls="mobile-nav"
                        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                        onClick={() => setOpen((v) => !v)}
                    >
                        {open ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {open ? (
                <nav
                    id="mobile-nav"
                    className="md:hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2 flex flex-col gap-1"
                >
                    {navItems.map((item) =>
                        item.internal ? (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="py-3 px-2 font-medium text-[#0D4638] rounded-lg hover:bg-[#F2F9EF]"
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <a
                                key={item.href}
                                href={item.href}
                                className="py-3 px-2 font-medium text-[#0D4638] rounded-lg hover:bg-[#F2F9EF]"
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </a>
                        )
                    )}
                </nav>
            ) : null}
        </header>
    );
}
