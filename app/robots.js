import { getSiteUrl } from '../utils/seo';

export default function robots() {
    const siteUrl = getSiteUrl();

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/account', '/cart', '/checkout', '/api'],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}