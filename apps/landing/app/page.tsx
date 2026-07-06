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
                <div className="text-2xl font-bold text-[#0D4638] tracking-tighter">servy.</div>
                <nav className="gap-6 hidden md:flex font-medium text-[#0D4638]/80 text-sm">
                    <a href="#como-funciona" className="hover:text-[#A7E23C] transition">Cómo Funciona</a>
                    <a href="#categorias" className="hover:text-[#A7E23C] transition">Servicios</a>
                    <Link href="/tecnicos" className="hover:text-[#A7E23C] transition">Soy técnico</Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="w-full pt-32 pb-20 px-6 md:px-12 bg-gradient-to-br from-[#F2F9EF] via-white to-[#C6F6DB]/30 mt-10">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-16">
                    {/* Texto */}
                    <div className="flex-1 max-w-md flex flex-col items-start text-left">
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#0B3A31] max-w-xl animate-slide-up">
                            Arreglá tu hogar en minutos.{' '}
                            <span className="text-[#A7E23C]">Por WhatsApp.</span>
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-[#0D4638]/80 max-w-lg animate-fade-in delay-150">
                            Canilla que pierde, se fue la luz, te quedaste afuera?{' '}
                            <span className="font-semibold text-[#0D4638]">Mandá mensaje a Servy.</span>{' '}
                            Elegí urgente o programado, pagás la visita y si hacés el arreglo, se descuenta del total.
                        </p>
                        <p className="mt-4 text-lg md:text-xl text-[#0D4638]/80 max-w-lg animate-fade-in delay-200">
                            <span className="font-semibold text-[#0D4638]">Visita urgente $55.000 · Programada $39.000 · Se descuenta del arreglo.</span>
                        </p>
                        <div className="mt-10 animate-slide-up delay-300">
                            <a
                                href={WA_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#A7E23C] text-[#0D4638] px-8 py-4 rounded-full font-bold shadow-xl shadow-[#A7E23C]/20 hover:shadow-2xl hover:shadow-[#A7E23C]/20 hover:bg-[#A7E23C]/90 hover:-translate-y-1 transition-all duration-300"
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
                                            <p className="text-slate-800 text-[13px] m-0 mb-1">¿Urgente $55.000 o Programado $39.000?</p>
                                            <p className="text-slate-600 text-[12px] m-0">1 Urgente — hoy</p>
                                            <p className="text-slate-600 text-[12px] m-0">2 Programado — hasta 72 hs</p>
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
                                                Listo. Confirmamos con tu técnico y te mandamos el link de pago de la visita.
                                            </p>
                                            <p className="text-slate-400 text-[10px] text-right mt-1 m-0">10:25</p>
                                        </div>

                                        {/* Respuesta Servy */}
                                        <div className="self-start bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] shadow-sm">
                                            <p className="text-slate-800 text-[13px] m-0">
                                                Si hacés el arreglo, la visita se descuenta del total 👍
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
                <h2 className="text-3xl md:text-5xl font-bold text-[#0B3A31] text-center mb-16">Así funciona Servy</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    {/* Step 1 */}
                    <div className="relative p-8 rounded-3xl bg-[#F2F9EF]/50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#C6F6DB]/30 text-[#0D4638] flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">1</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-[#0B3A31]">Contanos el problema</h3>
                        <p className="text-[#0D4638]/80">
                            Mandá mensaje con tu problema (texto o foto). Elegí Urgente ($55.000, hoy) o Programado ($39.000, hasta 72 hs) y coordinamos el turno.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative p-8 rounded-3xl bg-[#F2F9EF]/50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#C6F6DB]/30 text-[#0D4638] flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">2</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-[#0B3A31]">Confirmamos y pagás la visita</h3>
                        <p className="text-[#0D4638]/80">
                            Asignamos un técnico verificado y te avisamos cuando confirma el turno. Pagás la visita con Mercado Pago — si después hacés el arreglo, se descuenta del total.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative p-8 rounded-3xl bg-[#F2F9EF]/50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#C6F6DB]/30 text-[#0D4638] flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">3</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-[#0B3A31]">Arreglo in situ y QR</h3>
                        <p className="text-[#0D4638]/80">
                            El técnico diagnostica y te manda el presupuesto del arreglo. Se descuenta lo que ya pagaste de visita. Si aceptás, pagás la diferencia y al terminar escaneás el QR para liberar el pago.
                        </p>
                    </div>
                </div>
            </section>

            {/* Categorías */}
            <section id="categorias" className="w-full py-24 px-6 md:px-12 bg-[#F2F9EF]/50 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-[#0B3A31] text-center mb-16">Servicios Disponibles</h2>
                <div className="max-w-5xl w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#0D4638]/20 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-blue-50 text-blue-600 p-4 rounded-xl shrink-0">
                                <Wrench size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 text-[#0B3A31]">Plomería</h3>
                                <p className="text-sm text-[#0D4638]/70">Canillas, cañerías, pérdidas de agua e inodoros.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#0D4638]/20 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-yellow-50 text-yellow-500 p-4 rounded-xl shrink-0">
                                <Zap size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 text-[#0B3A31]">Electricidad</h3>
                                <p className="text-sm text-[#0D4638]/70">Cortocircuitos, enchufes, tableros e instalaciones.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#0D4638]/20 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-slate-100 text-slate-700 p-4 rounded-xl shrink-0">
                                <Key size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 text-[#0B3A31]">Cerrajería</h3>
                                <p className="text-sm text-[#0D4638]/70">Puertas trabadas, cambio de cerradura y aperturas de emergencia.</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#0D4638]/20 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-orange-50 text-orange-500 p-4 rounded-xl shrink-0">
                                <Flame size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 text-[#0B3A31]">Gas</h3>
                                <p className="text-sm text-[#0D4638]/70">Pérdidas de gas, calefones, cocinas y estufas.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#0D4638]/20 flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-cyan-50 text-cyan-500 p-4 rounded-xl shrink-0">
                                <Wind size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 text-[#0B3A31]">Aires acondicionados</h3>
                                <p className="text-sm text-[#0D4638]/70">Instalación, reparación y limpieza de filtros.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Por qué Servy */}
            <section className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-[#0B3A31] text-center mb-16">Por qué elegir Servy</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl w-full">
                    <div className="flex gap-6 p-6">
                        <ShieldCheck className="text-[#0D4638] shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2 text-[#0B3A31]">Profesionales verificados</h3>
                            <p className="text-[#0D4638]/80">
                                No más &apos;un amigo de un amigo que sabe&apos;. Todos nuestros técnicos tienen experiencia comprobada y antecedentes chequeados. Vos no arriesgás.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Clock className="text-[#0D4638] shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2 text-[#0B3A31]">Todo en WhatsApp</h3>
                            <p className="text-[#0D4638]/80">
                                No tenés que bajarte otra app ni registrarte en ningún lado. Ya estás en WhatsApp, ahí pasa todo. Simple.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Star className="text-yellow-400 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2 text-[#0B3A31]">Calificaciones de verdad</h3>
                            <p className="text-[#0D4638]/80">
                                Cada trabajo se califica. El rating que ves lo pusieron personas como vos que ya lo contrataron, no lo inventamos nosotros.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <HeartHandshake className="text-[#0D4638] shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2 text-[#0B3A31]">Sabés cuánto pagás antes de que llegue</h3>
                            <p className="text-[#0D4638]/80">
                                Nada de &apos;después vemos&apos;. El técnico te dice el precio exacto antes de arrancar. Aceptás o no, sin presión, sin sorpresas.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <ShieldCheck className="text-[#0D4638] shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2 text-[#0B3A31]">Tu plata protegida hasta el final</h3>
                            <p className="text-[#0D4638]/80">
                                El técnico no cobra hasta que vos escanees el QR. Si algo sale mal, el dinero vuelve a tu cuenta. Cero riesgo.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Early adopters */}
            <section className="w-full py-24 px-6 md:px-12 bg-[#F2F9EF]/50 flex flex-col items-center text-center">
                <h2 className="text-3xl md:text-5xl font-bold text-[#0B3A31] text-center mb-6">
                    Estamos empezando en Pilar, Buenos Aires
                </h2>
                <p className="text-[#0D4638]/80 text-center text-lg mb-10 max-w-2xl">
                    Sé de los primeros en probar Servy y conseguí precio preferencial en tu primera visita.
                </p>
                <a
                    href={WA_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#A7E23C] text-[#0D4638] px-8 py-4 rounded-full font-bold shadow-xl shadow-[#A7E23C]/20 hover:shadow-2xl hover:shadow-[#A7E23C]/20 hover:bg-[#A7E23C]/90 hover:-translate-y-1 transition-all duration-300"
                >
                    Hablar con Servy
                </a>
            </section>

            {/* Dudas / FAQ */}
            <section id="dudas" className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-[#0B3A31] text-center mb-16">
                    ¿Dudas?
                </h2>

                <div className="max-w-4xl w-full space-y-6">
                    {/* Pregunta 1 */}
                    <div className="bg-[#F2F9EF]/50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-[#0B3A31]">
                            ¿Qué pasa si el técnico no llega?
                        </h3>
                        <p className="text-[#0D4638]/80 leading-relaxed">
                            Te mandamos otro técnico sin cargo adicional. Como el pago solo se libera cuando escaneás el QR, tu dinero está protegido. Si hubo un problema, lo resolvemos nosotros, no vos.
                        </p>
                    </div>

                    {/* Pregunta 2 */}
                    <div className="bg-[#F2F9EF]/50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-[#0B3A31]">
                            ¿Puedo ver las reviews antes de contratar?
                        </h3>
                        <p className="text-[#0D4638]/80 leading-relaxed">
                            Sí. Te mostramos el perfil del técnico, sus calificaciones y reviews de otros clientes antes de que confirmes. Así sabés con quién estás contratando.
                        </p>
                    </div>

                    {/* Pregunta 3 */}
                    <div className="bg-[#F2F9EF]/50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-[#0B3A31]">
                            ¿Es seguro recibir a alguien en mi casa?
                        </h3>
                        <p className="text-[#0D4638]/80 leading-relaxed">
                            Totalmente. Te enviamos los documentos de la persona que va a tu casa. Todos los técnicos pasan por un proceso de verificación de antecedentes y experiencia antes de entrar a Servy.
                        </p>
                    </div>

                    {/* Pregunta 4 */}
                    <div className="bg-[#F2F9EF]/50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-[#0B3A31]">
                            ¿Los técnicos están calificados?
                        </h3>
                        <p className="text-[#0D4638]/80 leading-relaxed">
                            Sí. Todos los técnicos pasan un proceso de verificación donde chequeamos su experiencia, antecedentes y capacitación. No dejamos entrar a cualquiera.
                        </p>
                    </div>

                    {/* Pregunta 5 */}
                    <div className="bg-[#F2F9EF]/50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-[#0B3A31]">
                            ¿Cuánto tarda en llegar el técnico?
                        </h3>
                        <p className="text-[#0D4638]/80 leading-relaxed">
                            Si elegís &quot;urgente&quot;, llega dentro de las 24 horas. Si elegís &quot;programado&quot;, podés agendarlo para el día que mejor te venga y sale más económico. Recordá que si hacés el arreglo, lo que pagaste de visita se descuenta del presupuesto.
                        </p>
                    </div>
                </div>
            </section>

            {/* Para profesionales */}
            <section className="w-full py-24 px-6 md:px-12 bg-[#0D4638] text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#A7E23C]/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10 text-white">¿Sos profesional del hogar?</h2>
                <p className="text-xl text-[#C6F6DB] max-w-2xl mb-10 relative z-10">Recibí trabajos sin salir a buscarlos. Cotizá desde tu celular, cobrá antes de arrancar y manejá todo desde tu portal.</p>
                <Link
                    href="/tecnicos"
                    className="relative z-10 bg-[#A7E23C] text-[#0D4638] hover:bg-[#A7E23C]/90 px-8 py-4 rounded-full font-bold shadow-xl shadow-[#A7E23C]/20 transition-all"
                >
                    Unirme a Servy
                </Link>
            </section>

            {/* Footer */}
            <footer className="w-full bg-[#F2F9EF]/50 py-16 px-6 md:px-12 border-t border-slate-200">
                <div className="max-w-6xl mx-auto">
                    {/* Grid de columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        {/* Columna 1: Logo + descripción */}
                        <div className="md:col-span-1">
                            <div className="text-2xl font-bold text-[#0D4638] tracking-tighter mb-4">servy.</div>
                            <p className="text-[#0D4638]/80 text-sm">
                                Arreglá tu hogar en minutos. Todo por WhatsApp.
                            </p>
                        </div>

                        {/* Columna 2: Producto */}
                        <div>
                            <h4 className="font-bold text-[#0B3A31] mb-4">Producto</h4>
                            <ul className="space-y-3 text-[#0D4638]/80 text-sm">
                                <li>
                                    <a href="#como-funciona" className="hover:text-[#A7E23C] transition">
                                        Cómo Funciona
                                    </a>
                                </li>
                                <li>
                                    <a href="#categorias" className="hover:text-[#A7E23C] transition">
                                        Servicios
                                    </a>
                                </li>
                                <li>
                                    <Link href="/tecnicos" className="hover:text-[#A7E23C] transition">
                                        Soy técnico
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Columna 3: Legal */}
                        <div>
                            <h4 className="font-bold text-[#0B3A31] mb-4">Legal</h4>
                            <ul className="space-y-3 text-[#0D4638]/80 text-sm">
                                <li>
                                    <Link href="/terminos" className="hover:text-[#A7E23C] transition">
                                        Términos y Condiciones
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/privacidad" className="hover:text-[#A7E23C] transition">
                                        Política de Privacidad
                                    </Link>
                                </li>
                                <li>
                                    <a href="#dudas" className="hover:text-[#A7E23C] transition">
                                        Preguntas Frecuentes
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Columna 4: Contacto */}
                        <div>
                            <h4 className="font-bold text-[#0B3A31] mb-4">Contacto</h4>
                            <ul className="space-y-3 text-[#0D4638]/80 text-sm">
                                <li>
                                    <a
                                        href={WA_LINK}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-[#A7E23C] transition"
                                    >
                                        Hablar con Servy
                                    </a>
                                </li>
                                <li>
                                    <a href="mailto:soporte@servy.lat" className="hover:text-[#A7E23C] transition">
                                        soporte@servy.lat
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-slate-200 pt-8">
                        <p className="text-[#0D4638]/60 text-sm text-center">
                            © {new Date().getFullYear()} Servy. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
