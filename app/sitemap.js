import { createAdminClient, isAdminConfigured } from '../utils/supabase/admin';
import { DEFAULT_LANGUAGE } from '../utils/language';
import { filterProductsByLanguage } from '../utils/products';
import { buildProductHref, normalizeProductRecord } from '../utils/products';
import { absoluteSiteUrl } from '../utils/seo';
import { SPOTLIGHT_PATH } from '../utils/site-routes';

export const revalidate = 3600;

const staticRoutes = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.65 },
    { path: '/collections', changeFrequency: 'daily', priority: 0.9 },
    { path: '/journal', changeFrequency: 'weekly', priority: 0.6 },
    { path: SPOTLIGHT_PATH, changeFrequency: 'weekly', priority: 0.8 },
    { path: '/bespoke', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/privacy-policy', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/cookie-policy', changeFrequency: 'monthly', priority: 0.4 },
];

export default async function sitemap() {
    const entries = staticRoutes.map((route) => ({
        url: absoluteSiteUrl(route.path),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));

    if (!isAdminConfigured()) {
        return entries;
    }

    try {
        const adminClient = createAdminClient();
        const { data: products, error } = await adminClient
            .from('products')
            .select('id, slug, status, updated_at, language_visibility')
            .eq('status', 'active');

        if (error) {
            throw error;
        }

        const productEntries = filterProductsByLanguage(products || [], DEFAULT_LANGUAGE)
            .map((product) => normalizeProductRecord(product))
            .filter((product) => product.status === 'active' && product.id)
            .map((product) => ({
                url: absoluteSiteUrl(buildProductHref(product)),
                lastModified: product.updated_at || undefined,
                changeFrequency: 'weekly',
                priority: 0.7,
            }));

        return [...entries, ...productEntries];
    } catch {
        return entries;
    }
}