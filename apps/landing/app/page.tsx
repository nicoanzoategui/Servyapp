import Link from 'next/link';
import {
    Wrench,
    Zap,
    Key,
    ShieldCheck,
    Clock,
    Star,
    HeartHandshake,
    Flame,
    Wind,
} from 'lucide-react';

/** E.164 sin + (wa.me). Env opcional en Railway: NEXT_PUBLIC_WA_NUMBER */
const NEXT_PUBLIC_WA_NUMBER = (
    process.env.NEXT_PUBLIC_WA_NUMBER || '16206474920'
).replace(/\D/g, '');
const WA_LINK = `https://wa.me/${NEXT_PUBLIC_WA_NUMBER}?text=Hola,%20necesito%20ayuda`;

function WhatsAppIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
    );
}

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center overflow-hidden">
            {/* Navbar Minimalista */}
            <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between gap-4 border-b border-slate-100 bg-white/80 px-4 backdrop-blur sm:px-6 md:px-12">
                <div className="text-2xl font-bold tracking-tighter text-[#0D4638]">servy.</div>
                <div className="flex flex-1 items-center justify-end gap-4 md:gap-8">
                    <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
                        <a href="#como-funciona" className="transition hover:text-[#A7E23C]">
                            Cómo Funciona
                        </a>
                        <a href="#categorias" className="transition hover:text-[#A7E23C]">
                            Servicios
                        </a>
                        <Link href="/tecnicos" className="transition hover:text-[#A7E23C]">
                            Soy técnico
                        </Link>
                    </nav>
                    <a
                        href={WA_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0D4638] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0B3A31] md:px-5"
                    >
                        <WhatsAppIcon className="h-5 w-5" />
                        <span className="max-w-[9rem] truncate sm:max-w-none">Hablar con Servy</span>
                    </a>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative mt-10 w-full overflow-hidden bg-[#F2F9EF] px-6 pb-24 pt-32 md:px-12 md:pb-28">
                {/* Hoja decorativa (inferior izquierda) */}
                <svg
                    className="pointer-events-none absolute bottom-4 left-0 z-0 h-36 w-36 text-[#A7E23C]/30 md:h-44 md:w-44"
                    viewBox="0 0 120 120"
                    fill="currentColor"
                    aria-hidden
                >
                    <path d="M98 108c-8-18-6-42 4-62 8-16 4-32-8-44-14-14-36-16-52-4-10 8-14 22-10 34 6 18 2 38-12 52-8 8-8 20 0 28s20 8 28 0c14-14 34-18 52-12 12 4 26 0 34-10 12-16 10-38-4-52-12-12-28-16-44-8-20 10-44 12-62 4z" />
                </svg>

                <div className="relative z-[1] mx-auto flex max-w-6xl flex-col items-center gap-14 md:flex-row md:items-center md:justify-between md:gap-10">
                    {/* Texto */}
                    <div className="flex w-full max-w-md flex-1 flex-col items-start text-left">
                        <h1 className="max-w-xl text-5xl font-bold tracking-tight text-[#0D4638] md:text-6xl">
                            Arreglá tu hogar en minutos. <span className="text-[#A7E23C]">Por WhatsApp.</span>
                        </h1>
                        <p className="mt-6 max-w-lg animate-fade-in delay-150 text-lg text-[#0B3A31] md:text-xl">
                            Canilla que pierde, se fue la luz, te quedaste afuera?{' '}
                            <span className="font-semibold text-[#0D4638]">Mandá mensaje a Servy.</span>{' '}
                            Recibí la cotización en minutos y tenés un técnico verificado camino a tu casa.
                        </p>
                        {/* Ícono destacado — justo arriba del CTA principal */}
                        <div className="mt-8 flex w-full max-w-lg items-start gap-4 rounded-2xl border border-[#C6F6DB]/40 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#A7E23C]">
                                <svg
                                    className="h-6 w-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.25}
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-[#0D4638]">Precio cerrado antes de que llegue.</p>
                                <p className="mt-1 text-sm text-slate-600">Sin apps nuevas, sin llamadas, sin vueltas.</p>
                            </div>
                        </div>
                        <div className="mt-8 animate-slide-up delay-300">
                            <a
                                href={WA_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0D4638] px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-[#0B3A31]"
                            >
                                <WhatsAppIcon className="h-6 w-6" />
                                Hablar con Servy
                            </a>
                        </div>
                        {/* Badges debajo del CTA */}
                        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#0B3A31] sm:gap-6">
                            <div className="flex items-center gap-2">
                                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    />
                                </svg>
                                <span className="font-medium">Técnicos verificados</span>
                            </div>
                            <div className="text-slate-400">·</div>
                            <span className="font-medium">Atención 24/7</span>
                        </div>
                    </div>

                    {/* iPhone + blob decorativo */}
                    <div className="relative hidden min-h-[420px] w-full max-w-[300px] shrink-0 items-center justify-center md:flex md:max-w-[380px]">
                        {/* Forma orgánica detrás del teléfono */}
                        <div
                            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(100vw,480px)] w-[min(92vw,440px)] -translate-x-[42%] -translate-y-1/2 bg-[#0D4638] md:h-[460px] md:w-[400px] md:-translate-x-[35%]"
                            style={{ borderRadius: '46% 54% 42% 58% / 52% 48% 55% 45%' }}
                            aria-hidden
                        />
                        {/* Textura de puntos (esquina superior del blob) */}
                        <div
                            className="pointer-events-none absolute right-2 top-8 z-[1] h-40 w-40 rounded-2xl opacity-[0.14]"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle at center, rgba(255,255,255,0.95) 1.2px, transparent 1.2px)',
                                backgroundSize: '11px 11px',
                            }}
                            aria-hidden
                        />
                        <div className="relative z-10 w-[272px]">
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
                                        <div className="w-8 h-8 rounded-full bg-[#0D4638] flex items-center justify-center font-black text-xs text-white shrink-0">
                                            S
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="m-0 flex items-center gap-1 text-[13px] font-bold text-white">
                                                Servy
                                                <span className="inline-flex shrink-0" title="Verificado" aria-hidden>
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#25D366">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                                    </svg>
                                                </span>
                                            </p>
                                            <p className="m-0 text-[11px] text-green-200">en línea</p>
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
                                        <div className="self-start bg-[#FFFFFF] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] shadow-sm">
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
                                        <div className="self-start bg-[#FFFFFF] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] shadow-sm">
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
                <h2
                    className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16"
                >
                    Así funciona Servy
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    {/* Step 1 */}
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#C6F6DB] text-[#0D4638] flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">1</span>
                        </div>
                        <h3
                            className="text-xl font-bold mb-3"
                        >
                            Contale y elegí tu técnico
                        </h3>
                        <p className="text-slate-600">
                            Mandá mensaje con tu problema (texto o foto). Te mostramos 2 opciones: técnico URGENTE (llega hoy) o PROGRAMADO (más económico). Ambos con calificaciones reales.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#C6F6DB] text-[#0D4638] flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">2</span>
                        </div>
                        <h3
                            className="text-xl font-bold mb-3"
                        >
                            Recibí la cotización y reservá
                        </h3>
                        <p className="text-slate-600">
                            El técnico que elegiste te manda el precio exacto. Si te cierra, reservás con pago protegido por Mercado Pago. El dinero queda congelado hasta que estés conforme.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#C6F6DB] text-[#0D4638] flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">3</span>
                        </div>
                        <h3
                            className="text-xl font-bold mb-3"
                        >
                            Recibí el arreglo y liberá el pago
                        </h3>
                        <p className="text-slate-600">
                            El técnico va, arregla y te muestra el resultado. Cuando estés conforme, escaneás el QR y ahí se libera el pago. Vos tenés el control.
                        </p>
                    </div>
                </div>
            </section>

            {/* Categorías */}
            <section id="categorias" className="w-full py-24 px-6 md:px-12 bg-slate-50 flex flex-col items-center">
                <h2
                    className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16"
                >
                    Servicios Disponibles
                </h2>
                <div className="max-w-5xl w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#A7E23C] flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-blue-50 text-blue-600 p-4 rounded-xl shrink-0">
                                <Wrench size={28} />
                            </div>
                            <div>
                                <h3
                                    className="text-lg font-bold mb-1"
                                >
                                    Plomería
                                </h3>
                                <p className="text-sm text-slate-500">Canillas, cañerías, pérdidas de agua e inodoros.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#A7E23C] flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-yellow-50 text-yellow-500 p-4 rounded-xl shrink-0">
                                <Zap size={28} />
                            </div>
                            <div>
                                <h3
                                    className="text-lg font-bold mb-1"
                                >
                                    Electricidad
                                </h3>
                                <p className="text-sm text-slate-500">Cortocircuitos, enchufes, tableros e instalaciones.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#A7E23C] flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-slate-100 text-slate-700 p-4 rounded-xl shrink-0">
                                <Key size={28} />
                            </div>
                            <div>
                                <h3
                                    className="text-lg font-bold mb-1"
                                >
                                    Cerrajería
                                </h3>
                                <p className="text-sm text-slate-500">Puertas trabadas, cambio de cerradura y aperturas de emergencia.</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#A7E23C] flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-orange-50 text-orange-500 p-4 rounded-xl shrink-0">
                                <Flame size={28} />
                            </div>
                            <div>
                                <h3
                                    className="text-lg font-bold mb-1"
                                >
                                    Gas
                                </h3>
                                <p className="text-sm text-slate-500">Pérdidas de gas, calefones, cocinas y estufas.</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-[#A7E23C] flex items-start gap-4 transition-colors cursor-default">
                            <div className="bg-cyan-50 text-cyan-500 p-4 rounded-xl shrink-0">
                                <Wind size={28} />
                            </div>
                            <div>
                                <h3
                                    className="text-lg font-bold mb-1"
                                >
                                    Aires acondicionados
                                </h3>
                                <p className="text-sm text-slate-500">Instalación, reparación y limpieza de filtros.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Por qué Servy */}
            <section className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2
                    className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16"
                >
                    Por qué elegir Servy
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl w-full">
                    <div className="flex gap-6 p-6">
                        <ShieldCheck className="text-[#0D4638] shrink-0" size={40} />
                        <div>
                            <h3
                                className="font-bold text-xl mb-2"
                            >
                                Profesionales verificados
                            </h3>
                            <p className="text-slate-600">
                                No más &apos;un amigo de un amigo que sabe&apos;. Todos nuestros técnicos tienen experiencia comprobada y antecedentes chequeados. Vos no arriesgás.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Clock className="text-[#0D4638] shrink-0" size={40} />
                        <div>
                            <h3
                                className="font-bold text-xl mb-2"
                            >
                                Todo en WhatsApp
                            </h3>
                            <p className="text-slate-600">
                                No tenés que bajarte otra app ni registrarte en ningún lado. Ya estás en WhatsApp, ahí pasa todo. Simple.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Star className="text-yellow-400 shrink-0" size={40} />
                        <div>
                            <h3
                                className="font-bold text-xl mb-2"
                            >
                                Calificaciones de verdad
                            </h3>
                            <p className="text-slate-600">
                                Cada trabajo se califica. El rating que ves lo pusieron personas como vos que ya lo contrataron, no lo inventamos nosotros.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <HeartHandshake className="text-[#0D4638] shrink-0" size={40} />
                        <div>
                            <h3
                                className="font-bold text-xl mb-2"
                            >
                                Sabés cuánto pagás antes de que llegue
                            </h3>
                            <p className="text-slate-600">
                                Nada de &apos;después vemos&apos;. El técnico te dice el precio exacto antes de arrancar. Aceptás o no, sin presión, sin sorpresas.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <ShieldCheck className="text-[#0D4638] shrink-0" size={40} />
                        <div>
                            <h3
                                className="font-bold text-xl mb-2"
                            >
                                Tu plata protegida hasta el final
                            </h3>
                            <p className="text-slate-600">
                                El técnico no cobra hasta que vos escanees el QR. Si algo sale mal, el dinero vuelve a tu cuenta. Cero riesgo.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonios */}
            <section className="w-full py-24 px-6 md:px-12 bg-slate-50 flex flex-col items-center">
                <h2
                    className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-4"
                >
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
                            <div className="w-10 h-10 rounded-full bg-[#C6F6DB] flex items-center justify-center font-bold text-[#0D4638]">
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
                            <div className="w-10 h-10 rounded-full bg-[#C6F6DB] flex items-center justify-center font-bold text-[#0D4638]">
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
                            <div className="w-10 h-10 rounded-full bg-[#C6F6DB] flex items-center justify-center font-bold text-[#0D4638]">
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
            <section id="dudas" className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center">
                <h2
                    className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16"
                >
                    ¿Dudas?
                </h2>

                <div className="max-w-4xl w-full space-y-6">
                    {/* Pregunta 1 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3
                            className="font-bold text-xl mb-3 text-slate-900"
                        >
                            ¿Qué pasa si el técnico no llega?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Te mandamos otro técnico sin cargo adicional. Como el pago solo se libera cuando escaneás el QR, tu dinero está protegido. Si hubo un problema, lo resolvemos nosotros, no vos.
                        </p>
                    </div>

                    {/* Pregunta 2 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3
                            className="font-bold text-xl mb-3 text-slate-900"
                        >
                            ¿Puedo ver las reviews antes de contratar?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Sí. Te mostramos el perfil del técnico, sus calificaciones y reviews de otros clientes antes de que confirmes. Así sabés con quién estás contratando.
                        </p>
                    </div>

                    {/* Pregunta 3 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3
                            className="font-bold text-xl mb-3 text-slate-900"
                        >
                            ¿Es seguro recibir a alguien en mi casa?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Totalmente. Te enviamos los documentos de la persona que va a tu casa. Todos los técnicos pasan por un proceso de verificación de antecedentes y experiencia antes de entrar a Servy.
                        </p>
                    </div>

                    {/* Pregunta 4 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3
                            className="font-bold text-xl mb-3 text-slate-900"
                        >
                            ¿Los técnicos están calificados?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Sí. Todos los técnicos pasan un proceso de verificación donde chequeamos su experiencia, antecedentes y capacitación. No dejamos entrar a cualquiera.
                        </p>
                    </div>

                    {/* Pregunta 5 */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3
                            className="font-bold text-xl mb-3 text-slate-900"
                        >
                            ¿Cuánto tarda en llegar el técnico?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            Si elegís &quot;urgente&quot;, llega dentro de las 24 horas. Si elegís &quot;programado&quot;, podés agendarlo para el día que mejor te venga y sale más económico.
                        </p>
                    </div>
                </div>
            </section>

            {/* Para profesionales */}
            <section className="w-full py-24 px-6 md:px-12 bg-[#0D4638] text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#A7E23C]/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <h2
                    className="text-4xl md:text-5xl font-bold mb-6 relative z-10 text-white"
                >
                    ¿Sos profesional del hogar?
                </h2>
                <p className="text-xl text-[#C6F6DB] max-w-2xl mb-10 relative z-10">Recibí trabajos sin salir a buscarlos. Cotizá desde tu celular, cobrá antes de arrancar y manejá todo desde tu portal.</p>
                <Link
                    href="/tecnicos"
                    className="relative z-10 bg-[#A7E23C] text-[#0D4638] hover:bg-[#A7E23C]/90 px-8 py-4 rounded-full font-bold shadow-xl shadow-[#A7E23C]/20 transition-all"
                >
                    Unirme a Servy
                </Link>
            </section>

            {/* Footer */}
            <footer className="w-full bg-slate-50 py-16 px-6 md:px-12 border-t border-slate-200">
                <div className="max-w-6xl mx-auto">
                    {/* Grid de columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        {/* Columna 1: Logo + descripción */}
                        <div className="md:col-span-1">
                            <div className="text-2xl font-bold text-[#0D4638] tracking-tighter mb-4">servy.</div>
                            <p className="text-slate-600 text-sm">
                                Arreglá tu hogar en minutos. Todo por WhatsApp.
                            </p>
                        </div>

                        {/* Columna 2: Producto */}
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Producto</h4>
                            <ul className="space-y-3 text-slate-600 text-sm">
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
                            <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
                            <ul className="space-y-3 text-slate-600 text-sm">
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
                            <h4 className="font-bold text-slate-900 mb-4">Contacto</h4>
                            <ul className="space-y-3 text-slate-600 text-sm">
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
                        <p className="text-slate-500 text-sm text-center">
                            © {new Date().getFullYear()} Servy. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
