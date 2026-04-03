'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { useState } from 'react';
import { ArrowLeft, Clock, MapPin, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

type OfferDetail = {
    id: string;
    status: string;
    priority: string;
    service_request: {
        description: string | null;
        photos: string[];
        address: string | null;
        user: { name: string | null; last_name: string | null; address: string | null } | null;
    };
};

type JobDetail = {
    id: string;
    status: string;
    quotation: {
        job_offer: {
            service_request: {
                description: string | null;
                photos: string[];
                address: string | null;
            };
        };
    };
};

async function fetchDetail(id: string): Promise<{ kind: 'offer'; data: OfferDetail } | { kind: 'job'; data: JobDetail }> {
    const token = Cookies.get('token');
    let res = await fetch(`${API_URL}/professional/offers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
        const json = await res.json();
        return { kind: 'offer', data: json.data };
    }
    res = await fetch(`${API_URL}/professional/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('No encontrado');
    const json = await res.json();
    return { kind: 'job', data: json.data };
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
    const queryClient = useQueryClient();
    const [quotePrice, setQuotePrice] = useState('');
    const [quoteDesc, setQuoteDesc] = useState('Cotización estándar');
    const [quoting, setQuoting] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['proJobDetail', params.id],
        queryFn: () => fetchDetail(params.id),
    });

    const quoteMutation = useMutation({
        mutationFn: async () => {
            const token = Cookies.get('token');
            const total = Number(quotePrice);
            if (!total || Number.isNaN(total)) throw new Error('Precio inválido');
            const res = await fetch(`${API_URL}/professional/offers/${params.id}/quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    items: [{ description: quoteDesc || 'Servicio', price: total }],
                    total_price: total,
                    description: quoteDesc,
                    estimated_duration: 'A coordinar',
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'Error al cotizar');
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proJobDetail', params.id] });
            queryClient.invalidateQueries({ queryKey: ['proOffers'] });
            setQuoting(false);
        },
    });

    const completeMutation = useMutation({
        mutationFn: async () => {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/professional/jobs/${params.id}/complete`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'Error');
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proJobDetail', params.id] });
            queryClient.invalidateQueries({ queryKey: ['proJobs'] });
        },
    });

    if (isLoading) return <div className="p-6">Cargando detalles...</div>;
    if (error || !data) return <div className="p-6">Trabajo u oferta no encontrada.</div>;

    const isOffer = data.kind === 'offer';
    const status = isOffer ? data.data.status : data.data.status;
    const sr = isOffer ? data.data.service_request : data.data.quotation.job_offer.service_request;
    const title = isOffer ? 'Solicitud de servicio' : 'Trabajo confirmado';

    return (
        <div className="p-6 flex flex-col gap-6 w-full pb-24 md:pb-6 animate-fade-in max-w-3xl mx-auto">
            <Link href="/jobs" className="flex items-center gap-2 text-servy-600 font-medium hover:text-servy-800 transition">
                <ArrowLeft size={20} /> Volver
            </Link>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-slate-900">{title}</h1>
                    <span
                        className={`text-xs font-bold px-3 py-1 uppercase rounded-md tracking-wider
                  ${
                      status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : status === 'quoted'
                            ? 'bg-blue-100 text-blue-800'
                            : status === 'confirmed' || status === 'in_progress'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-600'
                  }`}
                    >
                        {status}
                    </span>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción del problema</h3>
                        <p className="text-slate-800 text-lg leading-relaxed">{sr?.description || 'Sin descripción.'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <MapPin className="text-servy-500" />
                            <div>
                                <div className="text-xs text-slate-500 font-medium">Ubicación</div>
                                <div className="text-sm font-bold text-slate-900">
                                    {isOffer
                                ? sr?.address || 'Oculta hasta confirmar el servicio'
                                        : sr?.address || '—'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <Clock className="text-servy-500" />
                            <div>
                                <div className="text-xs text-slate-500 font-medium">Modalidad</div>
                                <div className="text-sm font-bold text-slate-900">
                                    {isOffer && data.data.priority === 'urgent' ? 'Urgente' : isOffer ? 'Programado' : 'Confirmado'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {sr?.photos && sr.photos.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ImageIcon size={16} /> Fotos adjuntas
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {sr.photos.map((photo: string, i: number) => (
                                    <img key={i} src={photo} alt="" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                                ))}
                            </div>
                        </div>
                    )}

                    {isOffer && data.data.status === 'pending' && (
                        <div className="mt-4 border-t border-slate-100 pt-6">
                            {quoting ? (
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-bold text-slate-700">Detalle (opcional)</label>
                                    <input
                                        type="text"
                                        className="px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                                        value={quoteDesc}
                                        onChange={(e) => setQuoteDesc(e.target.value)}
                                    />
                                    <label className="text-sm font-bold text-slate-700">Total ($)</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="number"
                                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                                            placeholder="Ej: 25000"
                                            value={quotePrice}
                                            onChange={(e) => setQuotePrice(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => quoteMutation.mutate()}
                                            disabled={!quotePrice || quoteMutation.isPending}
                                            className="bg-servy-600 hover:bg-servy-500 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50"
                                        >
                                            {quoteMutation.isPending ? 'Enviando...' : 'Enviar cotización'}
                                        </button>
                                    </div>
                                    {quoteMutation.isError && (
                                        <p className="text-sm text-red-600">{(quoteMutation.error as Error).message}</p>
                                    )}
                                    <button type="button" className="text-slate-500 text-sm font-medium self-start" onClick={() => setQuoting(false)}>
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setQuoting(true)}
                                    className="w-full bg-servy-600 hover:bg-servy-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition-all"
                                >
                                    Presupuestar este trabajo
                                </button>
                            )}
                        </div>
                    )}

                    {isOffer && data.data.status === 'quoted' && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 text-center font-medium">
                            Ya enviaste la cotización al cliente. Esperando respuesta por WhatsApp.
                        </div>
                    )}

                    {!isOffer && ['confirmed', 'in_progress'].includes(data.data.status) && (
                        <button
                            type="button"
                            onClick={() => completeMutation.mutate()}
                            disabled={completeMutation.isPending}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl"
                        >
                            {completeMutation.isPending ? 'Marcando...' : 'Marcar trabajo como completado'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
