import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, Link2, MessageCircle, Smartphone, Star, Wallet } from 'lucide-react';

const MAIN_ORIGIN = process.env.NEXT_PUBLIC_MAIN_ORIGIN || 'https://servy.lat';

/** Mismo número / enlace que “Hablar con Servy” en `app/page.tsx`. */
const NEXT_PUBLIC_WA_NUMBER = (process.env.NEXT_PUBLIC_WA_NUMBER || '16206474920').replace(/\D/g, '');
const WA_LINK = `https://wa.me/${NEXT_PUBLIC_WA_NUMBER}?text=Hola,%20necesito%20ayuda`;

export const metadata: Metadata = {
    title: 'Servy para técnicos | Trabajos directos a tu WhatsApp',
    description:
        'Dejá de perder tiempo y nafta. Visitas de diagnóstico cobradas, cuotas para tus clientes y cobro seguro con QR. Sumate por WhatsApp.',
    openGraph: {
        title: 'Servy para técnicos',
        description: 'El fin de los presupuestos gratis. Trabajos directos a tu WhatsApp.',
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
                    <a href={MAIN_ORIGIN} className="hover:text-blue-500 transition" rel="noopener noreferrer">
                        Soy cliente
                    </a>
                    <a
                        href={WA_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-500 transition"
                    >
                        Registrarme
                    </a>
                </nav>
                <a
                    href={WA_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="md:hidden bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-500 transition"
                >
                    Registrarme
                </a>
            </header>

            <section className="w-full pt-32 pb-20 px-6 md:px-12 bg-gradient-to-br from-blue-50 via-white to-blue-100/50 mt-10">
                <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-8">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl animate-slide-up">
                        El fin de los presupuestos gratis. Trabajos directos a tu{' '}
                        <span className="text-blue-600">WhatsApp</span>.
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl animate-fade-in delay-150">
                        Dejá de perder tiempo y nafta. En Servy cobrás la visita de diagnóstico asegurada, le damos cuotas a tus clientes y vos cobrás en el acto. Cero riesgo, cero fiado.
                    </p>
                    <div className="flex justify-center mt-4 animate-slide-up delay-300">
                        <a
                            href={WA_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:bg-blue-500 hover:-translate-y-1 transition-all duration-300"
                        >
                            👉 Quiero sumarme por WhatsApp
                            <ArrowRight size={20} />
                        </a>
                    </div>
                </div>
            </section>

            <section className="w-full py-16 px-6 md:px-12 bg-slate-50 border-y border-slate-200">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-4xl font-bold text-slate-900 text-center mb-12">
                        🛑 LOS DOLORES (¿Te suena conocido?)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">❌</span>
                            <p className="text-slate-700 leading-relaxed">
                                &quot;Pierdo dos horas yendo a pasar un presupuesto y el cliente me dice que le parece caro.&quot;
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">❌</span>
                            <p className="text-slate-700 leading-relaxed">
                                &quot;Termino el trabajo y me salen con un &apos;te transfiero la semana que viene&apos;.&quot;
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">❌</span>
                            <p className="text-slate-700 leading-relaxed">
                                &quot;Me llaman para una urgencia, dejo lo que estoy haciendo, y cuando llego ya llamaron a otro.&quot;
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">❌</span>
                            <p className="text-slate-700 leading-relaxed">
                                &quot;Publico en Facebook y solo me llegan clientes que buscan al más barato.&quot;
                            </p>
                        </div>
                    </div>
                    <p className="text-center text-xl font-semibold text-blue-600 mt-12">Con Servy, eso se terminó.</p>
                </div>
            </section>

            <section id="como-funciona" className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">
                    ⚙️ CÓMO ES TRABAJAR CON SERVY (El Nuevo Flujo)
                </h2>
                <p className="text-slate-600 text-center max-w-2xl mb-16">
                    Pensado para que te enfoques en tu oficio, no en perseguir pagos.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <MessageCircle size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">1. Te llega la alerta al celular</h3>
                        <p className="text-slate-600">
                            Recibís pedidos por WhatsApp en tu zona. Podés recibir trabajos Programados (Visita de $35.000) o Urgencias (Visita exprés de $50.000). Si estás disponible, tocás aceptar y es tuyo.
                        </p>
                    </div>
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <Smartphone size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">2. Presupuestás in situ (con la visita ya cobrada)</h3>
                        <p className="text-slate-600">
                            Llegás a la casa del cliente sabiendo que tu tiempo ya está pago. Evaluás el problema y le pasás el precio del arreglo ahí mismo. ¿El arreglo es caro? No importa, nosotros le damos hasta 3 cuotas al cliente.
                        </p>
                    </div>
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <Wallet size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">3. Cobrás seguro con Código QR</h3>
                        <p className="text-slate-600">
                            El cliente aprueba el arreglo y Servy retiene el dinero para tu tranquilidad. Cuando terminás, el cliente escanea tu Código QR y la plata se libera automáticamente a tu billetera virtual. Nada de &quot;te pago después&quot;.
                        </p>
                    </div>
                </div>
            </section>

            <section className="w-full py-24 px-6 md:px-12 bg-gradient-to-br from-blue-50 to-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">
                        🧮 CALCULÁ CUÁNTO GANÁS (Simulador actualizado)
                    </h2>
                    <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
                        Sin costo de alta. Sin mensualidad. La comisión más baja del mercado.
                    </p>

                    <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-200">
                        <p className="text-sm font-semibold text-slate-700 mb-6">Ejemplo de un Trabajo Estándar:</p>
                        <div className="space-y-4 mb-8 text-slate-700 leading-relaxed">
                            <p>
                                💵 Visita de Diagnóstico ($35.000): Te llevás <strong>$29.750</strong> limpios (15% comisión Servy).
                            </p>
                            <p>
                                🔧 Arreglo en Domicilio (Ej: $100.000): Te llevás <strong>$95.000</strong> limpios. ¡La comisión promocional por el arreglo es de solo el 5%!
                            </p>
                            <p className="text-xl font-black text-blue-600 pt-2">
                                💰 Total en tu bolsillo: $124.750 por un solo trabajo.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm border-t border-slate-200 pt-8">
                            <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-green-500 text-lg">✓</span>
                                Sin costo de alta
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-green-500 text-lg">✓</span>
                                Sin contraseñas que acordarte
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-green-500 text-lg">✓</span>
                                Retirá tu plata cuando quieras
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="w-full py-24 px-6 md:px-12 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">
                        💻 TU PORTAL PROFESIONAL (pro.servy.lat)
                    </h2>
                    <p className="text-slate-600 text-center mb-16 max-w-2xl mx-auto">
                        Manejá tu negocio desde el celular, sin bajar aplicaciones.
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
                                <Link2 className="text-blue-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Ingreso con Link Mágico</h3>
                            <p className="text-sm text-slate-600">
                                Olvidate de las contraseñas. Te mandamos un link por WhatsApp y entrás directo a tu cuenta.
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Wallet className="text-blue-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Billetera en Tiempo Real</h3>
                            <p className="text-sm text-slate-600">Mirá tu saldo acumulado y pasátelo a tu CBU/CVU con un clic.</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Briefcase className="text-blue-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Tus trabajos activos</h3>
                            <p className="text-sm text-slate-600">Seguí el historial de tus servicios y lo que facturaste en el mes.</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Star className="text-blue-600" size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Reputación que vale</h3>
                            <p className="text-sm text-slate-600">
                                Las buenas calificaciones de tus clientes te posicionan primero para recibir los trabajos más caros.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="w-full py-24 px-6 md:px-12 bg-slate-50">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">
                    🗣️ LO QUE DICEN LOS TÉCNICOS DE LA RED
                </h2>
                <p className="text-slate-600 text-center text-lg mb-16 max-w-2xl mx-auto">
                    Más de 150 profesionales ya cambiaron su forma de trabajar.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-1 mb-4">
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                        </div>
                        <p className="text-slate-700 mb-6 leading-relaxed">
                            &quot;Antes perdía 3 horas por día pasando presupuestos que quedaban en la nada. Ahora, si voy a ver un caño roto, sé que por lo menos los $35.000 de la visita ya los tengo en el bolsillo.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                J
                            </div>
                            <div>
                                <p className="font-bold text-sm">Juan Pérez</p>
                                <p className="text-slate-500 text-xs">Plomero, Zona Norte</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-1 mb-4">
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                        </div>
                        <p className="text-slate-700 mb-6 leading-relaxed">
                            &quot;Lo que me cambió la vida es poder ofrecerle cuotas a la gente. Le pasé 150 lucas por rehacer un tablero, el cliente lo pagó en 3 cuotas con la app, y yo cobré todo junto al terminar con el QR. Un lujo.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                M
                            </div>
                            <div>
                                <p className="font-bold text-sm">María González</p>
                                <p className="text-slate-500 text-xs">Electricista</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-1 mb-4">
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-yellow-400 text-yellow-400" size={18} />
                            <Star className="fill-slate-300 text-slate-300" size={18} />
                        </div>
                        <p className="text-slate-700 mb-6 leading-relaxed">
                            &quot;Odio bajarme aplicaciones nuevas. Con Servy me entra el aviso al WhatsApp, toco que voy, y cuando termino escanean mi código. Más simple imposible.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                C
                            </div>
                            <div>
                                <p className="font-bold text-sm">Carlos Méndez</p>
                                <p className="text-slate-500 text-xs">Gasista</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="beneficios" className="w-full py-24 px-6 md:px-12 bg-slate-50 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">Por qué sumarse</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl w-full">
                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Wallet className="text-blue-600 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Cobrás antes de salir</h3>
                            <p className="text-slate-600">
                                El cliente paga cuando acepta tu presupuesto. Cuando llegás a la casa, el dinero ya está. Cero riesgo de que no te paguen.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <MessageCircle className="text-blue-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Solo presupuestos serios</h3>
                            <p className="text-slate-600">
                                No más perder tiempo en consultas de precio. Si te llega un pedido, es porque el cliente ya vio tu perfil y está listo para contratar.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Smartphone className="text-blue-600 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Todo en WhatsApp + portal</h3>
                            <p className="text-slate-600">
                                Recibís pedidos por WhatsApp, cotizás desde ahí mismo y seguís el estado en el portal. No necesitás estar en 5 redes sociales publicando.
                            </p>
                        </div>
                    </div>

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

            <section className="w-full py-24 px-6 md:px-12 bg-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">🚀 CÓMO EMPEZAR HOY MISMO</h2>
                    <p className="text-slate-600 text-center max-w-2xl mx-auto mb-16">
                        El alta es automática y demora 2 minutos.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="relative">
                            <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 h-full flex flex-col">
                                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl mb-6">
                                    1
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-slate-900">Escribile a nuestro Bot</h3>
                                <p className="text-slate-600 mb-4 grow">
                                    Hacé clic en el botón, contanos de qué trabajás y en qué zona te movés. Todo por WhatsApp.
                                </p>
                                <p className="text-sm text-slate-500 italic">Sin costo de alta</p>
                            </div>
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <ArrowRight className="text-blue-300" size={32} />
                            </div>
                        </div>

                        <div className="relative">
                            <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 h-full flex flex-col">
                                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl mb-6">
                                    2
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-slate-900">Validá tu Perfil</h3>
                                <p className="text-slate-600 mb-4 grow">
                                    Mandá la foto de tu DNI por chat y completá tu CBU y seguros en nuestro portal seguro.
                                </p>
                                <p className="text-sm text-slate-500 italic">Todos los técnicos pasan verificación</p>
                            </div>
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <ArrowRight className="text-blue-300" size={32} />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl text-white shadow-xl h-full flex flex-col">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-black text-xl mb-6">
                                3
                            </div>
                            <h3 className="text-xl font-bold mb-3">Prepará las herramientas</h3>
                            <p className="text-white/90 mb-4 grow">
                                Apenas el equipo apruebe tus documentos (24-48hs), te empiezan a llover las alertas de trabajos en tu zona.
                            </p>
                            <p className="text-sm text-blue-100 italic">Sin permanencia mínima</p>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-6 text-center">
                        <a
                            href={WA_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-500 hover:-translate-y-1 transition-all duration-300"
                        >
                            Completar registro por WhatsApp
                            <ArrowRight size={20} />
                        </a>
                        <p className="text-slate-600 text-lg max-w-2xl">
                            <span className="font-semibold text-slate-900">Sin costo de alta.</span> Sin mensualidad. Sin permanencia mínima.
                        </p>
                    </div>
                </div>
            </section>

            <section className="w-full py-24 px-6 md:px-12 bg-slate-900 text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">¿Listo para recibir tu próximo trabajo?</h2>
                <p className="text-xl text-slate-300 max-w-2xl mb-10 relative z-10">
                    Escribinos por WhatsApp y arrancá el alta en minutos.
                </p>
                <a
                    href={WA_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-10 bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-full font-bold shadow-xl transition-all inline-flex items-center gap-2"
                >
                    Completar registro por WhatsApp
                    <ArrowRight size={20} />
                </a>
            </section>

            <footer className="w-full bg-slate-50 py-12 px-6 md:px-12 flex flex-col items-center border-t border-slate-200">
                <Link href="/" className="text-2xl font-black text-blue-600 tracking-tighter mb-6">
                    Servy.
                </Link>
                <div className="flex flex-wrap justify-center gap-6 text-slate-500 font-medium">
                    <a href={WA_LINK} target="_blank" rel="noopener noreferrer">
                        Registro profesionales
                    </a>
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
