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
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
    );
}

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center overflow-hidden">
            {/* Navbar Minimalista */}
            <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between gap-4 border-b border-slate-100 bg-white/80 px-4 backdrop-blur sm:px-6 md:px-12">
                <div className="text-[1.65rem] font-bold leading-none tracking-tighter text-[#0D4638] md:text-[1.75rem]">
                    servy.
                </div>
                <div className="flex flex-1 items-center justify-end gap-4 md:gap-8">
                    <nav className="hidden gap-6 text-sm font-bold text-[#0D4638] md:flex">
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
                <div className="relative z-[1] mx-auto flex max-w-5xl flex-col items-center gap-10 md:flex-row md:items-start md:justify-center md:gap-8 lg:gap-10">
                    {/* Texto */}
                    <div className="flex w-full max-w-md shrink-0 flex-col items-start text-left md:max-w-[28rem]">
                        <h1 className="max-w-xl text-5xl font-bold leading-[1.28] tracking-tight text-[#0D4638] md:text-6xl md:leading-[1.15]">
                            Arreglá tu hogar sin dar vueltas ni sorpresas. <span className="text-[#A7E23C]">Por WhatsApp.</span>
                        </h1>
                        <p className="mt-6 text-lg text-slate-600 max-w-lg md:text-xl">
                            Plomeros, electricistas y técnicos verificados en tu zona. Pedí un especialista de urgencia o agendalo para mañana. Pagás en cuotas y tu plata está protegida hasta que el trabajo esté terminado.
                        </p>
                        {/* Ícono destacado — justo arriba del CTA principal */}
                        <div className="mt-8 flex w-full max-w-lg items-start gap-4 rounded-2xl border border-[#C6F6DB]/40 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#A7E23C]">
                                <ShieldCheck className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-[#0D4638]">Tu plata protegida hasta el final.</p>
                                <p className="mt-1 text-sm text-slate-600">El técnico cobra solo cuando escaneás el QR. Sin efectivo, sin riesgos.</p>
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
                                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

                    {/* iPhone mockup */}
                    <div className="relative hidden w-[272px] shrink-0 md:block">
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
                                                <span className="inline-flex shrink-0" title="Verificado" aria-hidden="true">
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
                                            <p className="text-slate-800 text-[13px] m-0">Se me rompió la canilla del baño y pierde agua.</p>
                                            <p className="text-slate-400 text-[10px] text-right mt-1 m-0">10:24 ✓✓</p>
                                        </div>

                                        {/* Respuesta Servy */}
                                        <div className="self-start bg-[#FFFFFF] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] shadow-sm">
                                            <p className="text-slate-800 text-[13px] m-0 mb-1">¡Entendido! Para darte un presupuesto exacto y garantía, el especialista necesita evaluarlo en persona. La visita de diagnóstico cuesta $35.000.</p>
                                            <p className="text-slate-800 text-[13px] m-0 mt-2">¿Con qué urgencia lo necesitás?</p>
                                            <p className="text-slate-600 text-[12px] m-0">1 🚨 URGENTE — Voy ahora mismo ($50.000)</p>
                                            <p className="text-slate-600 text-[12px] m-0">2 📅 AGENDAR — Para más tarde o mañana ($35.000)</p>
                                            <p className="text-slate-400 text-[10px] text-right mt-1 m-0">10:24</p>
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
            </section>

            {/* Cómo Funciona */}
            <section id="como-funciona" className="relative flex w-full flex-col items-center bg-[#F2F9EF] px-6 py-24 md:px-12">
                <h2
                    className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16"
                >
                    Así funciona Servy
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    {/* Step 1 */}
                    <div className="relative flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-xl">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#A7E23C]">
                            <span className="text-3xl font-bold text-[#0D4638]">1</span>
                        </div>
                        <h3
                            className="text-xl font-bold mb-3"
                        >
                            Contanos el problema y elegí la urgencia
                        </h3>
                        <p className="text-slate-600">
                            Mandá un mensaje por WhatsApp. Elegí si necesitás un técnico URGENTE (llega hoy mismo) o PROGRAMADO (más económico para otro día). Ambos con calificaciones reales.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-xl">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#A7E23C]">
                            <span className="text-3xl font-bold text-[#0D4638]">2</span>
                        </div>
                        <h3
                            className="text-xl font-bold mb-3"
                        >
                            Reservá tu visita con Pago Protegido
                        </h3>
                        <p className="text-slate-600">
                            Aboná la visita técnica para que el especialista vaya a tu domicilio. Tu plata queda retenida y segura en Servy. El técnico evalúa el problema ahí mismo y te da el presupuesto exacto del arreglo.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-xl">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#A7E23C]">
                            <span className="text-3xl font-bold text-[#0D4638]">3</span>
                        </div>
                        <h3
                            className="text-xl font-bold mb-3"
                        >
                            Arreglo en cuotas y liberación con QR
                        </h3>
                        <p className="text-slate-600">
                            Si aceptás el presupuesto, podés pagarlo en hasta 3 cuotas. Cuando el trabajo esté terminado y estés conforme, le mostrás tu Código QR secreto desde tu celular. El técnico lo escanea y recién ahí se libera el pago. Vos tenés el control.
                        </p>
                    </div>
                </div>
            </section>

            {/* Servicios Section */}
            <section id="categorias" className="w-full bg-white px-6 py-20 md:px-12">
                <div className="mx-auto max-w-6xl">
                    {/* Badge y Título */}
                    <div className="mb-16 text-center">
                        <div className="mb-6 inline-block rounded-full border border-[#0D4638] px-4 py-2 text-sm font-medium text-[#0D4638]">
                            SERVICIOS DISPONIBLES
                        </div>
                        <h2 className="mb-4 text-3xl font-bold text-[#0D4638] md:text-5xl">
                            Soluciones confiables para tu hogar
                        </h2>
                        <p className="mx-auto max-w-2xl text-base text-slate-600 md:text-lg">
                            Profesionales verificados, atención 24/7 y precios transparentes.
                            <br />
                            Llegamos rápido cuando más nos necesitás.
                        </p>
                    </div>

                    {/* Grid de Servicios Principales */}
                    <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Plomería */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#C6F6DB] transition-colors group-hover:bg-[#A7E23C]">
                                <Wrench className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Plomería</h3>
                            <p className="mb-6 text-sm text-slate-600 md:text-base">Canillas, cañerías, pérdidas de agua e inodoros.</p>
                        </div>

                        {/* Electricidad */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#A7E23C]/20 transition-colors group-hover:bg-[#A7E23C]">
                                <Zap className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Electricidad</h3>
                            <p className="mb-6 text-sm text-slate-600 md:text-base">Cortocircuitos, enchufes, tableros e instalaciones.</p>
                        </div>

                        {/* Cerrajería */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#C6F6DB] transition-colors group-hover:bg-[#A7E23C]">
                                <Key className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Cerrajería</h3>
                            <p className="mb-6 text-sm text-slate-600 md:text-base">
                                Puertas trabadas, cambio de cerradura y aperturas de emergencia.
                            </p>
                        </div>
                    </div>

                    {/* Segunda fila */}
                    <div className="mx-auto mb-16 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Gas */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#A7E23C]/20 transition-colors group-hover:bg-[#A7E23C]">
                                <Flame className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Gas</h3>
                            <p className="mb-6 text-sm text-slate-600 md:text-base">Pérdidas de gas, calefones, cocinas y estufas.</p>
                        </div>

                        {/* Aires */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#C6F6DB] transition-colors group-hover:bg-[#A7E23C]">
                                <Wind className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Aires acondicionados</h3>
                            <p className="mb-6 text-sm text-slate-600 md:text-base">Instalación, reparación y limpieza de filtros.</p>
                        </div>
                    </div>

                    {/* CTA Central */}
                    <div className="text-center">
                        <a
                            href={WA_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded-full bg-[#0D4638] px-8 py-4 font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-[#0B3A31]"
                        >
                            Solicitar servicio ahora
                        </a>
                    </div>
                </div>
            </section>

            {/* Más Servicios Section */}
            <section id="mas-servicios" className="w-full bg-[#F2F9EF] px-6 py-20 md:px-12">
                <div className="mx-auto max-w-6xl">
                    {/* Título */}
                    <div className="mb-16 text-center">
                        <div className="mb-6 inline-block rounded-full border border-[#0D4638] px-4 py-2 text-sm font-medium text-[#0D4638]">
                            MÁS SERVICIOS
                        </div>
                        <h2 className="mb-4 text-3xl font-bold text-[#0D4638] md:text-5xl">
                            Cuidado integral de tu hogar
                        </h2>
                    </div>

                    {/* Grid de Más Servicios */}
                    <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Pintura */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#C6F6DB] transition-colors group-hover:bg-[#A7E23C]">
                                <svg
                                    className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                                    />
                                </svg>
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Pintura</h3>
                            <p className="text-sm text-slate-600 md:text-base">
                                Pintura de interiores, exteriores, retoques y renovación de ambientes.
                            </p>
                        </div>

                        {/* Arregla Todo */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#A7E23C]/20 transition-colors group-hover:bg-[#A7E23C]">
                                <svg
                                    className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                                    />
                                </svg>
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Arregla Todo</h3>
                            <p className="text-sm text-slate-600 md:text-base">
                                Pequeñas reparaciones del hogar, instalaciones y mantenimiento general.
                            </p>
                        </div>

                        {/* Jardinería */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#C6F6DB] transition-colors group-hover:bg-[#A7E23C]">
                                <svg
                                    className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                    />
                                </svg>
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Jardinería</h3>
                            <p className="text-sm text-slate-600 md:text-base">
                                Mantenimiento de jardines, poda, césped y paisajismo.
                            </p>
                        </div>
                    </div>

                    {/* Segunda fila */}
                    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Limpieza de Piscinas */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#A7E23C]/20 transition-colors group-hover:bg-[#A7E23C]">
                                <svg
                                    className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                                    />
                                </svg>
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Limpieza de Piscinas</h3>
                            <p className="text-sm text-slate-600 md:text-base">
                                Limpieza profunda, mantenimiento y tratamiento químico.
                            </p>
                        </div>

                        {/* Lavado de Autos */}
                        <div className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#A7E23C] hover:shadow-xl md:p-8">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl md:mb-6 md:h-16 md:w-16 bg-[#C6F6DB] transition-colors group-hover:bg-[#A7E23C]">
                                <svg
                                    className="h-6 w-6 text-[#0D4638] md:h-8 md:w-8"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                    />
                                </svg>
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#0D4638] md:text-2xl">Lavado de Autos</h3>
                            <p className="text-sm text-slate-600 md:text-base">
                                Lavado completo, encerado y limpieza interior a domicilio.
                            </p>
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
                                No más &quot;un amigo de un amigo que sabe&quot;. Validamos DNI, antecedentes y experiencia de cada técnico. Vos no arriesgás a quién metés en tu casa.
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
                                No tenés que bajarte otra app ni registrarte con contraseñas. Ya estás en WhatsApp, ahí pasa todo. Simple y rápido.
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
                                Arreglos pesados, en cuotas
                            </h3>
                            <p className="text-slate-600">
                                ¿Se rompió algo caro a fin de mes? El técnico te arma el presupuesto y podés pagarlo en hasta 3 cuotas con Mercado Pago desde el chat.
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
                            &quot;Pagué la visita urgente y el plomero estaba en casa en 45 minutos. Me pasó el presupuesto del caño roto y lo pagué en 3 cuotas. Un alivio total.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#C6F6DB] flex items-center justify-center font-bold text-[#0D4638]">
                                M
                            </div>
                            <div>
                                <p className="font-bold text-sm">María González</p>
                                <p className="text-slate-500 text-xs">Pilar</p>
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
                            &quot;Me encanta el sistema del código QR. Hasta que no vi el enchufe terminado y funcionando perfecto, no le liberé la plata al electricista. Muy seguro.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#C6F6DB] flex items-center justify-center font-bold text-[#0D4638]">
                                J
                            </div>
                            <div>
                                <p className="font-bold text-sm">Javier Rodríguez</p>
                                <p className="text-slate-500 text-xs">Olivos</p>
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
                            &quot;No tuve que bajarme ninguna app ni registrarme. Todo por WhatsApp, re fácil. El diagnóstico inicial me dejó claro cuánto iba a salir todo sin sorpresas.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#C6F6DB] flex items-center justify-center font-bold text-[#0D4638]">
                                C
                            </div>
                            <div>
                                <p className="font-bold text-sm">Carolina Méndez</p>
                                <p className="text-slate-500 text-xs">San Isidro</p>
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
                            ¿Qué pasa si el técnico revisa y decido no hacer el arreglo?
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                            No hay problema. Solo abonás el costo de la Visita de Diagnóstico ($35.000) por el tiempo y evaluación del profesional. El servicio se cierra como &quot;Solo Visita&quot; y no pagás nada extra.
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
                            Totalmente. Antes de que el técnico llegue, te enviamos el nombre, la foto y el DNI de la persona que va a tocar tu timbre. Todos pasan por un filtro estricto antes de entrar a Servy.
                        </p>
                    </div>

                    {/* Pregunta — Garantía Servy */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-xl mb-3 text-slate-900">¿Qué pasa si el trabajo queda mal?</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Tenés la Garantía Servy de 30 días. Si el arreglo falla, nos mandás un mensaje y le abrimos un ticket al técnico para que vuelva a tu domicilio a solucionarlo sin cobrarte un peso de mano de obra.
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
                            Depende de tu urgencia. Si elegís la opción &quot;Urgente&quot;, el sistema prioriza a los técnicos más cercanos para que lleguen en minutos. Si elegís &quot;Programado&quot;, podés agendarlo para el momento que mejor te venga a un costo menor.
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
                    ¿Sos profesional del hogar? Cambiá tu forma de trabajar.
                </h2>
                <p className="text-xl text-[#C6F6DB] max-w-2xl mb-10 relative z-10">
                    Dejá de perder tiempo y nafta pasando presupuestos gratis que no se concretan. En Servy cobrás la visita técnica garantizada solo por ir a diagnosticar. Manejá todo desde tu celular y recibí trabajos sin salir a buscarlos.
                </p>
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
