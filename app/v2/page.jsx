import { cookies } from 'next/headers';
import { createClient, isSupabaseConfigured, resolveSupabaseWithTimeout } from '../../utils/supabase/server';
import { fallbackCatalogProducts } from '../../utils/fallback-catalog';
import { resolveStorefrontProduct, sortProducts } from '../../utils/storefront-products';
import ProductCard from '../../components/v2/ProductCard';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'The VA Store',
    description: 'Hand-knotted avant-garde fashion from Styling by VA. Sculptural silhouettes, precision craft, worldwide delivery.',
};

async function loadFeaturedProducts() {
    const fallback = fallbackCatalogProducts
        .map((p) => resolveStorefrontProduct(p))
        .slice(0, 4);

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

    return active.length > 0 ? active.slice(0, 4) : fallback;
}

export default async function V2HomePage() {
    const featured = await loadFeaturedProducts();

    return (
        <div className="v2-page">
            {/* ── Hero ──────────────────────────────────────────────────── */}
            <section className="relative flex flex-col items-center justify-center min-h-[calc(100svh-var(--v2-nav-height))] bg-[#1C1C1C] text-[#EFECE8] px-6 text-center overflow-hidden">
                {/* Subtle ambient gradient */}
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden="true"
                    style={{
                        background:
                            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(215,181,109,0.10) 0%, transparent 70%),' +
                            'radial-gradient(ellipse 40% 30% at 80% 80%, rgba(215,181,109,0.06) 0%, transparent 60%)',
                    }}
                />

                <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl">
                    <p className="v2-label text-[#EFECE8]/40">Styling by VA · Avant-Garde Fashion</p>

                    <h1 className="v2-heading-display text-[#EFECE8]">
                        The VA Store
                    </h1>

                    <p className="v2-body text-[#EFECE8]/65 max-w-md">
                        Hand-knotted sculptural fashion from Bulgaria. Precision craft, editorial silhouettes, worldwide delivery.
                    </p>

                    <div className="flex flex-wrap gap-4 justify-center pt-2">
                        <a href="/v2/collections" className="v2-btn v2-btn-primary-light">
                            Shop Collections
                        </a>
                        <a href="/contact" className="v2-btn v2-btn-ghost-light">
                            Contact Atelier
                        </a>
                    </div>
                </div>

                {/* Scroll hint */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-35">
                    <span className="v2-label text-[#EFECE8]">Scroll</span>
                    <span
                        className="block w-px h-10 bg-[#EFECE8]"
                        style={{ animation: 'none' }}
                        aria-hidden="true"
                    />
                </div>
            </section>

            {/* ── Featured pieces ───────────────────────────────────────── */}
            <section className="v2-section">
                <div className="v2-container">
                    <header className="mb-12 md:mb-14">
                        <p className="v2-label text-[#1C1C1C]/40 mb-3">Featured</p>
                        <h2 className="v2-heading-xl">Latest Pieces</h2>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {featured.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>

                    <div className="mt-12 md:mt-14 text-center">
                        <a href="/v2/collections" className="v2-btn v2-btn-secondary">
                            View All Pieces
                        </a>
                    </div>
                </div>
            </section>

            <hr className="v2-divider" />

            {/* ── Brand story ───────────────────────────────────────────── */}
            <section className="bg-[#1C1C1C] text-[#EFECE8]">
                <div className="v2-container v2-section">
                    <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                        <div className="flex flex-col gap-6">
                            <p className="v2-label text-[#EFECE8]/35">The Atelier</p>
                            <h2 className="v2-heading-xl text-[#EFECE8]">
                                Elevating traditional craftsmanship into avant-garde fashion
                            </h2>
                            <p className="v2-body text-[#EFECE8]/60 max-w-prose">
                                Every silhouette begins as a study in tension, line, and hand-knotting discipline. The atelier treats slow craft as structure, turning traditional techniques into an editorial language that feels directional rather than nostalgic.
                            </p>
                            <div>
                                <a href="/v2/collections" className="v2-btn v2-btn-primary-light">
                                    Explore the Collection
                                </a>
                            </div>
                        </div>

                        {/* Decorative placeholder — swap for real editorial image */}
                        <div className="grid grid-cols-2 gap-3" aria-hidden="true">
                            <div className="bg-[#EFECE8]/8 aspect-[3/4] rounded-[var(--v2-radius-xs)]" />
                            <div className="bg-[#EFECE8]/5 aspect-[3/4] rounded-[var(--v2-radius-xs)] mt-10" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Bespoke CTA ───────────────────────────────────────────── */}
            <section className="v2-section">
                <div className="v2-container text-center">
                    <p className="v2-label text-[#1C1C1C]/40 mb-4">Private Commission</p>
                    <h2 className="v2-heading-xl mb-6">Bespoke Pieces</h2>
                    <p className="v2-body text-[#1C1C1C]/55 max-w-md mx-auto mb-10">
                        Commission a piece made exactly to your measurements and aesthetic direction. Contact the atelier to begin.
                    </p>
                    <a href="/contact" className="v2-btn v2-btn-primary">
                        Commission a Piece
                    </a>
                </div>
            </section>
        </div>
    );
}
