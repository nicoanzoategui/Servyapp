'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Video "cómo funciona" para desktop. Arranca muteado cuando entra en pantalla
 * (el autoplay con audio está bloqueado) y se pausa cuando sale, así no sigue
 * sonando ni consumiendo datos fuera de la sección. El botón de sonido reactiva
 * el audio y reinicia el video para que se escuche desde el principio.
 */
export function HowItWorksVideo() {
    const ref = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) video.play().catch(() => {});
                else video.pause();
            },
            { threshold: 0.4 }
        );
        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    const toggleSound = () => {
        const video = ref.current;
        if (!video) return;
        if (muted) {
            video.currentTime = 0;
            video.muted = false;
            video.play().catch(() => {});
            setMuted(false);
        } else {
            video.muted = true;
            setMuted(true);
        }
    };

    return (
        <div className="hidden md:block relative w-full max-w-5xl">
            <video
                ref={ref}
                muted
                loop
                playsInline
                preload="metadata"
                poster="/poster-web.jpg"
                className="w-full h-auto rounded-3xl shadow-xl shadow-[#0D4638]/10"
            >
                <source src="/servy-como-funciona-web.mp4" type="video/mp4" />
            </video>
            <button
                type="button"
                onClick={toggleSound}
                aria-label={muted ? 'Activar el sonido del video' : 'Silenciar el video'}
                aria-pressed={!muted}
                className="absolute top-5 right-5 w-12 h-12 rounded-full bg-[#0D4638]/80 text-white backdrop-blur-sm flex items-center justify-center hover:bg-[#0D4638] transition"
            >
                {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
        </div>
    );
}
