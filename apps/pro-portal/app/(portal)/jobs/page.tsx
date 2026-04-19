'use client';

import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight, MapPin } from 'lucide-react';
import { API_URL } from '@/lib/api';

const fetchOffers = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/professional/offers`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching offers');
    return data.data as any[];
};

const fetchConfirmedJobs = async () => {
    const token = Cookies.get('token');
    const res = await fetch(`${API_URL}/professional/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error fetching jobs');
    return data.data as any[];
};

export default function ProJobsPage() {
    const { data: offers, isLoading: loadingOffers } = useQuery({
        queryKey: ['proOffers'],
        queryFn: fetchOffers,
    });
    const { data: jobs, isLoading: loadingJobs } = useQuery({
        queryKey: ['proJobs'],
        queryFn: fetchConfirmedJobs,
    });

    if (loadingOffers && loadingJobs) return <div className="p-6 text-slate-500">Cargando...</div>;

    return (
        <div className="p-6 flex flex-col gap-8 w-full pb-20 md:pb-6 animate-fade-in">
            <section>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Solicitudes para cotizar</h1>
                <p className="text-slate-500 text-sm mb-4">Ofertas activas vinculadas a tu perfil</p>
                <div className="flex flex-col gap-4">
                    {(offers || []).map((offer: any) => (
                        <Link
                            key={offer.id}
                            href={`/jobs/${offer.id}`}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-servy-300 transition-colors group"
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`text-xs font-bold px-2 py-1 uppercase rounded-md tracking-wider
                  ${
                      offer.status === 'pending' || offer.status === 'accepted'
                          ? 'bg-yellow-100 text-yellow-800'
                          : offer.status === 'quoted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                  }`}
                                    >
                                        {offer.status}
                                    </span>
                                    <span className="text-sm text-slate-500 font-medium">
                                        {format(new Date(offer.created_at), 'dd MMM HH:mm', { locale: es })}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mt-1 line-clamp-1">
                                    {offer.service_request?.description || 'Solicitud de servicio'}
                                </h3>
                                <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                                    <MapPin size={14} /> Dirección oculta hasta confirmar pago
                                </div>
                            </div>
                            <div className="flex justify-end items-center text-servy-600 font-medium shrink-0 group-hover:translate-x-1 transition-transform">
                                Ver detalle <ChevronRight size={20} />
                            </div>
                        </Link>
                    ))}
                    {offers?.length === 0 && <div className="text-center p-8 bg-slate-50 rounded-2xl text-slate-500">No tenés solicitudes pendientes.</div>}
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Trabajos confirmados</h2>
                <div className="flex flex-col gap-4">
                    {(jobs || []).map((job: any) => (
                        <Link
                            key={job.id}
                            href={`/jobs/${job.id}`}
                            className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-servy-300"
                        >
                            <div>
                                <span className="text-xs font-bold text-green-700 uppercase">{job.status}</span>
                                <p className="font-medium text-slate-800 mt-1 line-clamp-1">
                                    {job.quotation?.job_offer?.service_request?.description || 'Trabajo'}
                                </p>
                            </div>
                            <ChevronRight className="text-servy-600" size={20} />
                        </Link>
                    ))}
                    {jobs?.length === 0 && <p className="text-slate-500 text-sm">Aún no tenés trabajos confirmados.</p>}
                </div>
            </section>
        </div>
    );
}
