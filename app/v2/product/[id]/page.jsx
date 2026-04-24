import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createClient, isSupabaseConfigured, resolveSupabaseWithTimeout } from '../../../../utils/supabase/server';
import { fallbackCatalogProducts } from '../../../../utils/fallback-catalog';
import { resolveStorefrontProduct, resolveStorefrontGallery } from '../../../../utils/storefront-products';
import { formatProductCurrency, sortProducts } from '../../../../utils/products';
import ProductActions from './ProductActions';

export const dynamic = 'force-dynamic';

async function loadCatalog() {
    const fallback = fallbackCatalogProducts.map((p) => resolveStorefrontProduct(p));

    if (!isSupabaseConfigured()) {
        return fallback;
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products } = await resolveSupabaseWithTimeout(
        () => supabase.from('products').select('*'),
        { data: [], error: null }
    );

    const items = sortProducts(products ?? []).map((p) => resolveStorefrontProduct(p));

    return items.length > 0 ? items : fallback;
}

function findProduct(catalog, id) {
    const normalized = decodeURIComponent(id || '').trim().toLowerCase();

    return catalog.find(
        (p) =>
            (p.id && String(p.id).toLowerCase() === normalized) ||
            (p.slug && p.slug.toLowerCase() === normalized)
    );
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    const catalog = await loadCatalog();
    const product = findProduct(catalog, id);

    if (!product) {
        return { title: 'Product Not Found · The VA Store' };
    }

    return {
        title: `${product.name} · The VA Store`,
        description: product.description || product.subtitle || 'A handmade piece from Styling by VA.',
        openGraph: {
            title: product.name,
            description: product.description || product.subtitle,
            images: product.image_main ? [{ url: product.image_main }] : [],
        },
    };
}

export default async function V2ProductPage({ params }) {
    const { id } = await params;
    const catalog = await loadCatalog();
    const product = findProduct(catalog, id);

    if (!product) {
        notFound();
    }

    const gallery = resolveStorefrontGallery(product);
    const mainImage = gallery[0] || '';
    const extraImages = gallery.slice(1, 4);

    const relatedProducts = catalog
        .filter((p) => p.id !== product.id && p.collection === product.collection)
        .slice(0, 3);

    return (
        <div className="v2-page">
            <div className="v2-container v2-section">
                {/* Breadcrumb */}
                <nav className="mb-8 v2-label text-[#1C1C1C]/40 flex gap-2 items-center" aria-label="Breadcrumb">
                    <a href="/v2/collections" className="hover:text-[#1C1C1C] transition-colors">Collections</a>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#1C1C1C]/70">{product.name}</span>
                </nav>

                {/* Main layout: gallery left + info right */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-start">

                    {/* ── Gallery ──────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                        {/* Main image */}
                        <div className="overflow-hidden bg-[#D9CBB9] aspect-[3/4]">
                            {mainImage ? (
                                <img
                                    src={mainImage}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    loading="eager"
                                    decoding="async"
                                />
                            ) : (
                                <div className="w-full h-full" aria-hidden="true" />
                            )}
                        </div>

                        {/* Thumbnail strip */}
                        {extraImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {extraImages.map((src, index) => (
                                    <div
                                        key={`${src}-${index}`}
                                        className="overflow-hidden bg-[#D9CBB9] aspect-[3/4]"
                                    >
                                        <img
                                            src={src}
                                            alt={`${product.name} view ${index + 2}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Product info ─────────────────────────────────── */}
                    <div className="flex flex-col gap-8 lg:sticky lg:top-[calc(var(--v2-nav-height)+2rem)]">
                        {/* Category / collection */}
                        <div>
                            <p className="v2-label text-[#1C1C1C]/40 mb-1">{product.category}</p>
                            <p className="v2-label text-[#1C1C1C]/30">{product.collection}</p>
                        </div>

                        {/* Name */}
                        <h1 className="v2-heading-xl">{product.name}</h1>

                        {/* Subtitle */}
                        {product.subtitle ? (
                            <p className="v2-body text-[#1C1C1C]/60">{product.subtitle}</p>
                        ) : null}

                        {/* Highlights */}
                        {product.highlights && product.highlights.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
                                {product.highlights.map((h) => (
                                    <li key={h} className="v2-badge">{h}</li>
                                ))}
                            </ul>
                        )}

                        {/* Add-to-cart (client component) */}
                        <ProductActions product={product} />

                        <hr className="v2-divider" />

                        {/* Description */}
                        {product.description ? (
                            <div>
                                <h2 className="v2-label text-[#1C1C1C]/45 mb-3">Description</h2>
                                <p className="v2-body text-[#1C1C1C]/65">{product.description}</p>
                            </div>
                        ) : null}

                        {/* Story */}
                        {product.story ? (
                            <div>
                                <h2 className="v2-label text-[#1C1C1C]/45 mb-3">Story</h2>
                                <p className="v2-body text-[#1C1C1C]/60">{product.story}</p>
                            </div>
                        ) : null}

                        {/* Materials */}
                        {product.materials ? (
                            <div>
                                <h2 className="v2-label text-[#1C1C1C]/45 mb-3">Materials</h2>
                                <p className="v2-body text-[#1C1C1C]/60">{product.materials}</p>
                            </div>
                        ) : null}

                        {/* Care */}
                        {product.care ? (
                            <div>
                                <h2 className="v2-label text-[#1C1C1C]/45 mb-3">Care</h2>
                                <p className="v2-body text-[#1C1C1C]/60">{product.care}</p>
                            </div>
                        ) : null}

                        {/* Artisan note */}
                        {product.artisan_note ? (
                            <div className="border border-[#1C1C1C]/8 bg-white/40 p-5">
                                <h2 className="v2-label text-[#1C1C1C]/45 mb-3">Artisan Note</h2>
                                <p className="v2-body-sm text-[#1C1C1C]/55 italic">{product.artisan_note}</p>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* ── Related pieces ────────────────────────────────────── */}
                {relatedProducts.length > 0 && (
                    <div className="mt-20 md:mt-28 pt-10 border-t border-[#1C1C1C]/10">
                        <h2 className="v2-heading-xl mb-10">From {product.collection}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
                            {relatedProducts.map((related) => (
                                <a
                                    key={related.id}
                                    href={`/v2/product/${encodeURIComponent(related.slug || related.id)}`}
                                    className="v2-product-card"
                                >
                                    <div className="v2-product-card__image-wrap">
                                        {related.image_main ? (
                                            <img
                                                src={related.image_main}
                                                alt={related.name}
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        ) : (
                                            <div className="w-full h-full" aria-hidden="true" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="v2-label text-[#1C1C1C]/40">{related.category}</p>
                                        <p className="v2-heading-lg">{related.name}</p>
                                        <p className="v2-price mt-1">{formatProductCurrency(related.price)}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
