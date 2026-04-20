import { cookies } from 'next/headers';
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
    artisan_note: 'The strongest look should feel memorable before the archive steps in with the detail.',
    image_main: 'https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=2000',
    image_detail: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1800',
    gallery: [
        'https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg?auto=compress&cs=tinysrgb&w=1800',
        'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=1800',
    ],
    highlights: [
        'Built to anchor an edit with a single confident silhouette.',
        'Pairs sculptural line with a restrained palette direction.',
        'Lets the archive carry the fit and ordering detail once the mood is set.',
    ],
    tags: ['spotlight', 'editorial', 'signature'],
    palette: ['onyx', 'porcelain', 'gold'],
    inventory_count: 1,
    lead_time_days: 10,
};

function trimCopy(value, maxLength = 180) {
    const normalizedValue = String(value || '').trim();

    if (!normalizedValue) {
        return '';
    }

    if (normalizedValue.length <= maxLength) {
        return normalizedValue;
    }

    return `${normalizedValue.slice(0, maxLength - 3).trimEnd()}...`;
}

function getProductKey(product) {
    return product.id || product.slug;
}

function resolveSpotlightImage(product, fallbackIndex = 0) {
    const productGallery = resolveProductGallery(product);

    if (productGallery[fallbackIndex]) {
        return productGallery[fallbackIndex];
    }

    if (productGallery[0]) {
        return productGallery[0];
    }

    const fallbackGallery = resolveProductGallery(fallbackEditorialPiece);
    return fallbackGallery[fallbackIndex] || fallbackGallery[0];
}

function buildEditorialDeck(product) {
    const highlightDeck = Array.isArray(product?.highlights) ? product.highlights.filter(Boolean) : [];

    if (highlightDeck.length > 0) {
        return highlightDeck.slice(0, 3);
    }

    const generatedDeck = [
        product?.subtitle,
        product?.description,
        product?.palette?.length > 0 ? `${product.palette.slice(0, 3).join(' / ')} palette direction.` : '',
    ]
        .map((entry) => trimCopy(entry, 120))
        .filter(Boolean)
        .slice(0, 3);

    return generatedDeck.length > 0 ? generatedDeck : fallbackEditorialPiece.highlights;
}

function buildSpotlightEdit(products, leadProduct) {
    const relatedProducts = products
        .filter((product) => product.id !== leadProduct.id && product.slug !== leadProduct.slug)
        .filter((product) => product.featured)
        .slice(0, 4);

    if (relatedProducts.length > 0) {
        return relatedProducts;
    }

    return products
        .filter((product) => product.id !== leadProduct.id && product.slug !== leadProduct.slug)
        .slice(0, 4);
}

function buildLeadCopy(product) {
    return trimCopy(product.story || product.description || fallbackEditorialPiece.story, 340);
}

function buildLeadQuote(product) {
    return trimCopy(product.artisan_note || product.subtitle || fallbackEditorialPiece.artisan_note, 190);
}

function buildEditReason(product) {
    const editorialDeck = buildEditorialDeck(product);

    if (editorialDeck[0]) {
        return editorialDeck[0];
    }

    return `${product.collection} direction with a restrained ${String(product.category || 'atelier').toLowerCase()} silhouette.`;
}

function formatPieceCount(count) {
    return `${count} piece${count === 1 ? '' : 's'}`;
}

export default async function SpotlightPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products } = await supabase.from('products').select('*');

    const activeProducts = sortProducts(products ?? []).filter((product) => product.status === 'active');
    const featuredProducts = activeProducts.filter((product) => product.featured);
    const leadProduct = featuredProducts[0] || activeProducts[0] || fallbackEditorialPiece;
    const spotlightEdit = buildSpotlightEdit(activeProducts, leadProduct);
    const hasLiveLeadProduct = activeProducts.length > 0;
    const leadImage = resolveSpotlightImage(leadProduct);
    const leadHref = hasLiveLeadProduct ? buildProductHref(leadProduct) : '/collections';
    const storyCopy = buildLeadCopy(leadProduct);
    const quoteCopy = buildLeadQuote(leadProduct);
    const editorialDeck = buildEditorialDeck(leadProduct);
    const spotlightCount = featuredProducts.length > 0 ? featuredProducts.length : Math.max(1, 1 + spotlightEdit.length);
    const paletteChips = leadProduct.palette?.length > 0 ? leadProduct.palette.slice(0, 3) : fallbackEditorialPiece.palette.slice(0, 3);
    const spotlightMarkers = [
        ['Lead Look', leadProduct.collection || 'Atelier Edit'],
        ['Piece Type', leadProduct.category || 'Atelier Piece'],
        ['Current Edit', formatPieceCount(spotlightCount)],
    ];

    return (
        <div className="pt-36 sm:pt-40 md:pt-36 pb-24 md:pb-28">
            <section className="px-5 sm:px-6 md:px-12 max-w-[1800px] mx-auto mb-12 md:mb-16">
                <div className="grid grid-cols-1 xl:grid-cols-[1.02fr_0.98fr] gap-5 md:gap-8 items-start xl:items-end border-b border-[#1C1C1C]/10 pb-7 md:pb-10">
                    <div className="min-w-0 max-w-full overflow-hidden">
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-5">Spotlight / Editorial Feature</p>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full">Editorial</h1></div>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display storefront-hero-shift font-serif font-light uppercase translate-y-full">Spotlight</h1></div>
                    </div>

                    <div className="min-w-0 flex flex-col gap-4 md:pb-2">
                        <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">Spotlight now works as a rotating editorial edit: one lead look, a small supporting cast, and enough atmosphere to set the tone before the archive takes over with the full product detail.</p>
                        <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.26em] text-[#1C1C1C]/42">A tighter house edit from the atelier, not a second product page.</p>
                    </div>
                </div>
            </section>

            <section className="px-5 sm:px-6 md:px-12 max-w-[1800px] mx-auto mb-16 md:mb-20">
                <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-5 md:gap-8 items-start">
                    <a href={leadHref} className="spotlight-lead-stage transition-link min-w-0 storefront-media-stage relative block aspect-[4/5] sm:aspect-[5/4] lg:aspect-auto overflow-hidden rounded-sm bg-[#1C1C1C] view-img hover-target" data-cursor-text="Lead Look">
                        <img src={leadImage} alt={leadProduct.name} className="spotlight-lead-image w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/16 to-transparent"></div>
                        <div className="absolute inset-x-0 bottom-0 min-w-0 max-w-full overflow-hidden p-5 sm:p-6 md:p-8 text-[#EFECE8] flex flex-col gap-3 md:gap-4">
                            <p className="text-[10px] uppercase tracking-[0.32em] text-white/55">Current Lead Look</p>
                            <h2 className="storefront-panel-display max-w-[12ch] sm:max-w-[14ch] lg:max-w-[11ch] font-serif font-light uppercase tracking-[0.03em] md:tracking-[0.08em] leading-[0.94] [overflow-wrap:anywhere]">{leadProduct.name}</h2>
                            {leadProduct.subtitle && <p className="max-w-[20rem] sm:max-w-xl text-sm md:text-base leading-relaxed text-white/72 [overflow-wrap:anywhere]">{trimCopy(leadProduct.subtitle, 140)}</p>}
                        </div>
                    </a>

                    <div className="min-w-0 flex flex-col gap-5 md:gap-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                            {spotlightMarkers.map(([label, value]) => (
                                <div key={label} className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-4 md:p-5">
                                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">{label}</p>
                                    <p className="font-serif text-xl md:text-2xl font-light leading-tight uppercase">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-5 sm:p-6 md:p-8 flex flex-col gap-5 md:gap-6">
                            <div className="flex flex-col gap-4">
                                <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/42">Lead Note</p>
                                <div className="overflow-hidden"><h3 className="hero-title storefront-section-display font-serif font-light uppercase tracking-[0.05em] md:tracking-[0.08em] translate-y-full [overflow-wrap:anywhere]">{leadProduct.name}</h3></div>
                                <div className="hero-sub opacity-0 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{formatProductCurrency(leadProduct.price)}</span>
                                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{leadProduct.collection}</span>
                                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{leadProduct.category}</span>
                                    {paletteChips.map((tone) => (
                                        <span key={tone} className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{tone}</span>
                                    ))}
                                </div>
                            </div>

                            <p className="hero-sub opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/64">{storyCopy}</p>

                            <p className="hero-sub opacity-0 border-l border-[#1C1C1C]/14 pl-4 text-lg md:text-xl font-serif font-light leading-relaxed text-[#1C1C1C]/82">"{quoteCopy}"</p>

                            <div className="hero-sub opacity-0 flex flex-col gap-4 border-t border-b border-[#1C1C1C]/10 py-6">
                                {editorialDeck.map((highlight, index) => (
                                    <p key={`${highlight}-${index}`} className="text-[11px] md:text-sm uppercase tracking-[0.16em] md:tracking-[0.18em] text-[#1C1C1C]/65">{highlight}</p>
                                ))}
                            </div>

                            <div className="hero-sub opacity-0 flex flex-col sm:flex-row gap-3 md:gap-4">
                                <a href={leadHref} className="transition-link inline-flex w-full sm:w-auto items-center justify-center px-6 sm:px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center hover-target hover:bg-black transition-colors">{hasLiveLeadProduct ? 'Open Lead Product' : 'Browse Archive'}</a>
                                <a href="/collections" className="transition-link inline-flex w-full sm:w-auto items-center justify-center px-6 sm:px-8 py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium text-center hover-target hover:bg-white transition-colors">Browse Archive</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-5 sm:px-6 md:px-12 max-w-[1800px] mx-auto mb-16 md:mb-20">
                <div className="grid grid-cols-1 xl:grid-cols-[0.96fr_1.04fr] gap-6 md:gap-8 items-stretch">
                    <div className="min-w-0 border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-10 flex flex-col gap-5 md:gap-6 justify-between">
                        <div className="flex flex-col gap-6">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-white/42">Campaign Voice</p>
                            <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.06em] md:tracking-[0.1em] [overflow-wrap:anywhere]">Spotlight should hold the atmosphere of a collection without retelling the whole product page.</h2>
                            <p className="reveal-text opacity-0 translate-y-8 text-sm md:text-base leading-relaxed text-white/70">{storyCopy}</p>
                        </div>
                        <p className="reveal-text opacity-0 translate-y-8 text-lg sm:text-xl md:text-2xl font-serif font-light leading-relaxed text-white/82 break-words">"{quoteCopy}"</p>
                    </div>

                    <div className="min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                        {editorialDeck.map((entry, index) => (
                            <div key={`${entry}-${index}`} className="reveal-text opacity-0 translate-y-8 border border-white/12 bg-white/[0.04] rounded-sm p-5 md:p-6 flex flex-col gap-5 justify-between">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/38">Focus {String(index + 1).padStart(2, '0')}</p>
                                <p className="font-serif text-2xl md:text-3xl font-light leading-[1.02] text-white">{entry}</p>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-white/46">Held inside the current edit</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-5 sm:px-6 md:px-12 max-w-[1800px] mx-auto mb-16 md:mb-20">
                <div className="mb-12 md:mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1C1C1C]/10 pb-8">
                    <div>
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4">The Spotlight Edit</p>
                        <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.06em] md:tracking-[0.1em] [overflow-wrap:anywhere]">Supporting Pieces Around The Lead Look</h2>
                    </div>
                    <p className="reveal-text opacity-0 translate-y-8 max-w-xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/58">Each supporting piece gets one clear frame and one short reason to be here. Full construction, fit, and ordering detail stay on the actual product pages.</p>
                </div>

                {spotlightEdit.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
                        {spotlightEdit.map((product, index) => (
                            <a key={getProductKey(product) || index} href={buildProductHref(product)} className={`transition-link reveal-text opacity-0 translate-y-8 min-w-0 border border-[#1C1C1C]/10 rounded-sm overflow-hidden bg-white/50 hover-target ${index === 0 && spotlightEdit.length >= 3 ? 'xl:col-span-2' : ''}`}>
                                <div className={`overflow-hidden bg-[#1C1C1C] ${index === 0 && spotlightEdit.length >= 3 ? 'aspect-[16/10]' : 'aspect-[4/5]'}`}>
                                    <img src={resolveSpotlightImage(product)} alt={product.name} className="w-full h-full object-cover transition-transform duration-[1.8s] ease-out hover:scale-[1.03]" />
                                </div>
                                <div className="p-5 md:p-6 flex flex-col gap-4">
                                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                                        <span>Frame {String(index + 1).padStart(2, '0')}</span>
                                        <span>{product.collection}</span>
                                    </div>
                                    <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-light leading-[0.96] uppercase tracking-[0.05em] md:tracking-[0.08em] text-[#1C1C1C] [overflow-wrap:anywhere]">{product.name}</p>
                                    <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{trimCopy(buildEditReason(product), 150)}</p>
                                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                                        <span>{formatProductCurrency(product.price)}</span>
                                        <span>Open Product</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div className="max-w-2xl">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/42 mb-4">Single Look Edit</p>
                            <p className="font-serif text-2xl md:text-4xl font-light leading-[0.98] uppercase text-[#1C1C1C]">This rotation currently holds one lead look only.</p>
                            <p className="mt-4 text-sm md:text-base leading-relaxed text-[#1C1C1C]/58">Open the lead piece for the full product story, or step into the archive to explore the wider collection around it.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                            <a href={leadHref} className="transition-link inline-flex items-center justify-center px-6 sm:px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center hover-target hover:bg-black transition-colors">{hasLiveLeadProduct ? 'Open Lead Product' : 'Browse Archive'}</a>
                            <a href="/collections" className="transition-link inline-flex items-center justify-center px-6 sm:px-8 py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium text-center hover-target hover:bg-white transition-colors">View Archive</a>
                        </div>
                    </div>
                )}
            </section>

            <section className="px-5 sm:px-6 md:px-12 max-w-[1800px] mx-auto">
                <div className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm px-6 md:px-10 py-8 md:py-10 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8 xl:gap-10">
                    <div className="max-w-3xl">
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/42 mb-4">Next Step</p>
                        <h2 className="reveal-text opacity-0 translate-y-8 storefront-panel-display font-serif font-light uppercase tracking-[0.06em] md:tracking-[0.08em] text-[#1C1C1C]">Spotlight sets the mood. The archive carries the full detail.</h2>
                        <p className="reveal-text opacity-0 translate-y-8 mt-4 text-sm md:text-base leading-relaxed text-[#1C1C1C]/58">If this look is the one, open the product page for measurements, fit notes, and ordering. If you want the broader picture, move through the collections and keep the edit expanding from there.</p>
                    </div>

                    <div className="reveal-text opacity-0 translate-y-8 flex flex-col sm:flex-row gap-3 md:gap-4">
                        <a href={leadHref} className="transition-link inline-flex items-center justify-center px-6 sm:px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center hover-target hover:bg-black transition-colors">{hasLiveLeadProduct ? 'View Lead Product' : 'Browse Archive'}</a>
                        <a href="/collections" className="transition-link inline-flex items-center justify-center px-6 sm:px-8 py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium text-center hover-target hover:bg-white transition-colors">View Full Archive</a>
                    </div>
                </div>
            </section>
        </div>
    );
}
