import Link from 'next/link';

export default function TerminosPage() {
    return (
        <main className="flex min-h-screen flex-col items-center bg-white">
            {/* Navbar */}
            <header className="w-full h-20 flex items-center justify-between px-6 md:px-12 bg-white border-b border-slate-100">
                <Link href="/" className="text-2xl font-black text-servy-600 tracking-tighter">
                    Servy.
                </Link>
                <Link href="/" className="text-slate-600 hover:text-servy-600 transition text-sm font-medium">
                    Volver al inicio
                </Link>
            </header>

            {/* Contenido */}
            <div className="w-full max-w-4xl px-6 md:px-12 py-16">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
                    Términos y Condiciones
                </h1>
                <p className="text-slate-500 mb-12">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>

                <div className="prose prose-slate max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Aceptación de los términos</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Al usar Servy, aceptás estos términos y condiciones. Si no estás de acuerdo, no uses el servicio.
                            Servy es una plataforma que conecta usuarios con profesionales verificados para servicios del hogar.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Cómo funciona el servicio</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Servy opera 100% por WhatsApp. El usuario envía su problema, nosotros conectamos con técnicos verificados
                            que envían cotizaciones. El usuario elige, paga de forma segura por Mercado Pago, y el técnico realiza el trabajo.
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            <strong>Sistema de pago protegido:</strong> El dinero queda retenido hasta que el usuario escanea el código QR
                            que le muestra el técnico al finalizar el trabajo. Solo entonces se libera el pago.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Responsabilidades del usuario</h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Proporcionar información veraz sobre el problema a resolver</li>
                            <li>Estar presente en el domicilio en el horario acordado</li>
                            <li>Verificar el trabajo antes de escanear el código QR de liberación de pago</li>
                            <li>No compartir datos de contacto del técnico para trabajos fuera de Servy</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Responsabilidades de los técnicos</h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Llegar en el horario acordado o avisar con anticipación cualquier cambio</li>
                            <li>Realizar el trabajo de forma profesional y con los materiales acordados</li>
                            <li>Respetar las instalaciones del domicilio del cliente</li>
                            <li>Solicitar el escaneo del código QR solo cuando el trabajo esté completado</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Política de cancelación</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            <strong>Cancelación por parte del usuario:</strong> Podés cancelar sin cargo hasta 2 horas antes del horario acordado.
                            Cancelaciones con menos de 2 horas de anticipación o no-shows pueden generar un cargo del 50% del servicio.
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            <strong>Cancelación por parte del técnico:</strong> Si el técnico no llega sin previo aviso, te enviamos
                            otro técnico sin cargo adicional. El pago original queda protegido.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Proceso de reembolsos</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Si el técnico no se presenta o si hay un problema que Servy no puede resolver, se reembolsa el 100% del pago
                            dentro de los 5-10 días hábiles a través del mismo medio de pago utilizado.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Limitación de responsabilidad</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Servy actúa como intermediario entre usuarios y técnicos. Los técnicos son profesionales independientes.
                            Servy verifica antecedentes y experiencia, pero no se responsabiliza por daños indirectos o consecuenciales
                            derivados del servicio. La responsabilidad máxima de Servy está limitada al monto pagado por el servicio específico.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Modificaciones a los términos</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Servy se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados
                            por WhatsApp y entrarán en vigor inmediatamente después de su publicación.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Contacto</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Para consultas sobre estos términos, escribinos a{' '}
                            <a href="mailto:soporte@servy.lat" className="text-servy-600 hover:underline">
                                soporte@servy.lat
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
