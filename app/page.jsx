import { cookies } from 'next/headers';
import HomePageExperience from '../components/HomePageExperience';
import { fallbackCatalogProducts } from '../utils/fallback-catalog';
import { resolveStorefrontProduct, sortProducts } from '../utils/storefront-products';
import { createClient, isSupabaseConfigured, resolveSupabaseWithTimeout } from '../utils/supabase/server';

export const dynamic = 'force-dynamic';

async function loadFeaturedProducts() {
    const fallbackProducts = fallbackCatalogProducts
        .map((product) => resolveStorefrontProduct(product))
        .slice(0, 4);

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

    const activeProducts = sortProducts(products ?? [])
        .filter((product) => product.status === 'active')
        .map((product) => resolveStorefrontProduct(product));

    return activeProducts.length > 0 ? activeProducts.slice(0, 4) : fallbackProducts;
}

export default async function HomePage() {
    const featuredProducts = await loadFeaturedProducts();

    return <HomePageExperience featuredProducts={featuredProducts} />;
}