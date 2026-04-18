import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, Clock, MessageCircle, Smartphone, Star, Wallet } from 'lucide-react';
import TecnicosGananciasCalculator from './TecnicosGananciasCalculator';

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
                <Link href="/" className="text-2xl font-black text-blue-600 tracking-tighter">
                    Servy.
                </Link>
                <nav className="gap-6 hidden md:flex font-medium text-slate-600 text-sm items-center">
                    <a href="#como-funciona" className="hover:text-blue-500 transition">
                        Cómo funciona
                    </a>
                    <a href="#beneficios" className="hover:text-blue-500 transition">
                        Beneficios
                    </a>
                    <a
                        href={MAIN_ORIGIN}
                        className="hover:text-blue-500 transition"
                        rel="noopener noreferrer"
                    >
                        Soy cliente
                    </a>
                    <Link
                        href="/profesionales"
                        className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-500 transition"
                    >
                        Registrarme
                    </Link>
                </nav>
                <Link
                    href="/profesionales"
                    className="md:hidden bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-500 transition"
                >
                    Registrarme
                </Link>
            </header>

            <section className="w-full pt-32 pb-20 px-6 md:px-12 bg-gradient-to-br from-blue-50 via-white to-blue-100/50 mt-10">
                <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 animate-fade-in">
                        Para plomeros, electricistas, gasistas y más
                    </p>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl animate-slide-up">
                        Trabajos de hogar que llegan a tu{' '}
                        <span className="text-blue-600">WhatsApp</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl animate-fade-in delay-150">
                        Dejá de buscar clientes en Facebook. Dejá de perseguir pagos. Recibí trabajos verificados, cobrá antes de salir y
                        enfocate en lo que sabés hacer.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4 animate-slide-up delay-300">
                        <Link
                            href="/profesionales"
                            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:bg-blue-500 hover:-translate-y-1 transition-all duration-300"
                        >
                            Quiero sumarme
                            <ArrowRight size={20} />
                        </Link>
                        <a
                            href={MAIN_ORIGIN}
                            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-slate-700 border border-slate-200 bg-white/80 hover:border-blue-300 hover:text-blue-700 transition"
                            rel="noopener noreferrer"
                        >
                            Ver experiencia cliente
                        </a>
                    </div>
                </div>
            </section>

            {/* Dolores del técnico */}
            <section className="w-full py-16 px-6 md:px-12 bg-slate-50 border-y border-slate-200">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-4xl font-bold text-slate-900 text-center mb-12">
                        ¿Te suena conocido?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">❌</span>
                            <p className="text-slate-700 leading-relaxed">
                                &quot;Hago el presupuesto, voy hasta allá y el cliente dice que es mucho&quot;
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">❌</span>
                            <p className="text-slate-700 leading-relaxed">
                                &quot;Termino el trabajo y el cliente dice &apos;te pago la semana que viene&apos;&quot;
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">❌</span>
                            <p className="text-slate-700 leading-relaxed">
                                &quot;Me llaman de urgencia y después cancelan sin avisar&quot;
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">❌</span>
                            <p className="text-slate-700 leading-relaxed">
                                &quot;Publico en Facebook y solo llegan clientes que buscan el más barato&quot;
                            </p>
                        </div>
                    </div>
                    <p className="text-center text-xl font-semibold text-blue-600 mt-12">
                        Con Servy, eso no pasa.
                    </p>
                </div>
            </section>

            <section id="como-funciona" className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">Cómo es trabajar con Servy</h2>
                <p className="text-slate-600 text-center max-w-2xl mb-16">
                    Flujo pensado para que no pierdas tiempo en llamadas ni idas y vueltas de precio.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <MessageCircle size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">1. Te llega el pedido</h3>
                        <p className="text-slate-600">
                            Cliente describe el problema por WhatsApp. Vos recibís el contexto y la zona para decidir si aceptás.
                        </p>
                    </div>
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <Smartphone size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">2. Cotizás claro</h3>
                        <p className="text-slate-600">
                            Armás la cotización con alcance y precio. El cliente ve opciones cuando aplica (urgente vs programado).
                        </p>
                    </div>
                    <div className="relative p-8 rounded-3xl bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex justify-center items-center mb-6">
                            <Wallet size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">3. Cobrás seguro, siempre</h3>
                        <p className="text-white/80">
                            El cliente paga ANTES de que salgas de tu casa. El dinero queda retenido y se te libera cuando terminás el trabajo. No más
                            &quot;te pago después&quot; ni vueltas.
                        </p>
                    </div>
                </div>
            </section>

            {/* Calculadora de ganancias */}
            <section className="w-full py-24 px-6 md:px-12 bg-gradient-to-br from-blue-50 to-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">
                        Calculá cuánto ganás con Servy
                    </h2>
                    <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
                        Sin costo de alta. Sin mensualidad. Solo cobramos cuando vos cobrás.
                    </p>

                    <TecnicosGananciasCalculator />
                </div>
            </section>

            {/* Portal profesional */}
            <section className="w-full py-24 px-6 md:px-12 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">
                        Tu portal profesional
                    </h2>
                    <p className="text-slate-600 text-center mb-16 max-w-2xl mx-auto">
                        Manejá todos tus trabajos desde un solo lugar. Simple, claro y siempre actualizado.
                    </p>

                    <div className="bg-gradient-to-br from-slate-50 to-white p-4 md:p-8 rounded-3xl border border-slate-200 shadow-xl">
                        <img
                            src="/portal-screenshot.png"
                            alt="Portal profesional Servy"
                            className="w-full rounded-2xl shadow-2xl border border-slate-200"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Wallet className="text-blue-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Ganancias en tiempo real</h3>
                            <p className="text-sm text-slate-600">Ves cuánto ganaste este mes actualizado al instante</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Briefcase className="text-blue-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Tus trabajos activos</h3>
                            <p className="text-sm text-slate-600">Seguí el estado de cada pedido en un solo lugar</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Star className="text-blue-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Calificación y reviews</h3>
                            <p className="text-sm text-slate-600">Mirá qué dicen tus clientes y mejorá tu perfil</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Clock className="text-blue-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Disponibilidad</h3>
                            <p className="text-sm text-slate-600">Actualizá cuándo podés recibir pedidos</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonios */}
            <section className="w-full py-24 px-6 md:px-12 bg-slate-50">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">
                    Lo que dicen los técnicos que ya están en Servy
                </h2>
                <p className="text-slate-600 text-center text-lg mb-16 max-w-2xl mx-auto">
                    Más de 150 profesionales trabajando con Servy
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Testimonio 1 */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-1 mb-4">
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                        </div>
                        <p className="text-slate-700 mb-6 leading-relaxed">
                            &quot;Antes perdía 2-3 horas por día en presupuestos que no cerraban. Con Servy, si me llega el pedido es porque el cliente ya está listo para contratar.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                J
                            </div>
                            <div>
                                <p className="font-bold text-sm">Juan Pérez</p>
                                <p className="text-slate-500 text-xs">Plomero · Palermo</p>
                            </div>
                        </div>
                    </div>

                    {/* Testimonio 2 */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-1 mb-4">
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                        </div>
                        <p className="text-slate-700 mb-6 leading-relaxed">
                            &quot;Lo mejor es que cobro antes de salir. Ya no me como más el &apos;ahora no tengo efectivo&apos; o &apos;te deposito mañana&apos;. Es un alivio.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                M
                            </div>
                            <div>
                                <p className="font-bold text-sm">María González</p>
                                <p className="text-slate-500 text-xs">Electricista · Caballito</p>
                            </div>
                        </div>
                    </div>

                    {/* Testimonio 3 */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-1 mb-4">
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-slate-300 text-slate-300" size={18} />
                        </div>
                        <p className="text-slate-700 mb-6 leading-relaxed">
                            &quot;En 2 meses conseguí más clientes fijos que en todo el año pasado publicando en grupos de Facebook. Y sin competir solo por precio.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                C
                            </div>
                            <div>
                                <p className="font-bold text-sm">Carlos Méndez</p>
                                <p className="text-slate-500 text-xs">Gasista · Belgrano</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="beneficios" className="w-full py-24 px-6 md:px-12 bg-slate-50 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">Por qué sumarse</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl w-full">
                    {/* Beneficio 1 */}
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Wallet className="text-blue-600 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Cobrás antes de salir</h3>
                            <p className="text-slate-600">
                                El cliente paga cuando acepta tu presupuesto. Cuando llegás a la casa, el dinero ya está. Cero riesgo de que no te paguen.
                            </p>
                        </div>
                    </div>

                    {/* Beneficio 2 */}
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <MessageCircle className="text-blue-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Solo presupuestos serios</h3>
                            <p className="text-slate-600">
                                No más perder tiempo en consultas de precio. Si te llega un pedido, es porque el cliente ya vio tu perfil y está listo para contratar.
                            </p>
                        </div>
                    </div>

                    {/* Beneficio 3 */}
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Smartphone className="text-blue-600 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Todo en WhatsApp + portal</h3>
                            <p className="text-slate-600">
                                Recibís pedidos por WhatsApp, cotizás desde ahí mismo y seguís el estado en el portal. No necesitás estar en 5 redes sociales publicando.
                            </p>
                        </div>
                    </div>

                    {/* Beneficio 4 */}
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Star className="text-yellow-400 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Tu reputación crece sola</h3>
                            <p className="text-slate-600">
                                Los clientes califican cada trabajo. Mientras mejor labures, más pedidos te llegan. No competís solo por precio.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Cómo empezar */}
            <section className="w-full py-24 px-6 md:px-12 bg-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">
                        Cómo empezar
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Paso 1 */}
                        <div className="relative">
                            <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 h-full flex flex-col">
                                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl mb-6">
                                    1
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-slate-900">Completás el formulario</h3>
                                <p className="text-slate-600 mb-4 grow">
                                    Nombre, categoría (plomero, electricista, etc.), zona de trabajo y experiencia. Te toma 2 minutos.
                                </p>
                                <p className="text-sm text-slate-500 italic">Sin costo de alta</p>
                            </div>
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <ArrowRight className="text-blue-300" size={32} />
                            </div>
                        </div>

                        {/* Paso 2 */}
                        <div className="relative">
                            <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 h-full flex flex-col">
                                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl mb-6">
                                    2
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-slate-900">Validamos tu perfil</h3>
                                <p className="text-slate-600 mb-4 grow">
                                    Chequeamos antecedentes, experiencia y documentación. Este paso toma 24-48 horas.
                                </p>
                                <p className="text-sm text-slate-500 italic">Todos los técnicos pasan verificación</p>
                            </div>
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <ArrowRight className="text-blue-300" size={32} />
                            </div>
                        </div>

                        {/* Paso 3 */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl text-white shadow-xl h-full flex flex-col">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-black text-xl mb-6">
                                3
                            </div>
                            <h3 className="text-xl font-bold mb-3">Empezás a recibir pedidos</h3>
                            <p className="text-white/90 mb-4 grow">
                                Te llegan por WhatsApp cuando hay trabajos en tu zona y categoría. Cotizás y empezás a trabajar.
                            </p>
                            <p className="text-sm text-blue-100 italic">Sin permanencia mínima</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-slate-600 text-lg">
                            <span className="font-semibold text-slate-900">Sin costo de alta.</span> Sin mensualidad. Sin permanencia mínima.
                        </p>
                    </div>
                </div>
            </section>

            <section className="w-full py-24 px-6 md:px-12 bg-slate-900 text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">¿Listo para recibir tu próximo trabajo?</h2>
                <p className="text-xl text-slate-300 max-w-2xl mb-10 relative z-10">
                    Dejanos tus datos y te contactamos para el alta, validación de perfil y categorías.
                </p>
                <Link
                    href="/profesionales"
                    className="relative z-10 bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-full font-bold shadow-xl transition-all inline-flex items-center gap-2"
                >
                    Completar registro
                    <ArrowRight size={20} />
                </Link>
            </section>

            <footer className="w-full bg-slate-50 py-12 px-6 md:px-12 flex flex-col items-center border-t border-slate-200">
                <Link href="/" className="text-2xl font-black text-blue-600 tracking-tighter mb-6">
                    Servy.
                </Link>
                <div className="flex flex-wrap justify-center gap-6 text-slate-500 font-medium">
                    <Link href="/profesionales">Registro profesionales</Link>
                    <a href={MAIN_ORIGIN} rel="noopener noreferrer">
                        Sitio para hogares
                    </a>
                    <Link href="/terminos">Términos y Condiciones</Link>
                    <Link href="/privacidad">Privacidad</Link>
                </div>
                <p className="text-slate-400 mt-8 text-sm">© {new Date().getFullYear()} Servy. Todos los derechos reservados.</p>
            </footer>
        </main>
    );
}
