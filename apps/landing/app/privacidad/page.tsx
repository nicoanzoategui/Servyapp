import Link from 'next/link';

export default function PrivacidadPage() {
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
                    Política de Privacidad
                </h1>
                <p className="text-slate-500 mb-12">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>

                <div className="prose prose-slate max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Información que recopilamos</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Para brindarte el servicio, recopilamos la siguiente información:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li><strong>Información de contacto:</strong> nombre, número de teléfono (WhatsApp)</li>
                            <li><strong>Información de ubicación:</strong> dirección donde se realizará el servicio</li>
                            <li><strong>Detalles del servicio:</strong> descripción del problema, fotos si las enviás</li>
                            <li><strong>Información de pago:</strong> procesada por Mercado Pago (no almacenamos datos bancarios)</li>
                            <li><strong>Documentos de identidad:</strong> de los técnicos para verificación (no de usuarios)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Cómo usamos tu información</h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Conectarte con técnicos disponibles para tu servicio</li>
                            <li>Procesar pagos de forma segura</li>
                            <li>Enviarte actualizaciones sobre el estado de tu servicio</li>
                            <li>Mejorar nuestro servicio y experiencia de usuario</li>
                            <li>Cumplir con obligaciones legales</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Con quién compartimos tu información</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Compartimos tu información únicamente con:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li><strong>Técnicos verificados:</strong> para que puedan realizar el servicio (nombre, dirección, teléfono, detalles del problema)</li>
                            <li><strong>Procesadores de pago:</strong> Mercado Pago para procesar transacciones</li>
                            <li><strong>Autoridades:</strong> si la ley nos lo requiere</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed mt-4">
                            <strong>No vendemos tu información a terceros.</strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Seguridad de los datos</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Usamos medidas de seguridad estándar de la industria para proteger tu información:
                            cifrado de datos en tránsito, acceso restringido, y almacenamiento seguro. Sin embargo,
                            ningún sistema es 100% seguro, y no podemos garantizar seguridad absoluta.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Retención de datos</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Mantenemos tu información mientras uses Servy y durante el tiempo necesario para cumplir
                            con obligaciones legales o resolver disputas. Podés solicitar la eliminación de tus datos
                            en cualquier momento.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Tus derechos</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Tenés derecho a:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Acceder a tu información personal</li>
                            <li>Corregir datos incorrectos</li>
                            <li>Solicitar la eliminación de tu cuenta y datos</li>
                            <li>Oponerte al procesamiento de tus datos</li>
                            <li>Solicitar la portabilidad de tus datos</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed mt-4">
                            Para ejercer estos derechos, escribinos a{' '}
                            <a href="mailto:privacidad@servy.lat" className="text-servy-600 hover:underline">
                                privacidad@servy.lat
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Cookies y tecnologías similares</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Nuestro sitio web usa cookies esenciales para su funcionamiento. No usamos cookies de
                            publicidad o seguimiento de terceros. Podés configurar tu navegador para rechazar cookies,
                            pero esto puede afectar la funcionalidad del sitio.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Menores de edad</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Servy está dirigido a personas mayores de 18 años. No recopilamos intencionalmente
                            información de menores. Si descubrimos que hemos recopilado datos de un menor, los
                            eliminaremos inmediatamente.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Cambios a esta política</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Podemos actualizar esta política periódicamente. Te notificaremos de cambios significativos
                            por WhatsApp. La fecha de &quot;Última actualización&quot; al principio de esta página indica cuándo
                            fue modificada por última vez.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contacto</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Para consultas sobre esta política de privacidad, escribinos a{' '}
                            <a href="mailto:privacidad@servy.lat" className="text-servy-600 hover:underline">
                                privacidad@servy.lat
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
