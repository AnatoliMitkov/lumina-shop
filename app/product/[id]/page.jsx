import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import AddToCartBtn from '../../../components/AddToCartBtn';
import { createClient } from '../../../utils/supabase/server';
import {
    buildProductHref,
    formatProductCurrency,
    normalizeProductRecord,
    resolveProductGallery,
    sortProducts,
} from '../../../utils/products';

export const dynamic = 'force-dynamic';

const defaultCareCopy = 'Crafted from organic cotton cord and finished by hand. Spot clean only, avoid machine washing, and store flat between wears to preserve the knot structure.';
const defaultFitCopy = 'Designed to feel sculptural rather than conventional. If you are between sizes or commissioning a private fit, contact the atelier before ordering.';
const defaultShippingCopy = 'Complimentary worldwide shipping on orders above €300. Ready pieces dispatch faster, while made-to-order work follows the listed atelier lead time.';

function buildHighlightList(product) {
    if (product.highlights.length > 0) {
        return product.highlights;
    }

    return [
        `${product.collection} direction`,
        `${product.category} silhouette`,
        product.inventory_count > 0 ? 'Ready-to-ship stock available' : 'Made-to-order atelier finish',
    ];
}

function buildAvailabilityLabel(product) {
    if (product.inventory_count > 0) {
        return `${product.inventory_count} ready now`;
    }

    return 'Made to order';
}

function buildLeadTimeLabel(product) {
    return `${product.lead_time_days} day${product.lead_time_days === 1 ? '' : 's'} lead time`;
}

export default async function ProductPage({ params }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products } = await supabase.from('products').select('*');

    const catalog = sortProducts(products ?? []).map((entry) => normalizeProductRecord(entry));
    const product = catalog.find((entry) => entry.id === id || entry.slug === id);

    if (!product) {
        notFound();
    }

    const gallery = resolveProductGallery(product);
    const highlightList = buildHighlightList(product);
    const relatedProducts = catalog
        .filter((entry) => entry.id !== product.id && entry.slug !== product.slug)
        .filter((entry) => entry.status === 'active')
        .filter((entry) => entry.collection === product.collection || entry.category === product.category)
        .slice(0, 3);
    const productStory = product.story || product.description;
    const materialsCopy = [product.materials, product.care].filter(Boolean).join(' ');

    return (
        <div className="pt-28 md:pt-36 pb-24 md:pb-28 px-6 md:px-12 max-w-[1800px] mx-auto">
            <section className="mb-10 md:mb-14 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 md:gap-8 border-b border-[#1C1C1C]/10 pb-8 md:pb-10">
                <div>
                    <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45 mb-4">Product / {product.collection}</p>
                    <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full">{product.name}</h1></div>
                </div>

                <div className="flex flex-col gap-4 max-w-xl">
                    {product.subtitle && <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">{product.subtitle}</p>}
                    <div className="hero-sub opacity-0 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                        <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{product.category}</span>
                        <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{buildAvailabilityLabel(product)}</span>
                        {product.palette.slice(0, 2).map((tone) => (
                            <span key={tone} className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{tone}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start mb-16 md:mb-20">
                <div className="md:col-span-7 flex flex-col gap-6 md:gap-8">
                    {gallery.length > 0 && (
                        <div className="w-full aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target bg-[#1C1C1C]" data-cursor-text="Zoom">
                            <img className="w-full h-full object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.04]" src={gallery[0]} alt={product.name} />
                        </div>
                    )}

                    {gallery.length > 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {gallery.slice(1).map((image, index) => (
                                <div key={`${image}-${index}`} className="aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target bg-[#1C1C1C]" data-cursor-text="Detail">
                                    <img className="w-full h-full object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.04]" src={image} alt={`${product.name} ${index + 2}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="md:col-span-5 relative">
                    <div className="sticky top-32 flex flex-col gap-8 md:gap-10">
                        <div className="flex flex-col gap-4">
                            <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">{product.collection} / {product.category}</p>
                            <div className="flex items-end justify-between gap-4 border-b border-[#1C1C1C]/10 pb-5">
                                <div>
                                    <p className="hero-sub opacity-0 text-2xl md:text-3xl font-medium tracking-[0.02em] text-[#1C1C1C]">{formatProductCurrency(product.price)}</p>
                                    {product.compare_at_price && product.compare_at_price > product.price && (
                                        <p className="hero-sub opacity-0 mt-2 text-xs uppercase tracking-[0.24em] text-[#1C1C1C]/40 line-through">{formatProductCurrency(product.compare_at_price)}</p>
                                    )}
                                </div>

                                <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">{buildLeadTimeLabel(product)}</p>
                            </div>
                        </div>

                        <div className="hero-sub opacity-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm p-4">
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Availability</p>
                                <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]">{product.inventory_count > 0 ? 'Ready' : 'Made'}</p>
                            </div>
                            <div className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm p-4">
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Lead Time</p>
                                <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]">{product.lead_time_days}d</p>
                            </div>
                            <div className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm p-4">
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Collection</p>
                                <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]">{product.collection.split(' ')[0]}</p>
                            </div>
                        </div>

                        <p className="hero-sub opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/65">{product.description}</p>

                        <AddToCartBtn product={product} />

                        <div className="hero-sub opacity-0 flex flex-col gap-3 border-t border-b border-[#1C1C1C]/10 py-6">
                            {highlightList.map((highlight) => (
                                <p key={highlight} className="text-xs uppercase tracking-[0.22em] text-[#1C1C1C]/62">{highlight}</p>
                            ))}
                        </div>

                        <div className="hero-sub opacity-0 flex flex-col text-xs uppercase tracking-widest">
                            <div className="accordion-item border-t border-[#1C1C1C]/10">
                                <div className="accordion-header py-6 flex justify-between items-center group cursor-pointer hover-target"><span className="font-medium text-[#1C1C1C]">Materials & Care</span><span className="accordion-icon text-lg font-light transition-transform duration-300">+</span></div>
                                <div className="accordion-content h-0 overflow-hidden opacity-0"><p className="pb-6 text-sm font-light tracking-wide text-gray-600 leading-relaxed normal-case">{materialsCopy || defaultCareCopy}</p></div>
                            </div>
                            <div className="accordion-item border-t border-[#1C1C1C]/10">
                                <div className="accordion-header py-6 flex justify-between items-center group cursor-pointer hover-target"><span className="font-medium text-[#1C1C1C]">Fit & Styling</span><span className="accordion-icon text-lg font-light transition-transform duration-300">+</span></div>
                                <div className="accordion-content h-0 overflow-hidden opacity-0"><p className="pb-6 text-sm font-light tracking-wide text-gray-600 leading-relaxed normal-case">{product.fit_notes || defaultFitCopy}</p></div>
                            </div>
                            <div className="accordion-item border-t border-b border-[#1C1C1C]/10">
                                <div className="accordion-header py-6 flex justify-between items-center group cursor-pointer hover-target"><span className="font-medium text-[#1C1C1C]">Shipping & Returns</span><span className="accordion-icon text-lg font-light transition-transform duration-300">+</span></div>
                                <div className="accordion-content h-0 overflow-hidden opacity-0"><p className="pb-6 text-sm font-light tracking-wide text-gray-600 leading-relaxed normal-case">{defaultShippingCopy}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-16 md:mb-20 grid grid-cols-1 xl:grid-cols-[0.94fr_1.06fr] gap-6 md:gap-8 items-stretch">
                <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-8 md:p-10 flex flex-col gap-6">
                    <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.3em] text-white/42">Atelier Story</p>
                    <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em]">The piece should feel complete before the customer ever asks a question.</h2>
                    <p className="reveal-text opacity-0 translate-y-8 text-sm md:text-base leading-relaxed text-white/70">{productStory}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-7 flex flex-col gap-4">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">Lead Time</p>
                        <p className="font-serif text-4xl md:text-5xl font-light leading-none text-[#1C1C1C]">{product.lead_time_days} days</p>
                        <p className="text-sm leading-relaxed text-[#1C1C1C]/58">This is the expected atelier turnaround before dispatch. Ready stock and custom work both route through the same polished product story.</p>
                    </div>
                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-7 flex flex-col gap-4">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">Inventory</p>
                        <p className="font-serif text-4xl md:text-5xl font-light leading-none text-[#1C1C1C]">{product.inventory_count > 0 ? product.inventory_count : 'Made'}</p>
                        <p className="text-sm leading-relaxed text-[#1C1C1C]/58">Use the admin panel to shift this piece from ready stock to made-to-order without changing the storefront layout.</p>
                    </div>
                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-7 flex flex-col gap-4 md:col-span-2">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">Atelier Note</p>
                        <p className="font-serif text-3xl md:text-4xl font-light leading-tight text-[#1C1C1C]">{product.artisan_note || 'Every piece in the archive should read as considered, precise, and ready for a client conversation.'}</p>
                    </div>
                </div>
            </section>

            {relatedProducts.length > 0 && (
                <section>
                    <div className="mb-10 md:mb-12 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[#1C1C1C]/10 pb-8">
                        <div>
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/45 mb-4">Continue The Story</p>
                            <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em]">Related Pieces</h2>
                        </div>
                        <a href="/collections" className="reveal-text opacity-0 translate-y-8 transition-link hover-target text-xs uppercase tracking-[0.22em] font-medium">View Full Archive</a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {relatedProducts.map((entry) => (
                            <article key={entry.id || entry.slug} className="flex flex-col gap-5">
                                <a href={buildProductHref(entry)} className="transition-link aspect-[3/4] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C]" data-cursor-text="Inspect">
                                    <img src={resolveProductGallery(entry)[0] || entry.image_main} alt={entry.name} className="w-full h-full object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.04]" />
                                </a>
                                <div className="reveal-text opacity-0 translate-y-8 flex flex-col gap-3">
                                    <div className="flex justify-between items-end gap-4">
                                        <div>
                                            <a href={buildProductHref(entry)} className="transition-link font-serif text-3xl font-light uppercase tracking-[0.08em] hover-target">{entry.name}</a>
                                            {entry.subtitle && <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/58">{entry.subtitle}</p>}
                                        </div>
                                        <p className="shrink-0 text-sm uppercase tracking-[0.2em] font-medium">{formatProductCurrency(entry.price)}</p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
