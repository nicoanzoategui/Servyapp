import Link from 'next/link';
import { Wrench, Zap, Key, ShieldCheck, Clock, Star, HeartHandshake, Flame, Wind } from 'lucide-react';

const NEXT_PUBLIC_WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || '5491100000000';
const WA_LINK = `https://wa.me/${NEXT_PUBLIC_WA_NUMBER}?text=Hola,%20necesito%20ayuda`;

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center overflow-hidden">
            {/* Navbar Minimalista */}
            <header className="w-full h-20 flex items-center justify-between px-6 md:px-12 bg-white/80 backdrop-blur fixed top-0 z-50 border-b border-slate-100">
                <div className="text-2xl font-black text-servy-600 tracking-tighter">Servy.</div>
                <nav className="gap-6 hidden md:flex font-medium text-slate-600 text-sm">
                    <a href="#como-funciona" className="hover:text-servy-500 transition">Cómo Funciona</a>
                    <a href="#categorias" className="hover:text-servy-500 transition">Servicios</a>
                    <Link href="/profesionales" className="hover:text-servy-500 transition">Soy Profesional</Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="w-full pt-32 pb-20 px-6 md:px-12 bg-gradient-to-br from-servy-50 via-white to-servy-100/50 mt-10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                    {/* Texto */}
                    <div className="flex-1 flex flex-col items-start text-left">
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-xl animate-slide-up">
                            Arreglá tu hogar en minutos.{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-servy-500 to-servy-700">
                                Por WhatsApp.
                            </span>
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-lg animate-fade-in delay-150">
                            Describí el problema de tu hogar por WhatsApp y en minutos tenés un profesional verificado camino a tu casa. Sin apps, sin llamadas, sin vueltas.
                        </p>
                        <div className="mt-10 animate-slide-up delay-300">
                            <a
                                href={WA_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-servy-600 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-servy-500/30 hover:shadow-2xl hover:bg-servy-500 hover:-translate-y-1 transition-all duration-300"
                            >
                                Hablar con Servy
                            </a>
                        </div>
                    </div>

                    {/* iPhone Mockup */}
                    <div className="shrink-0 hidden md:flex justify-center items-center">
                        <div className="relative w-[272px]">
                            {/* Cuerpo iPhone */}
                            <div
                                className="bg-[#1a1a1a] rounded-[44px] p-[14px] shadow-2xl"
                                style={{ boxShadow: '0 0 0 2px #3a3a3a, 0 30px 80px rgba(0,0,0,0.35)' }}
                            >
                                {/* Botones laterales izquierda */}
                                <div className="absolute left-[-3px] top-[80px] w-[3px] h-[28px] bg-[#2a2a2a] rounded-l-sm"></div>
                                <div className="absolute left-[-3px] top-[118px] w-[3px] h-[44px] bg-[#2a2a2a] rounded-l-sm"></div>
                                <div className="absolute left-[-3px] top-[172px] w-[3px] h-[44px] bg-[#2a2a2a] rounded-l-sm"></div>
                                {/* Botón derecha */}
                                <div className="absolute right-[-3px] top-[130px] w-[3px] h-[64px] bg-[#2a2a2a] rounded-r-sm"></div>

                                {/* Pantalla */}
                                <div className="bg-white rounded-[32px] overflow-hidden">
                                    {/* Status bar */}
                                    <div className="bg-[#075E54] px-5 pt-2 pb-0 flex justify-between items-start">
                                        <span className="text-white text-[11px] font-bold pt-1">9:41</span>
                                        <div className="w-[80px] h-[20px] bg-[#1a1a1a] rounded-b-[12px]"></div>
                                        <div className="flex gap-1 items-center pt-1">
                                            <div className="flex gap-[1px] items-end">
                                                <div className="w-[3px] h-[5px] bg-white rounded-sm"></div>
                                                <div className="w-[3px] h-[8px] bg-white rounded-sm"></div>
                                                <div className="w-[3px] h-[11px] bg-white rounded-sm"></div>
                                                <div className="w-[3px] h-[14px] bg-white rounded-sm"></div>
                                            </div>
                                            <div className="w-[14px] h-[8px] border-[1.5px] border-white rounded-sm relative ml-1">
                                                <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-[2px] h-[5px] bg-white rounded-r-sm"></div>
                                                <div className="w-[9px] h-[4px] bg-white rounded-sm m-[1px]"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* WhatsApp header */}
                                    <div className="bg-[#075E54] px-3 pb-3 flex items-center gap-2">
                                        <span className="text-white text-lg">←</span>
                                        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center font-black text-xs text-white shrink-0">
                                            S
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-[13px] m-0">Servy</p>
                                            <p className="text-green-200 text-[11px] m-0">en línea</p>
                                        </div>
                                    </div>

                                    {/* Chat body */}
                                    <div className="bg-[#ECE5DD] px-3 py-3 flex flex-col gap-3 min-h-[360px]">
                                        {/* Mensaje usuario */}
                                        <div className="self-end bg-[#DCF8C6] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] shadow-sm">
                                            <p className="text-slate-800 text-[13px] m-0">Se me rompió la canilla del baño</p>
                                            <p className="text-slate-400 text-[10px] text-right mt-1 m-0">10:24 ✓✓</p>
                                        </div>

                                        {/* Respuesta Servy */}
                                        <div className="self-start bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] shadow-sm">
                                            <p className="text-slate-800 text-[13px] m-0 mb-1">Encontré 2 plomeros disponibles</p>
                                            <p className="text-slate-600 text-[12px] m-0">
                                                1 <strong>Urgente</strong> — hoy en 2hs
                                            </p>
                                            <p className="text-slate-600 text-[12px] m-0">
                                                2 <strong>Programado</strong> — mañana
                                            </p>
                                            <p className="text-slate-400 text-[10px] text-right mt-1 m-0">10:24</p>
                                        </div>

                                        {/* Respuesta usuario */}
                                        <div className="self-end bg-[#DCF8C6] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] shadow-sm">
                                            <p className="text-slate-800 text-[13px] m-0">1</p>
                                            <p className="text-slate-400 text-[10px] text-right mt-1 m-0">10:25 ✓✓</p>
                                        </div>

                                        {/* Respuesta Servy */}
                                        <div className="self-start bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] shadow-sm">
                                            <p className="text-slate-800 text-[13px] m-0">
                                                Genial! La cotización está en camino. Te avisamos enseguida
                                            </p>
                                            <p className="text-slate-400 text-[10px] text-right mt-1 m-0">10:25</p>
                                        </div>
                                    </div>

                                    {/* Input bar */}
                                    <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2 border-t border-slate-200">
                                        <div className="flex-1 bg-white rounded-full px-4 py-2 text-slate-400 text-xs">
                                            Escribí un mensaje...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Cómo Funciona */}
            <section id="como-funciona" className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center relative">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">Como escribirle a un amigo que sabe de todo</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    {/* Step 1 */}
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-servy-100 text-servy-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            {/* Un icono de chat / telefono mock */}
                            <span className="text-2xl font-black">1</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Contale</h3>
                        <p className="text-slate-600">Contale a Servy qué pasó en tu casa. Texto, fotos, lo que tengas.</p>
                    </div>
                    {/* Step 2 */}
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-servy-100 text-servy-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">2</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Elegí</h3>
                        <p className="text-slate-600">Te mostramos dos opciones: urgente para hoy o programado más económico. Vos decidís.</p>
                    </div>
                    {/* Step 3 */}
                    <div className="relative p-8 rounded-3xl bg-servy-600 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex justify-center items-center mb-6">
                            <span className="text-2xl font-black">3</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Pagá seguro</h3>
                        <p className="text-white/80">Aceptás la cotización, pagás por Mercado Pago y el profesional ya sabe que va.</p>
                    </div>
                </div>
            </section>

            {/* Categorías */}
            <section id="categorias" className="w-full py-24 px-6 md:px-12 bg-slate-50 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">Servicios Disponibles</h2>
                <div className="max-w-5xl w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-servy-300 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-blue-50 text-blue-600 p-4 rounded-xl shrink-0">
                                <Wrench size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Plomería</h3>
                                <p className="text-sm text-slate-500">Canillas, cañerías, pérdidas de agua e inodoros.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-servy-300 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-yellow-50 text-yellow-500 p-4 rounded-xl shrink-0">
                                <Zap size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Electricidad</h3>
                                <p className="text-sm text-slate-500">Cortocircuitos, enchufes, tableros e instalaciones.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-servy-300 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-slate-100 text-slate-700 p-4 rounded-xl shrink-0">
                                <Key size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Cerrajería</h3>
                                <p className="text-sm text-slate-500">Puertas trabadas, cambio de cerradura y aperturas de emergencia.</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-servy-300 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-orange-50 text-orange-500 p-4 rounded-xl shrink-0">
                                <Flame size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Gas</h3>
                                <p className="text-sm text-slate-500">Pérdidas de gas, calefones, cocinas y estufas.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-servy-300 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-cyan-50 text-cyan-500 p-4 rounded-xl shrink-0">
                                <Wind size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Aires acondicionados</h3>
                                <p className="text-sm text-slate-500">Instalación, reparación y limpieza de filtros.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Por qué Servy */}
            <section className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">Por qué elegir Servy</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl w-full">
                    <div className="flex gap-6 p-6">
                        <ShieldCheck className="text-green-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Profesionales verificados</h3>
                            <p className="text-slate-600">Cada profesional pasa por un proceso de verificación antes de entrar a Servy. Vos no arriesgás.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Clock className="text-servy-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Sin descargar nada</h3>
                            <p className="text-slate-600">Todo pasa en WhatsApp, donde ya estás. Cero apps nuevas, cero registros.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Star className="text-yellow-400 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Calificaciones reales</h3>
                            <p className="text-slate-600">Cada trabajo se califica. El rating que ves lo pusieron personas como vos, no nosotros.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <HeartHandshake className="text-purple-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Precio cerrado antes de arrancar</h3>
                            <p className="text-slate-600">Sabés cuánto vas a pagar antes de que llegue el profesional. Sin sorpresas.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Para profesionales */}
            <section className="w-full py-24 px-6 md:px-12 bg-slate-900 text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-servy-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">¿Sos profesional del hogar?</h2>
                <p className="text-xl text-slate-300 max-w-2xl mb-10 relative z-10">Recibí trabajos sin salir a buscarlos. Cotizá desde tu celular, cobrá antes de arrancar y manejá todo desde tu portal.</p>
                <Link href="/profesionales" className="relative z-10 bg-servy-500 hover:bg-servy-400 text-white px-8 py-4 rounded-full font-bold shadow-xl transition-all">
                    Unirme a Servy
                </Link>
            </section>

            {/* Footer */}
            <footer className="w-full bg-slate-50 py-12 px-6 md:px-12 flex flex-col items-center border-t border-slate-200">
                <div className="text-2xl font-black text-servy-600 tracking-tighter mb-6">Servy.</div>
                <div className="flex gap-6 text-slate-500 font-medium">
                    <Link href="#">Términos y Condiciones</Link>
                    <Link href="#">Privacidad</Link>
                </div>
                <p className="text-slate-400 mt-8 text-sm">© {new Date().getFullYear()} Servy. Todos los derechos reservados.</p>
            </footer>
        </main>
    );
}
