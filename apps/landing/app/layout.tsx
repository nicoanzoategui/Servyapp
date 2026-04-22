// @ts-ignore
import './globals.css';
import type { Metadata } from 'next';
import { Epilogue, Inter } from 'next/font/google';
import Script from 'next/script';

const epilogue = Epilogue({
    subsets: ['latin'],
    weight: ['700', '900'],
    variable: '--font-epilogue',
    display: 'swap',
});

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Servy | Tu solución rápida para servicios del hogar',
    description:
        'Conectamos a profesionales de plomería, cerrajería y electricidad en tu zona con tus problemas urgentes de hogar. ¡Cotizaciones rápidas vía WhatsApp!',
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
        <html lang="es" className={`${epilogue.variable} ${inter.variable}`}>
            <body>
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
                {/* UXR Survey SDK */}
                <Script
                    id="uxr-survey-sdk"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
(function(w,d,s,n){
  if(w[n])return;
  w[n]=function(){(w[n].q=w[n].q||[]).push(arguments)};
  var j=d.createElement(s);
  j.async=1;j.src='https://ux-encuestas-api.new-feats.redtecnologica.org/scripts/sv.min.js';
  d.head.appendChild(j);
})(window,document,'script','_uxr');
_uxr('init',{token:'pk_live_8f8e56c7a63a3e58213a8ee3'});
            `,
                    }}
                />
            </body>
        </html>
    );
}
