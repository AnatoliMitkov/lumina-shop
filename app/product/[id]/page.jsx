import { cookies } from 'next/headers';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import ProductDetailAccordions from '../../../components/ProductDetailAccordions';
import ProductGallery from '../../../components/ProductGallery';
import ProductContactWrapper from '../../../components/ProductContactWrapper';
import EditableRichText from '../../../components/site-copy/EditableRichText';
import EditableText from '../../../components/site-copy/EditableText';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, normalizeLanguage } from '../../../utils/language';
import { getProductFieldCopyKey, getProductIndexedCopyKey, getProductOptionCopyKey } from '../../../utils/product-copy';
import { createClient } from '../../../utils/supabase/server';
import {
    buildProductHref,
    formatProductCurrency,
    normalizeProductRecord,
    resolveProductGallery,
    sortProducts,
} from '../../../utils/products';
import { absoluteSiteUrl } from '../../../utils/seo';

export const dynamic = 'force-dynamic';

const defaultCareCopy = localizedFallback(
    'Crafted from organic cotton cord and finished by hand. Spot clean only, avoid machine washing, and store flat between wears to preserve the knot structure.',
    'Изработен от органичен памучен шнур и завършен на ръка. Почиствайте само локално, избягвайте машинно пране и съхранявайте в хоризонтално положение, за да запазите структурата на възлите.'
);
const defaultFitCopy = localizedFallback(
    'Designed to feel sculptural rather than conventional. If you are between sizes or commissioning a private fit, contact the atelier before ordering.',
    'Създаден да стои скулптурно, а не конвенционално. Ако сте между размери или искате персонална кройка, свържете се с ателието преди поръчка.'
);
const defaultShippingCopy = localizedFallback(
    'Complimentary worldwide shipping on orders above €300. Ready pieces dispatch faster, while made-to-order work follows the listed atelier lead time.',
    'Безплатна международна доставка при поръчки над €300. Наличните модели се изпращат по-бързо, а изработката по поръчка следва посочения срок на ателието.'
);
const defaultColorCopy = localizedFallback(
    'Tone is kept intentionally restrained so the knot structure, line, and silhouette lead first. Contact the atelier if you want the exact tone confirmed before ordering.',
    'Тоналността е умишлено сдържана, така че структурата, линията и силуетът да водят. Ако искате потвърждение за точния тон преди поръчка, свържете се с ателието.'
);
const defaultProductNotesCopy = localizedFallback(
    'Each piece is finished in small runs, so slight hand-finished variation is part of the character rather than a defect.',
    'Всеки модел се завършва в малки серии, затова леките следи от ръчна работа са част от характера му, а не дефект.'
);
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

const productBodySizeClassNames = {
    xs: 'text-xs md:text-sm',
    sm: 'text-sm md:text-base',
    body: 'text-sm md:text-base',
    lg: 'text-base md:text-lg',
    xl: 'text-lg md:text-xl',
    display: 'text-xl md:text-2xl',
};

const productQuoteSizeClassNames = {
    xs: 'text-base md:text-lg',
    sm: 'text-lg md:text-xl',
    body: 'text-lg md:text-xl',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-3xl',
    display: 'text-3xl md:text-4xl',
};

const getCatalog = cache(async () => {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products } = await supabase.from('products').select('*');

    return sortProducts(products ?? []).map((entry) => normalizeProductRecord(entry));
});

export async function generateMetadata({ params }) {
    const { id } = await params;
    const catalog = await getCatalog();
    const product = catalog.find((entry) => entry.id === id || entry.slug === id);

    if (!product) {
        return {
            title: 'Product',
        };
    }

    const canonicalPath = buildProductHref(product);
    const description = product.subtitle || product.description || `${product.name} by The VA Store.`;
    const gallery = resolveProductGallery(product);
    const primaryImage = gallery[0] || '/icon-512.png';

    return {
        title: product.name,
        description,
        alternates: {
            canonical: canonicalPath,
        },
        openGraph: {
            type: 'website',
            title: product.name,
            description,
            url: canonicalPath,
            images: [
                {
                    url: primaryImage.startsWith('http') ? primaryImage : absoluteSiteUrl(primaryImage),
                    alt: product.name,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description,
            images: [primaryImage.startsWith('http') ? primaryImage : absoluteSiteUrl(primaryImage)],
        },
    };
}

function buildHighlightList(product) {
    if (product.highlights.length > 0) {
        return product.highlights;
    }

    return [
        localizedFallback(`${product.collection} direction`, `${product.collection} линия`),
        localizedFallback(`${product.category} silhouette`, `${product.category} силует`),
        product.inventory_count > 0
            ? localizedFallback('Ready-to-ship stock available', 'Наличност за по-бързо изпращане')
            : localizedFallback('Made-to-order atelier finish', 'Изработка по поръчка в ателието'),
    ];
}

function buildAvailabilityLabel(product) {
    if (product.inventory_count > 0) {
        return localizedFallback(
            `${product.inventory_count} ready now`,
            `${product.inventory_count} ${product.inventory_count === 1 ? 'наличен сега' : 'налични сега'}`
        );
    }

    return localizedFallback('Made to order', 'Изработка по поръчка');
}

function buildAvailabilityState(product) {
    return product.inventory_count > 0 ? 'Ready' : 'Made';
}

function buildLeadTimeLabel(product) {
    return localizedFallback(
        `${product.lead_time_days} day${product.lead_time_days === 1 ? '' : 's'} lead time`,
        `${product.lead_time_days} ${product.lead_time_days === 1 ? 'ден' : 'дни'} срок`
    );
}

function buildPaletteLabel(product) {
    if (product.palette.length > 0) {
        return product.palette.join(' / ');
    }

    return localizedFallback('Atelier neutral', 'Atelier neutral');
}

function buildColorCopy(product) {
    if (product.palette.length > 0) {
        return localizedFallback(
            `Palette notes include ${product.palette.join(', ')}. The tone direction stays restrained so the ${product.category.toLowerCase()} line reads cleanly inside the ${product.collection.toLowerCase()} story.`,
            `Палитрата включва ${product.palette.join(', ')}. Тоналността остава сдържана, така че силуетът на ${product.category} да стои чисто в историята на ${product.collection}.`
        );
    }

    return defaultColorCopy;
}

function buildDispatchCopy(product) {
    if (product.inventory_count > 0) {
        return localizedFallback(
            `${product.inventory_count} piece${product.inventory_count === 1 ? '' : 's'} ready to move first, with ${product.lead_time_days} day${product.lead_time_days === 1 ? '' : 's'} lead time if the atelier prepares another run.`,
            product.inventory_count === 1
                ? `1 модел е готов за по-бързо изпращане, а при нова изработка срокът е ${product.lead_time_days} ${product.lead_time_days === 1 ? 'ден' : 'дни'}.`
                : `${product.inventory_count} модела са готови за по-бързо изпращане, а при нова изработка срокът е ${product.lead_time_days} ${product.lead_time_days === 1 ? 'ден' : 'дни'}.`
        );
    }

    return localizedFallback(
        `Prepared in the atelier with ${product.lead_time_days} day${product.lead_time_days === 1 ? '' : 's'} lead time before dispatch.`,
        `Подготвя се в ателието със срок ${product.lead_time_days} ${product.lead_time_days === 1 ? 'ден' : 'дни'} преди изпращане.`
    );
}

function DetailCard({ eyebrow, eyebrowKey, title, titleKey, copy, copyKey, wide = false, editorLabelBase = 'Detail card' }) {
    return (
        <div className={`reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-5 md:p-6 flex flex-col gap-3 ${wide ? 'md:col-span-2' : ''}`}>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">{eyebrowKey ? <EditableText contentKey={eyebrowKey} fallback={eyebrow} editorLabel={`${editorLabelBase} eyebrow`} /> : eyebrow}</p>
            <p className="font-serif text-2xl md:text-3xl font-light leading-tight uppercase tracking-[0.06em] text-[#1C1C1C]">{titleKey ? <EditableText contentKey={titleKey} fallback={title} editorLabel={`${editorLabelBase} title`} /> : title}</p>
            <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{copyKey ? <EditableText contentKey={copyKey} fallback={copy} editorLabel={`${editorLabelBase} copy`} /> : copy}</p>
        </div>
    );
}

function RelatedPieceCard({ product }) {
    const href = buildProductHref(product);
    const image = resolveProductGallery(product)[0] || product.image_main;
    const productCollectionKey = getProductFieldCopyKey(product, 'collection');
    const productCategoryKey = getProductFieldCopyKey(product, 'category');
    const productNameKey = getProductFieldCopyKey(product, 'name');
    const productSubtitleKey = getProductFieldCopyKey(product, 'subtitle');

    return (
        <article className="flex flex-col gap-4 md:gap-5">
            <a href={href} className="transition-link aspect-[3/4] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C]" data-cursor-text="Inspect">
                <img src={image} alt={product.name} className="w-full h-full object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.04]" />
            </a>

            <div className="reveal-text opacity-0 translate-y-8 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/60 px-3 py-2"><EditableText contentKey={productCollectionKey} fallback={product.collection} editorLabel={`${product.name || 'Product'} related collection`} /></span>
                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/60 px-3 py-2"><EditableText contentKey={productCategoryKey} fallback={product.category} editorLabel={`${product.name || 'Product'} related category`} /></span>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div>
                        <a href={href} className="transition-link font-serif text-2xl md:text-3xl font-light leading-none uppercase tracking-[0.08em] hover-target"><EditableText contentKey={productNameKey} fallback={product.name} editorLabel={`${product.name || 'Product'} related title`} /></a>
                        {product.subtitle && <p className="mt-3 max-w-md text-sm leading-relaxed text-[#1C1C1C]/58"><EditableText contentKey={productSubtitleKey} fallback={product.subtitle} editorLabel={`${product.name || 'Product'} related subtitle`} /></p>}
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
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const catalog = await getCatalog();
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
    const productNameKey = getProductFieldCopyKey(product, 'name');
    const productSubtitleKey = getProductFieldCopyKey(product, 'subtitle');
    const productDescriptionKey = getProductFieldCopyKey(product, 'description');
    const productStoryKey = getProductFieldCopyKey(product, 'story');
    const productArtisanNoteKey = getProductFieldCopyKey(product, 'artisan_note');
    const productCollectionKey = getProductFieldCopyKey(product, 'collection');
    const productCategoryKey = getProductFieldCopyKey(product, 'category');
    const productAvailabilityLabelKey = getProductFieldCopyKey(product, 'availability_label');
    const productLeadTimeLabelKey = getProductFieldCopyKey(product, 'lead_time_label');
    const productPaletteLabelKey = getProductFieldCopyKey(product, 'palette_label');
    const productColorCopyKey = getProductFieldCopyKey(product, 'color_copy');
    const productDispatchCopyKey = getProductFieldCopyKey(product, 'dispatch_copy');
    const productMaterialsCareKey = getProductFieldCopyKey(product, 'materials_care');
    const productFitNotesKey = getProductFieldCopyKey(product, 'fit_notes');
    const productNotesCopyKey = getProductFieldCopyKey(product, 'notes_copy');
    const highlightItems = buildHighlightList(product).map((item, index) => ({
        contentKey: getProductIndexedCopyKey(product, 'highlights', index),
        fallback: item,
        editorLabel: `${product.name || 'Product'} highlight ${index + 1}`,
    }));
    const paletteItems = product.palette.map((tone) => ({
        contentKey: getProductOptionCopyKey(product, 'palette', tone),
        fallback: tone,
        editorLabel: `${product.name || 'Product'} palette ${tone}`,
    }));
    const accordionSections = [
        {
            id: 'product-notes',
            title: localizedFallback('Product Notes', 'Бележки за модела'),
            copy: product.tags.length > 0
                ? localizedFallback(`Filed under ${product.tags.join(', ')}.`, `Ключови бележки: ${product.tags.join(', ')}.`)
                : defaultProductNotesCopy,
            copyKey: productNotesCopyKey,
            bullets: highlightItems,
        },
        {
            id: 'size-fit',
            title: localizedFallback('Size & Fit', 'Размер и стоене'),
            copy: product.fit_notes || defaultFitCopy,
            copyKey: productFitNotesKey,
        },
        {
            id: 'size-measurements',
            title: localizedFallback('Size & Measurements', 'Размери и мерки'),
            copy: localizedFallback(
                'Use the standard XS to XL chart below as the closest starting point before ordering. If you need a made-for-you fit, choose Custom in the purchase panel and enter your body measurements there.',
                'Използвайте стандартната таблица от XS до XL по-долу като най-близка отправна точка преди поръчка. Ако искате изработка по вас, изберете Custom в панела за покупка и въведете мерките си там.'
            ),
            copyKey: 'product.accordion.size_measurements.copy',
            table: SIZE_MEASUREMENTS,
        },
        {
            id: 'color-palette',
            title: localizedFallback('Color & Palette', 'Цвят и палитра'),
            copy: buildColorCopy(product),
            copyKey: productColorCopyKey,
            chips: paletteItems,
        },
        {
            id: 'materials-care',
            title: localizedFallback('Materials & Care', 'Материи и поддръжка'),
            copy: materialsCopy || defaultCareCopy,
            copyKey: productMaterialsCareKey,
        },
        {
            id: 'shipping-returns',
            title: localizedFallback('Shipping & Returns', 'Доставка и връщане'),
            copy: defaultShippingCopy,
            copyKey: 'product.accordion.shipping_returns.copy',
        },
    ];
    const detailPanels = [
        {
            eyebrow: localizedFallback('Atelier Finish', 'Завършек в ателието'),
            eyebrowKey: 'product.detail_cards.atelier_finish.eyebrow',
            title: product.artisan_note
                ? localizedFallback('Final hand-finished pass', 'Финален ръчен завършек')
                : localizedFallback('Finished in small runs', 'Завършен в малки серии'),
            titleKey: product.artisan_note ? 'product.detail_cards.atelier_finish.note_title' : 'product.detail_cards.atelier_finish.title',
            copy: product.artisan_note || localizedFallback('Every piece is checked by hand so the structure stays controlled, directional, and easy to wear around other tailored layers.', 'Всеки модел се проверява на ръка, за да остане структурата контролирана, изчистена и лесна за носене с други силуети.'),
            copyKey: productArtisanNoteKey,
            editorLabelBase: 'Atelier finish card',
        },
        {
            eyebrow: localizedFallback('Dispatch', 'Изпращане'),
            eyebrowKey: 'product.detail_cards.dispatch.eyebrow',
            title: buildAvailabilityLabel(product),
            titleKey: productAvailabilityLabelKey,
            copy: buildDispatchCopy(product),
            copyKey: productDispatchCopyKey,
            editorLabelBase: 'Dispatch card',
        },
        {
            eyebrow: localizedFallback('Palette & Mood', 'Палитра и настроение'),
            eyebrowKey: 'product.detail_cards.palette.eyebrow',
            title: paletteLabel,
            titleKey: productPaletteLabelKey,
            copy: buildColorCopy(product),
            copyKey: productColorCopyKey,
            wide: true,
            editorLabelBase: 'Palette card',
        },
    ];

    return (
        <div className="shell-page-pad-tight max-w-[1800px] mx-auto">
            <section className="mb-10 md:mb-14 border-b border-[#1C1C1C]/10 pb-8 md:pb-10">
                <div className="grid grid-cols-1 xl:grid-cols-[1.04fr_0.96fr] gap-6 md:gap-8 items-end">
                    <div>
                        <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="product.hero.eyebrow_prefix" fallback={localizedFallback('Product', 'Продукт')} editorLabel="Product hero eyebrow prefix" /> / <EditableText contentKey={productCollectionKey} fallback={product.collection} editorLabel={`${product.name || 'Product'} collection`} /></p>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full"><EditableText contentKey={productNameKey} fallback={product.name} editorLabel={`${product.name || 'Product'} title`} /></h1></div>
                    </div>

                    <div className="flex flex-col gap-4 max-w-2xl xl:justify-self-end xl:pl-8">
                        {product.subtitle && (
                            <EditableRichText
                                contentKey={productSubtitleKey}
                                fallback={product.subtitle}
                                editorLabel={`${product.name || 'Product'} subtitle`}
                                className="hero-sub storefront-copy-measure opacity-0"
                                blockBaseClassName="leading-relaxed text-[#1C1C1C]/62"
                                sizeClassNames={productBodySizeClassNames}
                            />
                        )}
                        <div className="hero-sub opacity-0 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2"><EditableText contentKey={productCategoryKey} fallback={product.category} editorLabel={`${product.name || 'Product'} category`} /></span>
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2"><EditableText contentKey={productAvailabilityLabelKey} fallback={buildAvailabilityLabel(product)} editorLabel={`${product.name || 'Product'} availability label`} /></span>
                            {product.palette.slice(0, 3).map((tone) => (
                                <span key={tone} className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2"><EditableText contentKey={getProductOptionCopyKey(product, 'palette', tone)} fallback={tone} editorLabel={`${product.name || 'Product'} hero tone ${tone}`} /></span>
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
                                    <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42"><EditableText contentKey={productCollectionKey} fallback={product.collection} editorLabel={`${product.name || 'Product'} purchase collection`} /> / <EditableText contentKey={productCategoryKey} fallback={product.category} editorLabel={`${product.name || 'Product'} purchase category`} /></p>
                                    <p className="hero-sub opacity-0 font-serif text-4xl md:text-5xl font-light leading-none text-[#1C1C1C]">{formatProductCurrency(product.price)}</p>
                                    {product.compare_at_price && product.compare_at_price > product.price && (
                                        <p className="hero-sub opacity-0 text-xs uppercase tracking-[0.24em] text-[#1C1C1C]/40 line-through">{formatProductCurrency(product.compare_at_price)}</p>
                                    )}
                                </div>

                                <div className="hero-sub opacity-0 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45 xl:text-right">
                                    <span><EditableText contentKey={productAvailabilityLabelKey} fallback={buildAvailabilityLabel(product)} editorLabel={`${product.name || 'Product'} price card availability`} /></span>
                                    <span><EditableText contentKey={productLeadTimeLabelKey} fallback={buildLeadTimeLabel(product)} editorLabel={`${product.name || 'Product'} lead time`} /></span>
                                </div>
                            </div>

                            <EditableRichText
                                contentKey={productDescriptionKey}
                                fallback={product.description}
                                editorLabel={`${product.name || 'Product'} description`}
                                className="hero-sub opacity-0"
                                blockBaseClassName="leading-relaxed text-[#1C1C1C]/65"
                                sizeClassNames={productBodySizeClassNames}
                            />

                            <div className="hero-sub opacity-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="product.summary.availability" fallback={localizedFallback('Availability', 'Наличност')} editorLabel="Product availability label" /></p>
                                    <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]"><EditableText contentKey={getProductFieldCopyKey(product, 'availability_state')} fallback={localizedFallback(buildAvailabilityState(product), product.inventory_count > 0 ? 'Налично' : 'Изработка')} editorLabel={`${product.name || 'Product'} availability state`} /></p>
                                </div>
                                <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="product.summary.lead_time" fallback={localizedFallback('Lead Time', 'Срок')} editorLabel="Product lead time label" /></p>
                                    <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]"><EditableText contentKey={getProductFieldCopyKey(product, 'lead_time_compact')} fallback={localizedFallback(`${product.lead_time_days}d`, `${product.lead_time_days} ${product.lead_time_days === 1 ? 'ден' : 'дни'}`)} editorLabel={`${product.name || 'Product'} compact lead time`} /></p>
                                </div>
                                <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="product.summary.piece_type" fallback={localizedFallback('Piece Type', 'Тип изделие')} editorLabel="Product piece type label" /></p>
                                    <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]"><EditableText contentKey={productCategoryKey} fallback={product.category} editorLabel={`${product.name || 'Product'} summary category`} /></p>
                                </div>
                            </div>

                            <ProductContactWrapper product={product} sizeOptions={sizeOptions} toneOptions={product.palette} />
                        </div>

                        <ProductDetailAccordions sections={accordionSections} language={currentLanguage} />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1540px] mb-14 md:mb-16 grid grid-cols-1 xl:grid-cols-[0.9fr_1fr] gap-5 md:gap-6 items-stretch">
                <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-8 flex flex-col gap-5 justify-between">
                    <div className="flex flex-col gap-6">
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.3em] text-white/42"><EditableText contentKey="product.story.eyebrow" fallback={localizedFallback('Atelier Story', 'История на ателието')} editorLabel="Product story eyebrow" /></p>
                        <h2 className="reveal-text opacity-0 translate-y-8 storefront-panel-display font-serif font-light uppercase tracking-[0.08em]"><EditableText contentKey="product.story.title" fallback={localizedFallback('A piece should read with clarity from the first glance and hold attention once you move closer.', 'Една дреха трябва да се чете ясно от пръв поглед и да задържа вниманието, когато се приближите.')} editorLabel="Product story title" /></h2>
                        <EditableRichText
                            contentKey={productStoryKey}
                            fallback={productStory}
                            editorLabel={`${product.name || 'Product'} story`}
                            className="reveal-text opacity-0 translate-y-8"
                            blockBaseClassName="leading-relaxed text-white/70"
                            sizeClassNames={productBodySizeClassNames}
                        />
                    </div>

                    <EditableRichText
                        contentKey={productArtisanNoteKey}
                        fallback={product.artisan_note || 'Finished by hand so the structure stays controlled, tactile, and easy to style around.'}
                        editorLabel={`${product.name || 'Product'} artisan note`}
                        className="reveal-text opacity-0 translate-y-8"
                        blockBaseClassName="font-serif font-light leading-relaxed text-white/84"
                        sizeClassNames={productQuoteSizeClassNames}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {detailPanels.map((panel) => (
                        <DetailCard key={panel.eyebrowKey || panel.editorLabelBase} eyebrow={panel.eyebrow} eyebrowKey={panel.eyebrowKey} title={panel.title} titleKey={panel.titleKey} copy={panel.copy} copyKey={panel.copyKey} wide={panel.wide} editorLabelBase={panel.editorLabelBase} />
                    ))}
                </div>
            </section>

            {relatedProducts.length > 0 && (
                <section>
                    <div className="mb-10 md:mb-12 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[#1C1C1C]/10 pb-8">
                        <div>
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="product.related.eyebrow" fallback={localizedFallback('Continue The Story', 'Продължете историята')} editorLabel="Product related eyebrow" /></p>
                            <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em]"><EditableText contentKey="product.related.title" fallback={localizedFallback('Related Pieces', 'Свързани модели')} editorLabel="Product related title" /></h2>
                        </div>
                        <a href="/collections" className="reveal-text opacity-0 translate-y-8 transition-link hover-target text-xs uppercase tracking-[0.22em] font-medium"><EditableText contentKey="product.related.view_archive" fallback={localizedFallback('View Full Archive', 'Вижте целия архив')} editorLabel="Product related view archive CTA" /></a>
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
