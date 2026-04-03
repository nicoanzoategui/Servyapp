import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                servy: {
                    50: '#f0f9ff',
                    500: '#0ea5e9',
                    600: '#0284c7',
                }
            }
        },
    },
    plugins: [],
};
export default config;
