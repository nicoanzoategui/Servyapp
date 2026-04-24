import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                servy: {
                    50: '#F2F9EF',
                    100: '#C6F6DB',
                    200: '#86efac',
                    300: '#A7E23C',
                    400: '#8BC93A',
                    500: '#0D4638',
                    600: '#0D4638',
                    700: '#0B3A31',
                    800: '#093028',
                    900: '#062420',
                },
            },
            fontFamily: {
                sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
            },
            letterSpacing: {
                tighter: '-0.05em',
                tight: '-0.025em',
            },
        },
    },
    plugins: [],
};

export default config;
