import Link from 'next/link';
import { Wrench, Zap, Key, ShieldCheck, Clock, Star, HeartHandshake } from 'lucide-react';

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
            <section className="w-full flex-1 pt-32 pb-20 px-6 md:px-12 flex flex-col items-center justify-center text-center bg-gradient-to-br from-servy-50 via-white to-servy-100/50 mt-10">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 max-w-4xl animate-slide-up">
                    Arreglá tu hogar en minutos. <span className="text-transparent bg-clip-text bg-gradient-to-r from-servy-500 to-servy-700">Por WhatsApp.</span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl animate-fade-in delay-150">
                    Plomeros, electricistas y cerrajeros de confianza a la puerta de tu casa. Sin apps pesadas, sin complicaciones.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-slide-up delay-300">
                    <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="bg-servy-600 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-servy-500/30 hover:shadow-2xl hover:bg-servy-500 hover:-translate-y-1 transition-all duration-300">
                        Pedir servicio ahora
                    </a>
                    <Link href="/profesionales" className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-full font-bold hover:bg-slate-50 transition-all duration-300">
                        Quiero ofrecer mis servicios
                    </Link>
                </div>
            </section>

            {/* Cómo Funciona */}
            <section id="como-funciona" className="w-full py-24 px-6 md:px-12 bg-white flex flex-col items-center relative">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">Tan simple como mensajear</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    {/* Step 1 */}
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-servy-100 text-servy-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            {/* Un icono de chat / telefono mock */}
                            <span className="text-2xl font-black">1</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Describí</h3>
                        <p className="text-slate-600">Escribile a nuestro número por WhatsApp qué necesitas arreglar.</p>
                    </div>
                    {/* Step 2 */}
                    <div className="relative p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-servy-100 text-servy-600 flex justify-center items-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">2</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Elegí</h3>
                        <p className="text-slate-600">Recibí presupuestos de profesionales verificados y elegí el mejor.</p>
                    </div>
                    {/* Step 3 */}
                    <div className="relative p-8 rounded-3xl bg-servy-600 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 group flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex justify-center items-center mb-6">
                            <span className="text-2xl font-black">3</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Pagá seguro</h3>
                        <p className="text-white/80">Aprobá el pago con MercadoPago y el profesional irá en camino.</p>
                    </div>
                </div>
            </section>

            {/* Categorías */}
            <section id="categorias" className="w-full py-24 px-6 md:px-12 bg-slate-50 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 text-center mb-16">Servicios Disponibles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl w-full">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-servy-300 flex items-center gap-4 transition-colors cursor-default">
                        <div className="bg-blue-50 text-blue-600 p-4 rounded-xl"><Wrench size={28} /></div>
                        <h3 className="text-lg font-bold">Plomería</h3>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-servy-300 flex items-center gap-4 transition-colors cursor-default">
                        <div className="bg-yellow-50 text-yellow-500 p-4 rounded-xl"><Zap size={28} /></div>
                        <h3 className="text-lg font-bold">Electricidad</h3>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-servy-300 flex items-center gap-4 transition-colors cursor-default">
                        <div className="bg-slate-100 text-slate-700 p-4 rounded-xl"><Key size={28} /></div>
                        <h3 className="text-lg font-bold">Cerrajería</h3>
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
                            <h3 className="font-bold text-xl mb-2">Identidad Verificada</h3>
                            <p className="text-slate-600">Revisamos DNI y antecedentes de cada uno de los profesionales.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Clock className="text-servy-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Rápido como un chat</h3>
                            <p className="text-slate-600">Al trabajar desde WhatsApp te saltás el problema de descargar apps.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <Star className="text-yellow-400 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Comunidad que califica</h3>
                            <p className="text-slate-600">Te mostramos el rating real otorgado por personas que ya los contrataron.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 p-6">
                        <HeartHandshake className="text-purple-500 shrink-0" size={40} />
                        <div>
                            <h3 className="font-bold text-xl mb-2">Transparente y Seguro</h3>
                            <p className="text-slate-600">Sin sorpresas en los precios. El pago se retiene con MercadoPago.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Para profesionales */}
            <section className="w-full py-24 px-6 md:px-12 bg-slate-900 text-white flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-servy-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">¿Sos profesional del hogar?</h2>
                <p className="text-xl text-slate-300 max-w-2xl mb-10 relative z-10">Suma clientes nuevos y organizá tu agenda cobrando seguro y todo manejado desde tu bolsillo.</p>
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
