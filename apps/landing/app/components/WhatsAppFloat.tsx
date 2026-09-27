import { MessageCircle } from 'lucide-react';
import { WA_LINK } from '@/lib/whatsapp';

/** CTA flotante estilo WhatsApp: visible en mobile durante todo el scroll. */
export function WhatsAppFloat() {
    return (
        <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Hablar con Servy por WhatsApp"
            className="md:hidden fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#A7E23C] text-[#0D4638] shadow-lg shadow-black/20 flex items-center justify-center hover:bg-[#A7E23C]/90 hover:scale-105 transition"
        >
            <MessageCircle size={26} strokeWidth={2.25} />
        </a>
    );
}
