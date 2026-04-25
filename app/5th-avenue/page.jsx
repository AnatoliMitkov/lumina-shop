import { SPOTLIGHT_PATH } from '../../utils/site-routes';
import { cookies } from 'next/headers';
import { FALLBACK_PRODUCTS, normalizeStageProduct } from '../../_archive/fifth-avenue-prototype/src/lib/catalog.js';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, normalizeLanguage } from '../../utils/language';
import { filterProductsByLanguage } from '../../utils/products';
import { createClient, isSupabaseConfigured } from '../../utils/supabase/server';
import { isSiteCopySetupError } from '../../utils/site-copy';
import { getCollectionMediaKeyPrefix, toCollectionMediaMap } from '../../utils/fifth-avenue-stage-media';
import FifthAvenuePrototypePageClient from './FifthAvenuePrototypePageClient';

export const metadata = {
    title: '5th Avenue',
    description: 'Experience the cinematic collection spotlight and explore featured windows from The VA Store.',
    alternates: {
        canonical: SPOTLIGHT_PATH,
    },
};

async function loadCollectionStageMediaOverrides(cookieStore) {
    if (!isSupabaseConfigured()) {
        return {};
    }

    const supabase = createClient(cookieStore);
    const keyPrefix = getCollectionMediaKeyPrefix();
    const { data, error } = await supabase
        .from('site_copy_entries')
        .select('key, value')
        .ilike('key', `${keyPrefix}%`);

    if (error) {
        if (isSiteCopySetupError(error)) {
            return {};
        }

        return {};
    }

    return toCollectionMediaMap(data || []);
}

async function loadStageProducts(cookieStore, language) {
    if (!isSupabaseConfigured()) {
        return FALLBACK_PRODUCTS;
    }

    const supabase = createClient(cookieStore);
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, slug, subtitle, collection, image_main, image_detail, gallery, featured, sort_order, status, language_visibility, created_at')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) {
        return FALLBACK_PRODUCTS;
    }

    const visibleProducts = filterProductsByLanguage(products ?? [], language)
        .map(normalizeStageProduct)
        .filter(Boolean);

    return visibleProducts.length > 0 ? visibleProducts : FALLBACK_PRODUCTS;
}

export default async function FifthAvenuePage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const [collectionStageMediaOverrides, initialProducts] = await Promise.all([
        loadCollectionStageMediaOverrides(cookieStore),
        loadStageProducts(cookieStore, currentLanguage),
    ]);

    return (
        <FifthAvenuePrototypePageClient
            activeLanguage={currentLanguage}
            collectionStageMediaOverrides={collectionStageMediaOverrides}
            initialProducts={initialProducts}
        />
    );
}