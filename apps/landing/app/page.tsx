import Link from 'next/link';
import { Wrench, Zap, Key, ShieldCheck, Clock, Star, HeartHandshake, Flame, Wind } from 'lucide-react';

/** E.164 sin + (wa.me). Env opcional en Railway: NEXT_PUBLIC_WA_NUMBER */
const NEXT_PUBLIC_WA_NUMBER = (
    process.env.NEXT_PUBLIC_WA_NUMBER || '16206474920'
).replace(/\D/g, '');
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
                    <Link href="/tecnicos" className="hover:text-servy-500 transition">Soy técnico</Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="w-full pt-32 pb-20 px-6 md:px-12 bg-gradient-to-br from-servy-50 via-white to-servy-100/50 mt-10">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-16">
                    {/* Texto */}
                    <div className="flex-1 max-w-md flex flex-col items-start text-left">
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-xl animate-slide-up">
                            ¿Se te rompió algo en casa y no sabés a quién llamar?
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-lg animate-fade-in delay-150">
                            Canilla que pierde, se fue la luz, te quedaste afuera? Contale a Servy por WhatsApp. En minutos tenés un técnico verificado que ya sabe qué hacer. Precio cerrado antes de que llegue. Sin apps, sin llamadas, sin vueltas.
                        </p>
                        <div className="mt-10 animate-slide-up delay-300">
                            <a
                                href={WA_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-servy-600 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-servy-500/30 hover:shadow-2xl hover:bg-servy-500 hover:-translate-y-1 transition-all duration-300"
                            >
                                Resolver mi problema ahora
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
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">De &apos;se me rompió&apos; a &apos;ya está solucionado&apos; en 3 pasos</h2>
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
                        <ShieldCheck className="text-servy-600 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Profesionales verificados</h3>
                            <p className="text-slate-600">
                                No más &apos;un amigo de un amigo que sabe&apos;. Todos nuestros técnicos tienen experiencia comprobada y antecedentes chequeados. Vos no arriesgás.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Clock className="text-servy-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Todo en WhatsApp</h3>
                            <p className="text-slate-600">
                                No tenés que bajarte otra app ni registrarte en ningún lado. Ya estás en WhatsApp, ahí pasa todo. Simple.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Star className="text-yellow-400 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Calificaciones de verdad</h3>
                            <p className="text-slate-600">
                                Cada trabajo se califica. El rating que ves lo pusieron personas como vos que ya lo contrataron, no lo inventamos nosotros.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <HeartHandshake className="text-servy-600 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Sabés cuánto pagás antes de que llegue</h3>
                            <p className="text-slate-600">
                                Nada de &apos;después vemos&apos;. El técnico te dice el precio exacto antes de arrancar. Aceptás o no, sin presión, sin sorpresas.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonios */}
            <section className="w-full py-24 px-6 md:px-12 bg-slate-50 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4">
                    Lo que dicen quienes ya usaron Servy
                </h2>
                <p className="text-slate-600 text-center text-lg mb-16 max-w-2xl">
                    Más de 500 arreglos resueltos · 4.8★ promedio en calificaciones
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
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
                            &quot;Se me rompió la canilla un domingo a la tarde. Mandé mensaje y en 2 horas el plomero ya estaba arreglándola. Increíble.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-servy-100 flex items-center justify-center font-bold text-servy-600">
                                M
                            </div>
                            <div>
                                <p className="font-bold text-sm">María González</p>
                                <p className="text-slate-500 text-xs">Palermo, CABA</p>
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
                            &quot;No tuve que bajarme ninguna app ni registrarme. Todo por WhatsApp, re fácil. Y el precio lo sabés antes, sin vueltas.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-servy-100 flex items-center justify-center font-bold text-servy-600">
                                J
                            </div>
                            <div>
                                <p className="font-bold text-sm">Javier Rodríguez</p>
                                <p className="text-slate-500 text-xs">Belgrano, CABA</p>
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
                            &quot;Me quedé afuera de casa a las 11 de la noche. El cerrajero llegó en 40 minutos. Me salvó la vida literal.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-servy-100 flex items-center justify-center font-bold text-servy-600">
                                C
                            </div>
                            <div>
                                <p className="font-bold text-sm">Carolina Méndez</p>
                                <p className="text-slate-500 text-xs">Caballito, CABA</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dudas / FAQ */}
            <section className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">
                    ¿Dudas?
                </h2>

                <div className="max-w-4xl w-full space-y-6">
                    {/* Pregunta 1 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-slate-900">
                            ¿Qué pasa si el técnico no llega?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Te reembolsamos el 100% y te conseguimos otro técnico gratis. Si hubo un problema, lo resolvemos nosotros, no vos.
                        </p>
                    </div>

                    {/* Pregunta 2 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-slate-900">
                            ¿Y si hace mal el trabajo?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Tenés 7 días de garantía en todos los trabajos. Si no quedás conforme, el técnico vuelve sin costo adicional. Y si el problema persiste, te devolvemos el dinero.
                        </p>
                    </div>

                    {/* Pregunta 3 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-slate-900">
                            ¿Puedo ver las reviews antes de contratar?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Sí. Te mostramos el perfil del técnico, sus calificaciones y reviews de otros clientes antes de que confirmes. Así sabés con quién estás contratando.
                        </p>
                    </div>

                    {/* Pregunta 4 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-slate-900">
                            ¿Cuánto tarda en llegar el técnico?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Si elegís &quot;urgente&quot;, llega el mismo día (generalmente en 2-4 horas). Si elegís &quot;programado&quot;, podés agendarlo para el día que mejor te venga y sale más económico.
                        </p>
                    </div>
                </div>
            </section>

            {/* Para profesionales */}
            <section className="w-full py-24 px-6 md:px-12 bg-slate-900 text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-servy-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">¿Sos profesional del hogar?</h2>
                <p className="text-xl text-slate-300 max-w-2xl mb-10 relative z-10">Recibí trabajos sin salir a buscarlos. Cotizá desde tu celular, cobrá antes de arrancar y manejá todo desde tu portal.</p>
                <Link href="/tecnicos" className="relative z-10 bg-servy-500 hover:bg-servy-400 text-white px-8 py-4 rounded-full font-bold shadow-xl transition-all">
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
