import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://servy.ar',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: 'https://servy.ar/profesionales',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: 'https://servy.ar/tecnicos',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.85,
        },
    ];
}
