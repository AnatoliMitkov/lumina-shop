const DEFAULT_SITE_URL = 'https://stylingbyva.com';

export function getSiteUrl() {
    const configuredSiteUrl = typeof process.env.NEXT_PUBLIC_SITE_URL === 'string'
        ? process.env.NEXT_PUBLIC_SITE_URL.trim()
        : '';

    if (!configuredSiteUrl) {
        return DEFAULT_SITE_URL;
    }

    return configuredSiteUrl.replace(/\/$/, '');
}

export function absoluteSiteUrl(path = '/') {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${getSiteUrl()}${normalizedPath}`;
}