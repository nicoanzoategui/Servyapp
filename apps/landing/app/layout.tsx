// @ts-ignore
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Servy | Tu solución rápida para servicios del hogar',
    description: 'Conectamos a profesionales de plomería, cerrajería y electricidad en tu zona con tus problemas urgentes de hogar. ¡Cotizaciones rápidas vía WhatsApp!',
    openGraph: {
        title: 'Servy | Tu solución rápida',
        description: 'Encuentra a los mejores profesionales aprobados para tu hogar al instante.',
        url: 'https://servy.ar',
        siteName: 'Servy',
        locale: 'es_AR',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={inter.className}>
                {children}
                {/* Google Analytics 4 */}
                <Script
                    strategy="afterInteractive"
                    src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
                />
                <Script
                    id="google-analytics"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX', {
                page_path: window.location.pathname,
              });
            `,
                    }}
                />
            </body>
        </html>
    );
}
