// @ts-ignore
import './globals.css';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import Script from 'next/script';

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-poppins',
    display: 'swap',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://servy.lat'),
    title: 'Servy | Pedí un técnico por WhatsApp',
    description:
        'Conectamos profesionales de plomería, electricidad, cerrajería, gas y aires acondicionados con tu problema de hogar. Pedí un técnico por WhatsApp.',
    openGraph: {
        title: 'Servy | Pedí un técnico por WhatsApp',
        description:
            'Plomería, electricidad, cerrajería, gas y aires acondicionados. Coordiná la visita por WhatsApp.',
        url: 'https://servy.lat',
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
        <html lang="es" className={poppins.variable}>
            <body className="antialiased">
                {children}
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
