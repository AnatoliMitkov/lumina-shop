import { cookies } from 'next/headers';
import HomePageExperience from '../components/HomePageExperience';
import { fallbackCatalogProducts } from '../utils/fallback-catalog';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, normalizeLanguage } from '../utils/language';
import { filterProductsByLanguage } from '../utils/products';
import { resolveStorefrontProduct, sortProducts } from '../utils/storefront-products';
import { createClient, isSupabaseConfigured, resolveSupabaseWithTimeout } from '../utils/supabase/server';

export const dynamic = 'force-dynamic';

async function loadFeaturedProducts(language) {
    const fallbackCatalogSlice = sortProducts(filterProductsByLanguage(fallbackCatalogProducts, language))
        .map((product) => resolveStorefrontProduct(product));
    const fallbackFeaturedProducts = fallbackCatalogSlice.filter((product) => product.featured);
    const fallbackProducts = (fallbackFeaturedProducts.length > 0 ? fallbackFeaturedProducts : fallbackCatalogSlice).slice(0, 4);

    if (!isSupabaseConfigured()) {
        return fallbackProducts;
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products, error } = await resolveSupabaseWithTimeout(
        () => supabase.from('products').select('*').eq('status', 'active'),
        { data: [], error: null }
    );

    if (error) {
        return fallbackProducts;
    }

    const activeProducts = sortProducts(filterProductsByLanguage(products ?? [], language))
        .filter((product) => product.status === 'active')
        .map((product) => resolveStorefrontProduct(product));

    const explicitlyFeaturedProducts = activeProducts.filter((product) => product.featured);
    const homepageFeaturedProducts = explicitlyFeaturedProducts.length > 0 ? explicitlyFeaturedProducts : activeProducts;

    return homepageFeaturedProducts.length > 0 ? homepageFeaturedProducts.slice(0, 4) : fallbackProducts;
}

export default async function HomePage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const featuredProducts = await loadFeaturedProducts(currentLanguage);

    return <HomePageExperience featuredProducts={featuredProducts} />;
}