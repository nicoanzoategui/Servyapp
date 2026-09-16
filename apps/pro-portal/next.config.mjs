import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    // pnpm monorepo: Next 14 espera esta clave en experimental.
    experimental: {
        outputFileTracingRoot: path.join(__dirname, '../..'),
    },
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
