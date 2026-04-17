import { cookies } from 'next/headers';
import AddToCartBtn from '../../components/AddToCartBtn';
import { createClient } from '../../utils/supabase/server';
import { buildProductHref, formatProductCurrency, resolveProductGallery, sortProducts } from '../../utils/products';

export const dynamic = 'force-dynamic';

const fallbackEditorialPiece = {
    id: 'va-editorial-fallback',
    slug: 'va-editorial-fallback',
    name: 'The VA Signature',
    subtitle: 'A singular silhouette with the attitude of a closing runway image.',
    category: 'Atelier Piece',
    collection: 'Editorial Spotlight',
    price: 520,
    description: 'The piece that carries the sharpest VA point of view: sculptural, controlled, and meant to feel unforgettable in stills and in motion.',
    story: 'This page is not about custom orders. It is about spotlight: the image, the mood, and the one product or look that deserves full-stage treatment after a major shoot, collection reveal, or career-defining moment.',
    artisan_note: 'Use the featured toggle in admin and the lowest sort order to decide which product owns this page next.',
    image_main: 'https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=2000',
    image_detail: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1800',
    gallery: [
        'https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg?auto=compress&cs=tinysrgb&w=1800',
        'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=1800',
    ],
    highlights: [
        'The page hero is controlled from admin through featured plus sort order.',
        'Use story, subtitle, artisan note, and gallery to shape the editorial tone.',
        'The first featured product becomes the lead spotlight automatically.',
    ],
    tags: ['spotlight', 'editorial', 'signature'],
    palette: ['onyx', 'porcelain', 'gold'],
    inventory_count: 1,
    lead_time_days: 10,
};

const spotlightMarkers = [
    ['Scene', 'Editorial'],
    ['Intent', 'Top-tier presence'],
    ['Origin', 'Ruse, Bulgaria'],
];

function buildRelatedSpotlights(products, leadProduct) {
    const relatedProducts = products
        .filter((product) => product.id !== leadProduct.id && product.slug !== leadProduct.slug)
        .filter((product) => product.featured)
        .slice(0, 3);

    if (relatedProducts.length > 0) {
        return relatedProducts;
    }

    return products
        .filter((product) => product.id !== leadProduct.id && product.slug !== leadProduct.slug)
        .slice(0, 3);
}

export default async function SpotlightPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products } = await supabase.from('products').select('*');

    const activeProducts = sortProducts(products ?? []).filter((product) => product.status === 'active');
    const featuredProducts = activeProducts.filter((product) => product.featured);
    const leadProduct = featuredProducts[0] || activeProducts[0] || fallbackEditorialPiece;
    const spotlightGallery = resolveProductGallery(leadProduct);
    const galleryFrames = spotlightGallery.length > 0 ? spotlightGallery : resolveProductGallery(fallbackEditorialPiece);
    const relatedProducts = buildRelatedSpotlights(activeProducts, leadProduct);
    const supportingProducts = relatedProducts.slice(0, 2);
    const filmstripProducts = [leadProduct, ...relatedProducts].slice(0, 4);
    const storyCopy = leadProduct.story || fallbackEditorialPiece.story;
    const quoteCopy = leadProduct.artisan_note || fallbackEditorialPiece.artisan_note;
    const highlightList = leadProduct.highlights?.length > 0 ? leadProduct.highlights.slice(0, 3) : fallbackEditorialPiece.highlights;

    return (
        <div className="pt-28 md:pt-36 pb-24 md:pb-28">
            <section className="px-6 md:px-12 max-w-[1800px] mx-auto mb-12 md:mb-16">
                <div className="grid grid-cols-1 xl:grid-cols-[1.02fr_0.98fr] gap-6 md:gap-8 items-end border-b border-[#1C1C1C]/10 pb-8 md:pb-10">
                    <div>
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-5">Spotlight / Editorial Feature</p>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full">Editorial</h1></div>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display storefront-hero-shift font-serif font-light uppercase translate-y-full">Spotlight</h1></div>
                    </div>

                    <div className="flex flex-col gap-4 md:pb-2">
                        <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">This page is built for the moment when one product deserves more than a card in the archive: the strongest image, the clearest statement, and the product you want people to remember first.</p>
                        <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.26em] text-[#1C1C1C]/42">Controlled in admin by the existing featured toggle and sort order.</p>
                    </div>
                </div>
            </section>

            <section className="px-6 md:px-12 max-w-[1800px] mx-auto mb-16 md:mb-20">
                <div className="grid grid-cols-1 lg:grid-cols-[0.98fr_0.88fr] gap-6 md:gap-8 items-start">
                    <div className="storefront-media-stage relative aspect-[5/4] lg:aspect-auto overflow-hidden rounded-sm bg-[#1C1C1C] view-img hover-target" data-cursor-text="Lead Frame">
                        <img src={galleryFrames[0]} alt={leadProduct.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"></div>
                        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 text-[#EFECE8] flex flex-col gap-4">
                            <p className="text-[10px] uppercase tracking-[0.32em] text-white/55">Lead Look / {leadProduct.collection}</p>
                            <h2 className="storefront-panel-display font-serif font-light uppercase tracking-[0.08em]">{leadProduct.name}</h2>
                            {leadProduct.subtitle && <p className="max-w-xl text-sm md:text-base leading-relaxed text-white/72">{leadProduct.subtitle}</p>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 md:gap-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                            {spotlightMarkers.map(([label, value]) => (
                                <div key={label} className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-4 md:p-5">
                                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">{label}</p>
                                    <p className="font-serif text-xl md:text-2xl font-light leading-tight uppercase">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                            <div className="flex flex-col gap-4">
                                <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/42">Current Lead Product</p>
                                <div className="overflow-hidden"><h3 className="hero-title storefront-section-display font-serif font-light uppercase tracking-[0.08em] translate-y-full">{leadProduct.name}</h3></div>
                                <div className="hero-sub opacity-0 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{formatProductCurrency(leadProduct.price)}</span>
                                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{leadProduct.lead_time_days} day lead time</span>
                                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{leadProduct.inventory_count > 0 ? `${leadProduct.inventory_count} ready now` : 'Made to order'}</span>
                                </div>
                            </div>

                            <p className="hero-sub opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/64">{leadProduct.description}</p>

                            <AddToCartBtn product={leadProduct} />

                            <div className="hero-sub opacity-0 flex flex-col gap-4 border-t border-b border-[#1C1C1C]/10 py-6">
                                {highlightList.map((highlight) => (
                                    <p key={highlight} className="text-xs md:text-sm uppercase tracking-[0.18em] text-[#1C1C1C]/65">{highlight}</p>
                                ))}
                            </div>

                            <div className="hero-sub opacity-0 flex flex-col sm:flex-row gap-4">
                                <a href={buildProductHref(leadProduct)} className="transition-link inline-flex items-center justify-center px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover-target hover:bg-black transition-colors">View Lead Product</a>
                                <a href="/contact" className="transition-link inline-flex items-center justify-center px-8 py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover-target hover:bg-white transition-colors">Contact Atelier</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-6 md:px-12 max-w-[1800px] mx-auto mb-16 md:mb-20">
                <div className="grid grid-cols-1 xl:grid-cols-[0.94fr_1.06fr] gap-6 md:gap-8 items-stretch">
                    <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-8 md:p-10 flex flex-col gap-6 justify-between">
                        <div className="flex flex-col gap-6">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-white/42">Campaign Voice</p>
                            <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em]">A spotlight page should feel like the moment after the audience stops talking.</h2>
                            <p className="reveal-text opacity-0 translate-y-8 text-sm md:text-base leading-relaxed text-white/70">{storyCopy}</p>
                        </div>
                        <p className="reveal-text opacity-0 translate-y-8 text-xl md:text-2xl font-serif font-light leading-relaxed text-white/82">"{quoteCopy}"</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        {galleryFrames.slice(1, 5).map((image, index) => (
                            <div key={`${image}-${index}`} className={`reveal-text opacity-0 translate-y-8 overflow-hidden rounded-sm bg-[#1C1C1C] view-img hover-target ${index === 0 ? 'sm:col-span-2 aspect-[16/10]' : 'aspect-[4/5]'}`} data-cursor-text="Frame">
                                <img src={image} alt={`${leadProduct.name} frame ${index + 2}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-6 md:px-12 max-w-[1800px] mx-auto mb-16 md:mb-20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5">
                    {filmstripProducts.map((product, index) => (
                        <a key={product.id || product.slug || index} href={buildProductHref(product)} className={`transition-link reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 rounded-sm overflow-hidden bg-white/50 hover-target ${index === 0 ? 'md:col-span-2' : ''}`}>
                            <div className={`overflow-hidden bg-[#1C1C1C] ${index === 0 ? 'aspect-[16/10]' : 'aspect-[4/5]'}`}>
                                <img src={resolveProductGallery(product)[0] || product.image_main} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-5 md:p-6 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                                    <span>{index === 0 ? 'Lead Frame' : `Frame ${String(index + 1).padStart(2, '0')}`}</span>
                                    <span>{product.collection}</span>
                                </div>
                                <p className="font-serif text-3xl md:text-4xl font-light leading-none uppercase tracking-[0.08em] text-[#1C1C1C]">{product.name}</p>
                                {product.subtitle && <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{product.subtitle}</p>}
                            </div>
                        </a>
                    ))}
                </div>
            </section>

            {supportingProducts.length > 0 && (
                <section className="px-6 md:px-12 max-w-[1800px] mx-auto">
                    <div className="mb-12 md:mb-16 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[#1C1C1C]/10 pb-8">
                        <div>
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4">Also Featured</p>
                            <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em]">The Supporting Edit</h2>
                        </div>
                        <a href="/collections" className="reveal-text opacity-0 translate-y-8 transition-link hover-target text-xs uppercase tracking-[0.22em] font-medium">View Full Archive</a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
                        {supportingProducts.map((product, index) => (
                            <div key={product.id || product.slug || index} className={`flex flex-col gap-6 ${index === 0 ? 'md:mt-10' : ''}`}>
                                <a href={buildProductHref(product)} className="transition-link w-full aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C]" data-cursor-text="Inspect">
                                    <img src={resolveProductGallery(product)[0] || product.image_main} alt={product.name} className="w-full h-full object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.04]" />
                                </a>
                                <div className="reveal-text opacity-0 translate-y-8 flex flex-col gap-3">
                                    <div className="flex justify-between items-center text-sm uppercase tracking-widest font-medium">
                                        <span>{product.name}</span>
                                        <span>{formatProductCurrency(product.price)}</span>
                                    </div>
                                    <p className="text-sm text-[#1C1C1C]/60 leading-relaxed font-light">{product.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
