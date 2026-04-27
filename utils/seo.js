const DEFAULT_SITE_URL = 'https://stylingbyva.com';
const LOCAL_SITE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

function normalizeSiteUrl(siteUrl) {
    return siteUrl.replace(/\/$/, '');
}

function isLocalSiteUrl(siteUrl) {
    try {
        const parsedSiteUrl = new URL(siteUrl);
        return LOCAL_SITE_HOSTNAMES.has(parsedSiteUrl.hostname);
    } catch {
        return false;
    }
}

export function getSiteUrl(options = {}) {
    const { allowLocal = true } = options;
    const configuredSiteUrl = typeof process.env.NEXT_PUBLIC_SITE_URL === 'string'
        ? process.env.NEXT_PUBLIC_SITE_URL.trim()
        : '';

    if (!configuredSiteUrl) {
        return DEFAULT_SITE_URL;
    }

    const normalizedSiteUrl = normalizeSiteUrl(configuredSiteUrl);

    if (!allowLocal && isLocalSiteUrl(normalizedSiteUrl)) {
        return DEFAULT_SITE_URL;
    }

    return normalizedSiteUrl;
}

export function absoluteSiteUrl(path = '/', options) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${getSiteUrl(options)}${normalizedPath}`;
}