import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import ProductDetailAccordions from '../../../components/ProductDetailAccordions';
import ProductGallery from '../../../components/ProductGallery';
import ProductPurchaseControls from '../../../components/ProductPurchaseControls';
import EditableText from '../../../components/site-copy/EditableText';
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
const defaultColorCopy = 'Tone is kept intentionally restrained so the knot structure, line, and silhouette lead first. Contact the atelier if you want the exact tone confirmed before ordering.';
const defaultProductNotesCopy = 'Each piece is finished in small runs, so slight hand-finished variation is part of the character rather than a defect.';
const SIZE_MEASUREMENTS = [
    {
        label: 'XS',
        inch: { bust: '24 - 32', waist: '22 - 30', hips: '26 - 34', back: '11 - 13' },
        cm: { bust: '61 - 81', waist: '56 - 76', hips: '66 - 86', back: '28 - 33' },
    },
    {
        label: 'S',
        inch: { bust: '28 - 34', waist: '23 - 31', hips: '30 - 38', back: '14 - 16' },
        cm: { bust: '71 - 86', waist: '58 - 79', hips: '76 - 97', back: '34 - 39' },
    },
    {
        label: 'M',
        inch: { bust: '33 - 41', waist: '24 - 32', hips: '34 - 42', back: '15 - 17' },
        cm: { bust: '84 - 104', waist: '61 - 81', hips: '86 - 107', back: '38 - 43' },
    },
    {
        label: 'L',
        inch: { bust: '39 - 47', waist: '29 - 37', hips: '40 - 48', back: '15 - 17' },
        cm: { bust: '99 - 119', waist: '74 - 94', hips: '102 - 122', back: '38 - 43' },
    },
    {
        label: 'XL',
        inch: { bust: '45 - 53', waist: '38 - 46', hips: '47 - 55', back: '16 - 18' },
        cm: { bust: '114 - 135', waist: '97 - 117', hips: '119 - 140', back: '41 - 46' },
    },
];

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

function buildAvailabilityState(product) {
    return product.inventory_count > 0 ? 'Ready' : 'Made';
}

function buildLeadTimeLabel(product) {
    return `${product.lead_time_days} day${product.lead_time_days === 1 ? '' : 's'} lead time`;
}

function buildPaletteLabel(product) {
    if (product.palette.length > 0) {
        return product.palette.join(' / ');
    }

    return 'Atelier neutral';
}

function buildColorCopy(product) {
    if (product.palette.length > 0) {
        return `Palette notes include ${product.palette.join(', ')}. The tone direction stays restrained so the ${product.category.toLowerCase()} line reads cleanly inside the ${product.collection.toLowerCase()} story.`;
    }

    return defaultColorCopy;
}

function buildDispatchCopy(product) {
    if (product.inventory_count > 0) {
        return `${product.inventory_count} piece${product.inventory_count === 1 ? '' : 's'} ready to move first, with ${buildLeadTimeLabel(product)} if the atelier prepares another run.`;
    }

    return `Prepared in the atelier with ${buildLeadTimeLabel(product)} before dispatch.`;
}

function DetailCard({ eyebrow, eyebrowKey, title, titleKey, copy, copyKey, wide = false }) {
    return (
        <div className={`reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-5 md:p-6 flex flex-col gap-3 ${wide ? 'md:col-span-2' : ''}`}>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">{eyebrowKey ? <EditableText contentKey={eyebrowKey} fallback={eyebrow} editorLabel={`${eyebrow} card eyebrow`} /> : eyebrow}</p>
            <p className="font-serif text-2xl md:text-3xl font-light leading-tight uppercase tracking-[0.06em] text-[#1C1C1C]">{titleKey ? <EditableText contentKey={titleKey} fallback={title} editorLabel={`${title} card title`} /> : title}</p>
            <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{copyKey ? <EditableText contentKey={copyKey} fallback={copy} editorLabel={`${eyebrow} card copy`} /> : copy}</p>
        </div>
    );
}

function RelatedPieceCard({ product }) {
    const href = buildProductHref(product);
    const image = resolveProductGallery(product)[0] || product.image_main;

    return (
        <article className="flex flex-col gap-4 md:gap-5">
            <a href={href} className="transition-link aspect-[3/4] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C]" data-cursor-text="Inspect">
                <img src={image} alt={product.name} className="w-full h-full object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.04]" />
            </a>

            <div className="reveal-text opacity-0 translate-y-8 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/60 px-3 py-2">{product.collection}</span>
                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/60 px-3 py-2">{product.category}</span>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div>
                        <a href={href} className="transition-link font-serif text-2xl md:text-3xl font-light leading-none uppercase tracking-[0.08em] hover-target">{product.name}</a>
                        {product.subtitle && <p className="mt-3 max-w-md text-sm leading-relaxed text-[#1C1C1C]/58">{product.subtitle}</p>}
                    </div>

                    <p className="shrink-0 text-sm uppercase tracking-[0.2em] font-medium text-[#1C1C1C]">{formatProductCurrency(product.price)}</p>
                </div>
            </div>
        </article>
    );
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
    const paletteLabel = buildPaletteLabel(product);
    const sizeOptions = [...SIZE_MEASUREMENTS.map((entry) => entry.label), 'Custom'];
    const accordionSections = [
        {
            title: 'Product Notes',
            copy: product.tags.length > 0 ? `Filed under ${product.tags.join(', ')}.` : defaultProductNotesCopy,
            titleKey: 'product.accordion.product_notes.title',
            copyKey: product.tags.length > 0 ? null : 'product.accordion.product_notes.copy',
            bullets: highlightList,
        },
        {
            title: 'Size & Fit',
            copy: product.fit_notes || defaultFitCopy,
            titleKey: 'product.accordion.size_fit.title',
            copyKey: product.fit_notes ? null : 'product.accordion.size_fit.copy',
        },
        {
            title: 'Size & Measurements',
            copy: 'Use the standard XS to XL chart below as the closest starting point before ordering. If you need a made-for-you fit, choose Custom in the purchase panel and enter your body measurements there.',
            titleKey: 'product.accordion.size_measurements.title',
            copyKey: 'product.accordion.size_measurements.copy',
            table: SIZE_MEASUREMENTS,
        },
        {
            title: 'Color & Palette',
            copy: buildColorCopy(product),
            titleKey: 'product.accordion.color_palette.title',
            copyKey: product.palette.length > 0 ? null : 'product.accordion.color_palette.copy',
            chips: product.palette,
        },
        {
            title: 'Materials & Care',
            copy: materialsCopy || defaultCareCopy,
            titleKey: 'product.accordion.materials_care.title',
            copyKey: materialsCopy ? null : 'product.accordion.materials_care.copy',
        },
        {
            title: 'Shipping & Returns',
            copy: defaultShippingCopy,
            titleKey: 'product.accordion.shipping_returns.title',
            copyKey: 'product.accordion.shipping_returns.copy',
        },
    ];
    const detailPanels = [
        {
            eyebrow: 'Atelier Finish',
            eyebrowKey: 'product.detail_cards.atelier_finish.eyebrow',
            title: product.artisan_note ? 'Hand-tensioned final pass' : 'Finished in small runs',
            titleKey: product.artisan_note ? null : 'product.detail_cards.atelier_finish.title',
            copy: product.artisan_note || 'Every piece is checked by hand so the structure stays controlled, directional, and easy to wear around other tailored layers.',
            copyKey: product.artisan_note ? null : 'product.detail_cards.atelier_finish.copy',
        },
        {
            eyebrow: 'Dispatch',
            eyebrowKey: 'product.detail_cards.dispatch.eyebrow',
            title: buildAvailabilityLabel(product),
            copy: buildDispatchCopy(product),
        },
        {
            eyebrow: 'Palette & Mood',
            eyebrowKey: 'product.detail_cards.palette.eyebrow',
            title: paletteLabel,
            titleKey: product.palette.length > 0 ? null : 'product.detail_cards.palette.title',
            copy: buildColorCopy(product),
            copyKey: product.palette.length > 0 ? null : 'product.detail_cards.palette.copy',
            wide: true,
        },
    ];

    return (
        <div className="pt-28 md:pt-36 pb-24 md:pb-28 px-6 md:px-12 max-w-[1800px] mx-auto">
            <section className="mb-10 md:mb-14 border-b border-[#1C1C1C]/10 pb-8 md:pb-10">
                <div className="grid grid-cols-1 xl:grid-cols-[1.04fr_0.96fr] gap-6 md:gap-8 items-end">
                    <div>
                        <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="product.hero.eyebrow_prefix" fallback="Product" editorLabel="Product hero eyebrow prefix" /> / {product.collection}</p>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full">{product.name}</h1></div>
                    </div>

                    <div className="flex flex-col gap-4 max-w-2xl xl:justify-self-end xl:pl-8">
                        {product.subtitle && <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">{product.subtitle}</p>}
                        <div className="hero-sub opacity-0 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{product.category}</span>
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{buildAvailabilityLabel(product)}</span>
                            {product.palette.slice(0, 3).map((tone) => (
                                <span key={tone} className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{tone}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-16 md:mb-20 grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-8 md:gap-10 items-start">
                <div className="min-w-0">
                    <ProductGallery productName={product.name} collection={product.collection} category={product.category} gallery={gallery} palette={product.palette} />
                </div>

                <div className="xl:pl-4">
                    <div className="sticky top-28 flex flex-col gap-5 md:gap-6">
                        <div className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm p-6 md:p-8 flex flex-col gap-6 md:gap-7">
                            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#1C1C1C]/10 pb-5">
                                <div className="flex flex-col gap-2">
                                    <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">{product.collection} / {product.category}</p>
                                    <p className="hero-sub opacity-0 font-serif text-4xl md:text-5xl font-light leading-none text-[#1C1C1C]">{formatProductCurrency(product.price)}</p>
                                    {product.compare_at_price && product.compare_at_price > product.price && (
                                        <p className="hero-sub opacity-0 text-xs uppercase tracking-[0.24em] text-[#1C1C1C]/40 line-through">{formatProductCurrency(product.compare_at_price)}</p>
                                    )}
                                </div>

                                <div className="hero-sub opacity-0 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45 xl:text-right">
                                    <span>{buildAvailabilityLabel(product)}</span>
                                    <span>{buildLeadTimeLabel(product)}</span>
                                </div>
                            </div>

                            <p className="hero-sub opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/65">{product.description}</p>

                            <div className="hero-sub opacity-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="product.summary.availability" fallback="Availability" editorLabel="Product availability label" /></p>
                                    <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]">{buildAvailabilityState(product)}</p>
                                </div>
                                <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="product.summary.lead_time" fallback="Lead Time" editorLabel="Product lead time label" /></p>
                                    <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]">{product.lead_time_days}d</p>
                                </div>
                                <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="product.summary.piece_type" fallback="Piece Type" editorLabel="Product piece type label" /></p>
                                    <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]">{product.category}</p>
                                </div>
                            </div>

                            <ProductPurchaseControls product={product} sizeOptions={sizeOptions} toneOptions={product.palette} />

                            <div className="hero-sub opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <a href="/contact" className="transition-link hover-target inline-flex items-center justify-center px-6 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:bg-white transition-colors"><EditableText contentKey="product.cta.contact_atelier" fallback="Contact Atelier" editorLabel="Product contact atelier CTA" /></a>
                                <a href="/collections" className="transition-link hover-target inline-flex items-center justify-center px-6 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:bg-white transition-colors"><EditableText contentKey="product.cta.return_to_archive" fallback="Return To Archive" editorLabel="Product return to archive CTA" /></a>
                            </div>
                        </div>

                        <ProductDetailAccordions sections={accordionSections} />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1540px] mb-14 md:mb-16 grid grid-cols-1 xl:grid-cols-[0.9fr_1fr] gap-5 md:gap-6 items-stretch">
                <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-8 flex flex-col gap-5 justify-between">
                    <div className="flex flex-col gap-6">
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.3em] text-white/42"><EditableText contentKey="product.story.eyebrow" fallback="Atelier Story" editorLabel="Product story eyebrow" /></p>
                        <h2 className="reveal-text opacity-0 translate-y-8 storefront-panel-display font-serif font-light uppercase tracking-[0.08em]"><EditableText contentKey="product.story.title" fallback="A piece should read with clarity from the first glance and hold attention once you move closer." editorLabel="Product story title" /></h2>
                        <p className="reveal-text opacity-0 translate-y-8 text-sm leading-relaxed text-white/70">{productStory}</p>
                    </div>

                    <p className="reveal-text opacity-0 translate-y-8 text-lg md:text-xl font-serif font-light leading-relaxed text-white/84">"{product.artisan_note || 'Finished by hand so the structure stays controlled, tactile, and easy to style around.'}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {detailPanels.map((panel) => (
                        <DetailCard key={panel.eyebrow} eyebrow={panel.eyebrow} eyebrowKey={panel.eyebrowKey} title={panel.title} titleKey={panel.titleKey} copy={panel.copy} copyKey={panel.copyKey} wide={panel.wide} />
                    ))}
                </div>
            </section>

            {relatedProducts.length > 0 && (
                <section>
                    <div className="mb-10 md:mb-12 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[#1C1C1C]/10 pb-8">
                        <div>
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="product.related.eyebrow" fallback="Continue The Story" editorLabel="Product related eyebrow" /></p>
                            <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em]"><EditableText contentKey="product.related.title" fallback="Related Pieces" editorLabel="Product related title" /></h2>
                        </div>
                        <a href="/collections" className="reveal-text opacity-0 translate-y-8 transition-link hover-target text-xs uppercase tracking-[0.22em] font-medium"><EditableText contentKey="product.related.view_archive" fallback="View Full Archive" editorLabel="Product related view archive CTA" /></a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {relatedProducts.map((entry) => (
                            <RelatedPieceCard key={entry.id || entry.slug} product={entry} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
