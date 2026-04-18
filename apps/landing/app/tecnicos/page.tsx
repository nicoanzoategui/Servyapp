import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, Clock, MessageCircle, ShieldCheck, Smartphone, Star, Wallet } from 'lucide-react';

const MAIN_ORIGIN = process.env.NEXT_PUBLIC_MAIN_ORIGIN || 'https://servy.lat';

export const metadata: Metadata = {
    title: 'Servy para técnicos | Trabajos de hogar por WhatsApp',
    description:
        'Recibí pedidos verificados de plomería, electricidad y más. Cotizá por WhatsApp, cobrá con respaldo y sumá clientes sin salir a buscarlos.',
    openGraph: {
        title: 'Servy para técnicos',
        description: 'Trabajos de hogar verificados, cotización y cobro claros. Unite a la red Servy.',
        url: `${MAIN_ORIGIN}/tecnicos`,
        siteName: 'Servy',
        locale: 'es_AR',
        type: 'website',
    },
};

export default function TecnicosPage() {
    return (
        <main className="flex min-h-screen flex-col items-center overflow-hidden">
            <header className="w-full h-20 flex items-center justify-between px-6 md:px-12 bg-white/80 backdrop-blur fixed top-0 z-50 border-b border-slate-100">
                <Link href="/" className="text-2xl font-black text-servy-600 tracking-tighter">
                    Servy.
                </Link>
                <nav className="gap-6 hidden md:flex font-medium text-slate-600 text-sm items-center">
                    <a href="#como-funciona" className="hover:text-servy-500 transition">
                        Cómo funciona
                    </a>
                    <a href="#beneficios" className="hover:text-servy-500 transition">
                        Beneficios
                    </a>
                    <a
                        href={MAIN_ORIGIN}
                        className="hover:text-servy-500 transition"
                        rel="noopener noreferrer"
                    >
                        Soy cliente
                    </a>
                    <Link
                        href="/profesionales"
                        className="bg-servy-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-servy-500 transition"
                    >
                        Registrarme
                    </Link>
                </nav>
                <Link
                    href="/profesionales"
                    className="md:hidden bg-servy-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-servy-500 transition"
                >
                    Registrarme
                </Link>
            </header>

            <section className="w-full pt-32 pb-20 px-6 md:px-12 bg-gradient-to-br from-servy-50 via-white to-servy-100/50 mt-10">
                <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-servy-700 animate-fade-in">
                        Para plomeros, electricistas, gasistas y más
                    </p>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl animate-slide-up">
                        Trabajos de hogar que llegan a tu{' '}
                        <span className="text-servy-600">WhatsApp</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl animate-fade-in delay-150">
                        Servy conecta clientes con urgencias y turnos programados. Vos cotizás, el cliente paga con respaldo y vos
                        enfocás en hacer bien el trabajo.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4 animate-slide-up delay-300">
                        <Link
                            href="/profesionales"
                            className="inline-flex items-center justify-center gap-2 bg-servy-600 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-servy-500/30 hover:shadow-2xl hover:bg-servy-500 hover:-translate-y-1 transition-all duration-300"
                        >
                            Quiero sumarme
                            <ArrowRight size={20} />
                        </Link>
                        <a
                            href={MAIN_ORIGIN}
                            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-slate-700 border border-slate-200 bg-white/80 hover:border-servy-300 hover:text-servy-700 transition"
                            rel="noopener noreferrer"
                        >
                            Ver experiencia cliente
                        </a>
                    </div>
                </div>
            </section>

            <section id="como-funciona" className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">Cómo es trabajar con Servy</h2>
                <p className="text-slate-600 text-center max-w-2xl mb-16">
                    Flujo pensado para que no pierdas tiempo en llamadas ni idas y vueltas de precio.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-servy-100 text-servy-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <MessageCircle size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">1. Te llega el pedido</h3>
                        <p className="text-slate-600">
                            Cliente describe el problema por WhatsApp. Vos recibís el contexto y la zona para decidir si aceptás.
                        </p>
                    </div>
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-servy-100 text-servy-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <Smartphone size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">2. Cotizás claro</h3>
                        <p className="text-slate-600">
                            Armás la cotización con alcance y precio. El cliente ve opciones cuando aplica (urgente vs programado).
                        </p>
                    </div>
                    <div className="relative p-8 rounded-3xl bg-servy-600 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex justify-center items-center mb-6">
                            <Wallet size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">3. Cobrás con orden</h3>
                        <p className="text-white/80">
                            El cliente confirma y paga por los canales de Servy. Vos tenés el trabajo acordado antes de salir.
                        </p>
                    </div>
                </div>
            </section>

            <section id="beneficios" className="w-full py-24 px-6 md:px-12 bg-slate-50 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">Por qué sumarse</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl w-full">
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <ShieldCheck className="text-servy-600 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Clientes verificados</h3>
                            <p className="text-slate-600">Menos vueltas: el pedido entra con datos y pago acordado según el flujo de Servy.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Clock className="text-servy-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Urgente y programado</h3>
                            <p className="text-slate-600">Podés ofrecer hoy o fecha convenida según tu disponibilidad real.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Briefcase className="text-servy-600 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Todo en un canal</h3>
                            <p className="text-slate-600">WhatsApp + portal para seguimiento: menos dispersión entre apps y chats sueltos.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Star className="text-yellow-400 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Reputación que suma</h3>
                            <p className="text-slate-600">Los clientes califican el trabajo. Hacerlo bien te posiciona para más pedidos.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="w-full py-24 px-6 md:px-12 bg-slate-900 text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-servy-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">¿Listo para recibir tu próximo trabajo?</h2>
                <p className="text-xl text-slate-300 max-w-2xl mb-10 relative z-10">
                    Dejanos tus datos y te contactamos para el alta, validación de perfil y categorías.
                </p>
                <Link
                    href="/profesionales"
                    className="relative z-10 bg-servy-500 hover:bg-servy-400 text-white px-8 py-4 rounded-full font-bold shadow-xl transition-all inline-flex items-center gap-2"
                >
                    Completar registro
                    <ArrowRight size={20} />
                </Link>
            </section>

            <footer className="w-full bg-slate-50 py-12 px-6 md:px-12 flex flex-col items-center border-t border-slate-200">
                <Link href="/" className="text-2xl font-black text-servy-600 tracking-tighter mb-6">
                    Servy.
                </Link>
                <div className="flex flex-wrap justify-center gap-6 text-slate-500 font-medium">
                    <Link href="/profesionales">Registro profesionales</Link>
                    <a href={MAIN_ORIGIN} rel="noopener noreferrer">
                        Sitio para hogares
                    </a>
                    <Link href="#">Términos y Condiciones</Link>
                    <Link href="#">Privacidad</Link>
                </div>
                <p className="text-slate-400 mt-8 text-sm">© {new Date().getFullYear()} Servy. Todos los derechos reservados.</p>
            </footer>
        </main>
    );
}
