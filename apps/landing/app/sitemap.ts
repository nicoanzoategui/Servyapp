import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://servy.lat',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: 'https://servy.lat/profesionales',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: 'https://servy.lat/tecnicos',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.85,
        },
    ];
}
