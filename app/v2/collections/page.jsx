import { cookies } from 'next/headers';
import { createClient, isSupabaseConfigured, resolveSupabaseWithTimeout } from '../../../utils/supabase/server';
import { fallbackCatalogProducts } from '../../../utils/fallback-catalog';
import { resolveStorefrontProduct, sortProducts } from '../../../utils/storefront-products';
import CollectionsClient from '../../../components/v2/CollectionsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Collections · The VA Store',
    description: 'Browse all pieces from The VA Store. Filter by category or collection and discover handmade avant-garde macramé fashion.',
    alternates: { canonical: '/v2/collections' },
};

async function loadProducts() {
    const fallback = fallbackCatalogProducts.map((p) => resolveStorefrontProduct(p));

    if (!isSupabaseConfigured()) {
        return fallback;
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products, error } = await resolveSupabaseWithTimeout(
        () => supabase.from('products').select('*').eq('status', 'active'),
        { data: [], error: null }
    );

    if (error) {
        return fallback;
    }

    const active = sortProducts(products ?? [])
        .filter((p) => p.status === 'active')
        .map((p) => resolveStorefrontProduct(p));

    return active.length > 0 ? active : fallback;
}

export default async function V2CollectionsPage() {
    const products = await loadProducts();

    return (
        <div className="v2-page">
            <div className="v2-container v2-section">
                {/* Page header */}
                <header className="mb-12 md:mb-16 pb-8 border-b border-[#1C1C1C]/10">
                    <p className="v2-label text-[#1C1C1C]/40 mb-3">The VA Store</p>
                    <h1 className="v2-heading-display">Collections</h1>
                </header>

                {/* Filter + grid — client component */}
                <CollectionsClient products={products} />
            </div>
        </div>
    );
}
