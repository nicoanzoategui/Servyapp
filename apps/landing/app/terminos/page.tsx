import Link from 'next/link';

export default function TerminosPage() {
    return (
        <main className="flex min-h-screen flex-col items-center bg-white">
            <header className="w-full h-20 flex items-center justify-between px-6 md:px-12 bg-white border-b border-slate-100">
                <Link href="/" className="text-2xl font-bold text-[#0D4638] tracking-tighter">
                    servy.
                </Link>
                <Link href="/" className="text-slate-600 hover:text-[#A7E23C] transition text-sm font-medium">
                    Volver al inicio
                </Link>
            </header>

            <div className="w-full max-w-4xl px-6 md:px-12 py-16">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                    Términos y Condiciones de Prestación de Servicios
                </h1>
                <p className="text-xl font-semibold text-[#0D4638] mb-2">Plataforma SERVY</p>
                <p className="text-slate-600 italic mb-8">
                    Lineamientos de la Relación Comercial entre SERVY y el PRESTADOR
                </p>
                <p className="text-slate-500 mb-12">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>

                <div className="prose prose-slate max-w-none space-y-8">
                    <p className="text-slate-600 leading-relaxed">
                        Este documento constituye el contrato marco que regula la relación entre SERVY (en adelante,
                        &ldquo;LA PLATAFORMA&rdquo;) y el técnico o contratista (en adelante, el &ldquo;PRESTADOR&rdquo;) que
                        utilice el ecosistema digital de SERVY para la captación de clientes y gestión de servicios de
                        mantenimiento, oficios y reparación. Se establece que, en su etapa inicial, LA PLATAFORMA operará
                        prioritariamente en la zona de Pilar, Provincia de Buenos Aires.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            1. Naturaleza del vínculo: Prestador independiente
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            El PRESTADOR declara ser un contratista independiente que cuenta con sus propios medios,
                            herramientas, movilidad, conocimientos técnicos o de oficio y organización propia para la
                            ejecución de las tareas.
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>
                                <strong>Ausencia de relación laboral:</strong> Las partes reconocen expresamente que el
                                presente vínculo es de carácter civil y comercial. No existe entre SERVY y el PRESTADOR
                                relación de dependencia, subordinación jerárquica, ni vínculo laboral de ninguna especie.
                            </li>
                            <li>
                                <strong>Libertad de contratación:</strong> El PRESTADOR tiene absoluta libertad para aceptar
                                o rechazar las propuestas de servicio enviadas por LA PLATAFORMA vía WhatsApp, según su
                                propia conveniencia y disponibilidad, sin que el rechazo genere sanciones.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Requisitos operativos y legales</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Para formar parte del registro de PRESTADORES de SERVY, el interesado se obliga a mantener
                            actualizada la siguiente documentación:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>
                                <strong>Habilitación y oficio:</strong> Poseer los conocimientos necesarios para el oficio
                                ofrecido y, en los casos que la normativa legal lo exija, contar con matrícula profesional
                                vigente (ej. Gasistas, Electricistas, Técnicos en Refrigeración).
                            </li>
                            <li>
                                <strong>Situación fiscal:</strong> Estar debidamente inscripto ante la AFIP (Monotributo o
                                Régimen General), siendo el único responsable de la emisión de facturas legales a los
                                Clientes por el total del servicio.
                            </li>
                            <li>
                                <strong>Seguros:</strong> Contar con un seguro de Accidentes Personales (AP) con cláusula
                                de no repetición a favor de SERVY y del Cliente final.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Modelo de operación y comisiones</h2>
                        <p className="text-slate-600 leading-relaxed mb-6">
                            El PRESTADOR acepta el esquema de comisiones por intermediación tecnológica de acuerdo con la
                            modalidad de servicio:
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="p-4 text-left font-bold text-slate-900">Concepto / Modalidad</th>
                                        <th className="p-4 text-left font-bold text-slate-900">Comisión SERVY</th>
                                        <th className="p-4 text-left font-bold text-slate-900">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-600">
                                    <tr className="border-b border-slate-100">
                                        <td className="p-4">Visita Técnica (Diagnóstico)</td>
                                        <td className="p-4 font-semibold text-[#0D4638]">15%</td>
                                        <td className="p-4">
                                            Sobre el fee inicial de $35.000 ARS (programado) o $50.000 ARS (urgente).
                                        </td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="p-4">Arreglo / Reparación Final</td>
                                        <td className="p-4 font-semibold text-[#0D4638]">5%</td>
                                        <td className="p-4">Sobre el excedente presupuestado en domicilio.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4">Servicios de Precio Cerrado</td>
                                        <td className="p-4 font-semibold text-[#0D4638]">15%</td>
                                        <td className="p-4">Aplicable al valor total (Limpieza, Jardinería, etc.).</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            4. Sistema de pago protegido y liberación por QR
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Para garantizar la seguridad en el flujo de fondos, se establece el siguiente mecanismo de
                            Escrow:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>
                                <strong>Custodia de fondos:</strong> Los pagos realizados por el Cliente serán percibidos
                                por LA PLATAFORMA y mantenidos en custodia temporal.
                            </li>
                            <li>
                                <strong>Validación por QR:</strong> Al finalizar la tarea, el Cliente exhibirá un código QR
                                único. El PRESTADOR deberá escanearlo para confirmar la conclusión del servicio. En ese
                                acto, el sistema procesará la liberación de los fondos hacia la cuenta del PRESTADOR,
                                previa deducción de las comisiones mencionadas.
                            </li>
                            <li>
                                <strong>Exclusividad de cobro:</strong> Queda prohibido solicitar o percibir pagos directos
                                por fuera de la plataforma para servicios originados en SERVY. El incumplimiento será causa
                                de desvinculación inmediata.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            5. Responsabilidad y garantía de satisfacción
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            El PRESTADOR es el único responsable por la ejecución de los trabajos y/o servicios de oficio.
                            Deberá otorgar garantía sobre sus tareas de acuerdo a los plazos legales vigentes.
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>
                                <strong>Obligación de resultado:</strong> En caso de que el problema no haya sido solucionado
                                satisfactoriamente o persistan fallas derivadas de la ejecución original, el PRESTADOR se
                                obliga a concurrir nuevamente al domicilio para subsanar el error.
                            </li>
                            <li>
                                <strong>Costo cero para el Cliente:</strong> Esta nueva intervención para hacer efectiva la
                                garantía no devengará, bajo ninguna circunstancia, el cobro de una nueva visita técnica ni
                                nuevos honorarios de mano de obra.
                            </li>
                            <li>
                                <strong>Daños:</strong> El PRESTADOR responde personalmente por cualquier daño material o
                                personal causado en el domicilio del Cliente durante la prestación.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Estándares de calidad y selección</h2>
                        <p className="text-slate-600 leading-relaxed">
                            SERVY basa la asignación de servicios en la satisfacción del usuario. En caso de reportes de mala
                            conducta o calificaciones negativas recurrentes por parte de los Clientes, SERVY dejará de enviar
                            solicitudes de servicios y dejará de requerir la intervención de dicho PRESTADOR, procediendo a
                            su baja del registro.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Ley aplicable y jurisdicción</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Para todos los efectos legales, las partes se someten a la aplicación de las leyes de la
                            República Argentina. Ante cualquier controversia, las partes se someten a la jurisdicción de los
                            Tribunales Ordinarios de Pilar, Provincia de Buenos Aires, renunciando a cualquier otro fuero o
                            jurisdicción que pudiera corresponder.
                        </p>
                    </section>

                    <p className="text-slate-500 text-sm border-t border-slate-200 pt-8">
                        Documento final definitivo con garantía reforzada y jurisdicción en Pilar para SERVY.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Contacto</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Para consultas sobre estos términos, escribinos a{' '}
                            <a href="mailto:soporte@servy.lat" className="text-[#0D4638] hover:text-[#A7E23C] hover:underline">
                                soporte@servy.lat
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
