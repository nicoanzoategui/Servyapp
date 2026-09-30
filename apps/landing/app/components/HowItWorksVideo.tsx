'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';

/**
 * Video "cómo funciona" para desktop. No arranca solo: queda en el primer
 * frame hasta que el visitante aprieta play, y cada reproducción empieza de
 * cero con sonido (el click habilita el audio). Si se pausa, termina o sale
 * de pantalla, vuelve al inicio.
 */
export function HowItWorksVideo() {
    const ref = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);

    const reset = () => {
        const video = ref.current;
        if (!video) return;
        video.pause();
        video.currentTime = 0;
        setPlaying(false);
    };

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) reset();
            },
            { threshold: 0.4 }
        );
        observer.observe(video);
        return () => observer.disconnect();
        // reset lee el ref, que no cambia entre renders
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const play = () => {
        const video = ref.current;
        if (!video) return;
        video.currentTime = 0;
        video.muted = muted;
        video.play().catch(() => setPlaying(false));
        setPlaying(true);
    };

    const toggleSound = () => {
        const video = ref.current;
        if (!video) return;
        video.muted = !muted;
        setMuted(!muted);
    };

    return (
        <div className="hidden md:block relative w-full max-w-5xl">
            <video
                ref={ref}
                playsInline
                preload="auto"
                onEnded={reset}
                onClick={playing ? reset : undefined}
                className="w-full h-auto rounded-3xl shadow-xl shadow-[#0D4638]/10"
            >
                <source src="/servy-como-funciona-web.mp4" type="video/mp4" />
            </video>
            {!playing && (
                <button
                    type="button"
                    onClick={play}
                    aria-label="Reproducir el video desde el principio"
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <span className="w-24 h-24 rounded-full bg-[#A7E23C] text-[#0D4638] shadow-xl shadow-black/20 flex items-center justify-center hover:scale-105 transition">
                        <Play size={40} fill="currentColor" className="ml-1" />
                    </span>
                </button>
            )}
            {playing && (
                <button
                    type="button"
                    onClick={toggleSound}
                    aria-label={muted ? 'Activar el sonido del video' : 'Silenciar el video'}
                    aria-pressed={!muted}
                    className="absolute top-5 right-5 w-12 h-12 rounded-full bg-[#0D4638]/80 text-white backdrop-blur-sm flex items-center justify-center hover:bg-[#0D4638] transition"
                >
                    {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>
            )}
        </div>
    );
}
