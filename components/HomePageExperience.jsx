"use client";

import { useState } from 'react';
import EditableMediaAsset from './site-copy/EditableMediaAsset';
import EditableMedia from './site-copy/EditableMedia';
import EditableMediaFrame from './site-copy/EditableMediaFrame';
import EditableRichText from './site-copy/EditableRichText';
import EditableText from './site-copy/EditableText';
import { detectEditableMediaKind } from './site-copy/media-kind';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { DEFAULT_LANGUAGE, createLocalizedValue as localizedFallback, normalizeLanguage, resolveLocalizedValue } from '../utils/language';
import { getTaxonomyStorageKey } from '../utils/product-taxonomy';
import { buildCollectionsHref } from '../utils/products';
import { buildProductHref, formatProductCurrency, resolveStorefrontGallery } from '../utils/storefront-products';
import { createSiteCopyRichTextDocument, resolveSiteCopyMediaEntry } from '../utils/site-copy';
import { SPOTLIGHT_PATH } from '../utils/site-routes';

const containMediaDefaults = {
    fitDesktop: 'contain',
    fitMobile: 'contain',
    scaleDesktop: 1,
    scaleMobile: 1,
};

const coverMediaDefaults = {
    fitDesktop: 'cover',
    fitMobile: 'cover',
    scaleDesktop: 1,
    scaleMobile: 1,
};

const storyBackdropMediaDefaults = {
    fitDesktop: 'cover',
    fitMobile: 'cover',
    positionDesktop: { x: 72, y: 50 },
    positionMobile: { x: 58, y: 50 },
    scaleDesktop: 1.04,
    scaleMobile: 1.08,
};

const storyPanelLabelFallback = 'My Story / Моята история';

// Change this single value to tune the overall darkness of the My Story backdrop.
const STORY_BACKDROP_DARKNESS = 0.15;

const storySurfaceClassNames = {
    shell: 'relative isolate min-h-[42rem] overflow-hidden rounded-[1.75rem] bg-[#050505] text-white shadow-[0_40px_120px_rgba(0,0,0,0.42)] md:min-h-[46rem] xl:min-h-[50rem]',
    glassGlow: 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_38%)]',
};

const storySurfaceVariableStyle = {
    '--story-backdrop-darkness': String(STORY_BACKDROP_DARKNESS),
};

const storySurfaceLayerStyles = {
    layeredTone: {
        background: 'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 30%), radial-gradient(circle at 78% 76%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 28%), linear-gradient(115deg, rgb(2 2 2 / calc(var(--story-backdrop-darkness) * 1.08)) 0%, rgb(2 2 2 / calc(var(--story-backdrop-darkness) * 0.44)) 42%, rgb(2 2 2 / calc(var(--story-backdrop-darkness) * 0.92)) 100%)',
    },
    vignette: {
        background: 'linear-gradient(180deg, rgb(0 0 0 / calc(var(--story-backdrop-darkness) * 0.14)) 0%, rgb(0 0 0 / calc(var(--story-backdrop-darkness) * 0.28)) 38%, rgb(0 0 0 / calc(var(--story-backdrop-darkness) * 0.76)) 100%)',
    },
    leftShade: {
        background: 'linear-gradient(90deg, rgb(0 0 0 / calc(var(--story-backdrop-darkness) * 0.72)) 0%, rgb(0 0 0 / calc(var(--story-backdrop-darkness) * 0.34)) 42%, rgb(0 0 0 / 0) 78%)',
    },
};

const storyCopyFallback = createSiteCopyRichTextDocument([
    {
        type: 'paragraph',
        size: 'sm',
        text: 'Every silhouette begins as a study in tension, line, and hand-knotting discipline. The atelier treats slow craft as structure, turning traditional techniques into an editorial language that feels directional rather than nostalgic.',
    },
]);

const storyCopySizeClassNames = {
    xs: 'text-[11px] min-[380px]:text-xs md:text-sm',
    sm: 'text-[13px] min-[380px]:text-[13.5px] md:text-base',
    body: 'text-[14px] min-[380px]:text-[15px] md:text-lg',
    lg: 'text-[15px] min-[380px]:text-base md:text-xl',
    xl: 'text-[17px] min-[380px]:text-lg md:text-2xl',
    display: 'text-[20px] min-[380px]:text-2xl md:text-4xl',
};

const storyActionLinks = [
    {
        key: 'about',
        href: '/about',
        label: localizedFallback('About', 'За ателието'),
    },
    {
        key: 'journal',
        href: '/journal',
        label: localizedFallback('Blog / Vlog', 'Блог / Влог'),
    },
    {
        key: 'contact',
        href: '/contact',
        label: localizedFallback('Contact', 'Контакт'),
    },
];

// Keep the home hero headlines in code so they are easy to edit locally.
const homeHeroTitleCopyByLanguage = {
    en: {
        primary: ['MINIMAL'],
        secondary: ['SCULPTURAL PIECES',],
    },
    bg: {
        primary: ['Ексклузивност',],
        secondary: ['родена от всеки възел'],
    },
};

const homeHeroSubtextCopyByLanguage = {
    en: [
        'Sculpted forms. Subversive silhouettes. Handmade for confident women.',
    ],
    bg: [
        'Изящни форми. Провокативни силуети. Създадено за увереност.',
    ],
};

const heroTitleSizeClassNames = {
    xs: 'text-4xl md:text-5xl xl:text-6xl',
    sm: 'text-5xl md:text-6xl xl:text-7xl',
    body: 'text-5xl md:text-6xl xl:text-7xl',
    lg: 'text-6xl md:text-7xl xl:text-[8rem]',
    xl: 'text-6xl md:text-7xl xl:text-[8rem]',
    display: 'storefront-home-display',
};

const heroTitleBlockClassNames = {
    heading1: 'font-serif font-light uppercase tracking-[0.04em] leading-[0.98] text-[#EFECE8] md:tracking-[0.08em] md:leading-[0.9]',
    heading2: 'font-serif font-light uppercase tracking-[0.04em] leading-[1] text-[#EFECE8] md:tracking-[0.08em] md:leading-[0.92]',
    heading3: 'font-serif font-light uppercase tracking-[0.04em] leading-[1] text-[#EFECE8] md:tracking-[0.08em] md:leading-[0.96]',
    paragraph: 'max-w-[24rem] font-sans text-[#EFECE8] normal-case tracking-[0.14em] leading-[1.35]',
    quote: 'max-w-[24rem] border-l border-white/20 pl-4 font-sans italic text-[#EFECE8] normal-case tracking-[0.08em] leading-[1.3]',
    'bullet-list': 'max-w-[24rem] list-disc pl-5 space-y-2 font-sans text-[#EFECE8] normal-case tracking-[0.08em] leading-[1.35]',
    'numbered-list': 'max-w-[24rem] list-decimal pl-5 space-y-2 font-sans text-[#EFECE8] normal-case tracking-[0.08em] leading-[1.35]',
};

function resolveHomeHeroTitleCopy(language = DEFAULT_LANGUAGE) {
    return homeHeroTitleCopyByLanguage[language] || homeHeroTitleCopyByLanguage[DEFAULT_LANGUAGE];
}

function resolveHomeHeroSubtextCopy(language = DEFAULT_LANGUAGE) {
    return homeHeroSubtextCopyByLanguage[language] || homeHeroSubtextCopyByLanguage[DEFAULT_LANGUAGE];
}

function buildLocalizedSiteCopyStorageKey(key = '', language = DEFAULT_LANGUAGE) {
    const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

    return normalizedLanguage === DEFAULT_LANGUAGE ? key : `${normalizedLanguage}::${key}`;
}

function resolveExactSiteCopyText(siteCopy, storageKey = '', fallback = '', language = DEFAULT_LANGUAGE) {
    const entry = siteCopy?.getRawEntry?.(storageKey);

    if (typeof entry === 'string' && entry.trim()) {
        return entry;
    }

    return resolveLocalizedValue(fallback, language);
}

function HomeHeroTitleLines({ lines = [], className = '', itemClassName = '' }) {
    if (!Array.isArray(lines) || lines.length === 0) {
        return null;
    }

    return (
        <div className={className}>
            <div className="lumina-text-content flex flex-col gap-4">
                {lines.map((line, index) => (
                    <h2 key={`${index}-${line}`} className={`${heroTitleBlockClassNames.heading2} ${heroTitleSizeClassNames.display} ${itemClassName}`.trim()}>
                        <span>{line}</span>
                    </h2>
                ))}
            </div>
        </div>
    );
}

function HomeHeroSubtextLines({ lines = [], className = '' }) {
    if (!Array.isArray(lines) || lines.length === 0) {
        return null;
    }

    return (
        <div className={className}>
            <div className="lumina-text-content flex flex-col gap-4">
                {lines.map((line, index) => (
                    <p key={`${index}-${line}`} className="font-sans font-light normal-case tracking-[0.06em] leading-[1.48] text-[#EFECE8]/88 md:tracking-[0.12em] leading-relaxed text-base md:text-lg">
                        <span>{line}</span>
                    </p>
                ))}
            </div>
        </div>
    );
}

const categoryShowcaseItems = [
    {
        key: 'evening-edit',
        mediaKey: 'atelier-archive',
        filterValue: localizedFallback('Evening Structures', 'Вечерна селекция'),
        titleFallback: localizedFallback('Evening Structures', 'Вечерна селекция'),
        labelFallback: localizedFallback('After Dark', 'Вечерна линия'),
        image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1800',
        layout: 'h-[16rem] md:h-[20rem] xl:h-[22rem]',
    },
    {
        key: 'signature-weaves',
        mediaKey: 'evening-structures',
        filterValue: localizedFallback('Signature Weaves', 'Signature Weaves'),
        titleFallback: localizedFallback('Signature Weaves', 'Авторски плетки'),
        labelFallback: localizedFallback('Knotted Signatures', 'Авторски възли'),
        image: 'https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=1400',
        layout: 'h-[16rem] md:h-[20rem] xl:h-[22rem]',
    },
    {
        key: 'accessories-edit',
        mediaKey: 'private-commission',
        filterValue: localizedFallback('Accessories', 'Аксесоари'),
        titleFallback: localizedFallback('Accessories', 'Аксесоари'),
        labelFallback: localizedFallback('Statement Accents', 'Акцентни модели'),
        image: 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=1800',
        layout: 'h-[16rem] md:h-[20rem] xl:h-[22rem]',
    },
];

const marqueeItems = [
    { key: 'wearable-architecture', copy: 'Wearable Architecture' },
    { key: 'uncompromising-craft', copy: 'Uncompromising Craft' },
    { key: 'editorial-spotlight', copy: 'Editorial Spotlight' },
    { key: 'victoria-built', copy: 'Victoria Built' },
];

function isValidNewsletterEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function getFeaturedProductDiscountMetrics(product = {}) {
    const compareAtPrice = Number(product.compare_at_price ?? 0);
    const currentPrice = Number(product.price ?? 0);

    if (!Number.isFinite(compareAtPrice) || !Number.isFinite(currentPrice) || compareAtPrice <= currentPrice || currentPrice < 0) {
        return {
            hasDiscount: false,
            compareAtPrice: null,
            discountPercent: 0,
        };
    }

    return {
        hasDiscount: true,
        compareAtPrice,
        discountPercent: Math.max(1, Math.round(((compareAtPrice - currentPrice) / compareAtPrice) * 100)),
    };
}

function HomeFeaturedProductCard({ product, collectionLabel, translations }) {
    const gallery = resolveStorefrontGallery(product);
    const primaryImage = gallery[0] || product.image_main;
    const secondaryImage = gallery[1] || primaryImage;
    const href = buildProductHref(product);
    const discountMetrics = getFeaturedProductDiscountMetrics(product);

    return (
        <a key={product.id || product.slug || product.name} href={href} className="group block h-full hover-target transition-link">
            <article className="flex h-full flex-col rounded-[1.4rem] border border-[#1C1C1C]/10 bg-white/74 p-3 shadow-[0_18px_46px_rgba(28,28,28,0.05)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5 group-hover:border-[#1C1C1C]/18 group-hover:shadow-[0_26px_60px_rgba(28,28,28,0.08)] md:p-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-[#D8D1C7]">
                    {discountMetrics.hasDiscount && (
                        <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-[#b74638]/18 bg-[#fff6f3]/96 px-3 py-2 text-[#b74638] shadow-[0_14px_32px_rgba(183,70,56,0.12)]">
                            <span className="text-[9px] uppercase tracking-[0.28em]">{translations.promo}</span>
                            <span className="font-serif text-sm font-light leading-none">-{discountMetrics.discountPercent}%</span>
                        </div>
                    )}
                    <img className="absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms] ease-out group-hover:scale-[1.04] group-hover:opacity-0" src={primaryImage} alt={product.name} />
                    <img className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-[1200ms] ease-out group-hover:scale-[1.04] group-hover:opacity-100" src={secondaryImage} alt={`${product.name} alternate view`} />
                </div>

                <div className="flex flex-1 flex-col gap-3 px-1 pb-1 pt-4 md:gap-4 md:px-2 md:pt-5">
                    <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-[#1C1C1C]/46">
                        {collectionLabel ? (
                            <span className="inline-flex rounded-full border border-[#1C1C1C]/10 bg-[#EFECE8] px-3 py-1.5">{collectionLabel}</span>
                        ) : null}
                        <span className="inline-flex rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-1.5 text-[#1C1C1C]/56">{translations.featured}</span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="font-serif text-[1.08rem] font-light uppercase leading-[1.04] tracking-[0.05em] text-[#1C1C1C] [overflow-wrap:anywhere] md:text-[1.28rem] md:tracking-[0.06em]">{product.name}</h3>
                            {product.subtitle ? (
                                <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/56">{product.subtitle}</p>
                            ) : null}
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1 text-right">
                            <p className="text-xs uppercase tracking-[0.18em] font-medium text-[#1C1C1C] md:text-sm">{formatProductCurrency(product.price)}</p>
                            {discountMetrics.hasDiscount ? (
                                <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[#b74638] line-through">{formatProductCurrency(discountMetrics.compareAtPrice)}</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-[#1C1C1C]/10 pt-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/46 md:pt-4">
                        <span>{discountMetrics.hasDiscount ? `${translations.save} ${discountMetrics.discountPercent}%` : translations.viewPiece}</span>
                        <span className="text-[#1C1C1C]/72">{translations.inspect}</span>
                    </div>
                </div>
            </article>
        </a>
    );
}

export default function HomePageExperience({ featuredProducts = [] }) {
    const siteCopy = useSiteCopy();
    const activeLanguage = normalizeLanguage(siteCopy?.activeLanguage) || DEFAULT_LANGUAGE;
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
    const [newsletterStatus, setNewsletterStatus] = useState({ type: 'idle', message: '' });
    const heroTitleCopy = resolveHomeHeroTitleCopy(activeLanguage);
    const heroSubtextCopy = resolveHomeHeroSubtextCopy(activeLanguage);
    const resolveNewsletterText = (key, fallback) => siteCopy
        ? siteCopy.resolveText(key, fallback)
        : resolveLocalizedValue(fallback, activeLanguage);
    const newsletterPlaceholder = resolveNewsletterText('home.newsletter.placeholder', localizedFallback('Email address', 'Имейл адрес'));
    const newsletterButtonLabel = resolveNewsletterText('home.newsletter.button', localizedFallback('Subscribe', 'Абонирай се'));
    const newsletterSubmittingLabel = resolveNewsletterText('home.newsletter.button.submitting', localizedFallback('Submitting...', 'Изпращане...'));
    const featuredCardTranslations = {
        promo: siteCopy ? siteCopy.resolveText('home.featured.card.promo', localizedFallback('Promo', 'Промо')) : resolveLocalizedValue(localizedFallback('Promo', 'Промо'), activeLanguage),
        featured: siteCopy ? siteCopy.resolveText('home.featured.card.featured', localizedFallback('Featured', 'Подбрано')) : resolveLocalizedValue(localizedFallback('Featured', 'Подбрано'), activeLanguage),
        save: siteCopy ? siteCopy.resolveText('home.featured.card.save', localizedFallback('Save', 'Спестяваш')) : resolveLocalizedValue(localizedFallback('Save', 'Спестяваш'), activeLanguage),
        viewPiece: siteCopy ? siteCopy.resolveText('home.featured.card.view_piece', localizedFallback('View Piece', 'Виж модела')) : resolveLocalizedValue(localizedFallback('View Piece', 'Виж модела'), activeLanguage),
        inspect: siteCopy ? siteCopy.resolveText('home.featured.card.inspect', localizedFallback('Inspect', 'Разгледай')) : resolveLocalizedValue(localizedFallback('Inspect', 'Разгледай'), activeLanguage),
    };
    const resolveLanguageScopedText = (key, fallback) => resolveExactSiteCopyText(siteCopy, buildLocalizedSiteCopyStorageKey(key, activeLanguage), fallback, activeLanguage);
    const resolveShowcaseCollectionTitle = (collection, fallback) => resolveExactSiteCopyText(siteCopy, getTaxonomyStorageKey('collection', collection, activeLanguage), fallback, activeLanguage);
    const categoryShowcaseEyebrow = resolveLanguageScopedText('home.category_showcase.eyebrow', localizedFallback('Category Showcase', 'Подбрани колекции'));
    const categoryShowcaseTitle = resolveLanguageScopedText('home.category_showcase.title', localizedFallback('Selected', 'Избрани колекции'));
    const categoryShowcaseCopy = resolveLanguageScopedText('home.category_showcase.copy', localizedFallback('Discover the Atelier', 'Три колекции с директен път към точния архив.'));
    const heroMediaFallback = 'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/Logos/7679415-uhd_4096_2160_25fps.mp4';
    const heroMediaSrc = siteCopy ? siteCopy.resolveMedia('home.hero.media.video', heroMediaFallback) : heroMediaFallback;
    const heroMediaKind = detectEditableMediaKind(heroMediaSrc, 'video');
    const heroMediaDefaults = heroMediaKind === 'video' ? coverMediaDefaults : containMediaDefaults;
    const heroMediaEntry = siteCopy
        ? siteCopy.resolveMediaEntry('home.hero.media.video', heroMediaFallback, heroMediaDefaults)
        : resolveSiteCopyMediaEntry(heroMediaSrc, heroMediaFallback, heroMediaDefaults);
    const heroBackdropEntry = {
        ...heroMediaEntry,
        fitDesktop: 'cover',
        fitMobile: 'cover',
        scaleDesktop: Math.max(heroMediaEntry.scaleDesktop, 1.08),
        scaleMobile: Math.max(heroMediaEntry.scaleMobile, 1.08),
    };

    const handleNewsletterSubmit = async (event) => {
        event.preventDefault();

        const nextEmail = newsletterEmail.trim().toLowerCase();

        if (!isValidNewsletterEmail(nextEmail)) {
            setNewsletterStatus({
                type: 'error',
                message: resolveNewsletterText(
                    'home.newsletter.status.invalid_email',
                    localizedFallback('Please enter a valid email address.', 'Моля, въведете валиден имейл адрес.')
                ),
            });
            return;
        }

        setIsNewsletterSubmitting(true);
        setNewsletterStatus({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: nextEmail,
                    language: activeLanguage,
                    source: 'homepage',
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error
                    || resolveNewsletterText(
                        'home.newsletter.status.error',
                        localizedFallback('Unable to save your subscription right now.', 'Не успяхме да запишем абонамента в момента.')
                    )
                );
            }

            setNewsletterEmail('');
            setNewsletterStatus({
                type: 'success',
                message: data.message
                    || resolveNewsletterText(
                        'home.newsletter.status.success',
                        localizedFallback("You're on the atelier list.", 'Вече сте в списъка на ателието.')
                    ),
            });
        } catch (error) {
            setNewsletterStatus({
                type: 'error',
                message: error?.message
                    || resolveNewsletterText(
                        'home.newsletter.status.error',
                        localizedFallback('Unable to save your subscription right now.', 'Не успяхме да запишем абонамента в момента.')
                    ),
            });
        } finally {
            setIsNewsletterSubmitting(false);
        }
    };

    return (
        <>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 25s linear infinite;
                }
                @media (max-width: 767px) {
                    html[lang='en'] .home-hero-title-shell .home-hero-primary-line.storefront-home-display {
                        font-size: clamp(2.45rem, 12.2vw, 4.1rem) !important;
                        line-height: 0.9 !important;
                        letter-spacing: 0.015em !important;
                    }

                    html[lang='en'] .home-hero-title-shell .home-hero-secondary-line.storefront-home-display {
                        font-size: clamp(1.9rem, 9.4vw, 3rem) !important;
                        line-height: 0.96 !important;
                        letter-spacing: 0.045em !important;
                    }

                    html[lang='bg'] .home-hero-title-shell .home-hero-primary-line.storefront-home-display {
                        font-size: clamp(2.25rem, 11.2vw, 3.7rem) !important;
                        line-height: 0.9 !important;
                        letter-spacing: 0.015em !important;
                    }

                    html[lang='bg'] .home-hero-title-shell .home-hero-secondary-line.storefront-home-display {
                        font-size: clamp(1.55rem, 7.9vw, 2.55rem) !important;
                        line-height: 0.97 !important;
                        letter-spacing: 0.04em !important;
                    }
                }

                @media (min-width: 768px) {
                    html[lang='bg'] .home-hero-title-shell {
                        transform: none;
                    }

                    html[lang='bg'] .home-hero-title-shell .storefront-home-display {
                        font-size: clamp(2.8rem, 5.7vw, 5.9rem) !important;
                        line-height: 0.9 !important;
                        text-wrap: balance;
                    }

                    html[lang='bg'] .home-hero-title-shell h1,
                    html[lang='bg'] .home-hero-title-shell h2,
                    html[lang='bg'] .home-hero-title-shell h3 {
                        letter-spacing: 0.03em !important;
                        line-height: 0.94 !important;
                    }

                    html[lang='bg'] .home-hero-title-shell h1 span,
                    html[lang='bg'] .home-hero-title-shell h2 span,
                    html[lang='bg'] .home-hero-title-shell h3 span {
                        letter-spacing: 0.01em !important;
                    }

                    html[lang='bg'] .home-hero-title-shell .home-hero-secondary-line.storefront-home-display {
                        font-size: clamp(1.8rem, 4vw, 3.75rem) !important;
                        line-height: 0.98 !important;
                    }
                }
            `}</style>

            <section className="relative w-full flex flex-col overflow-hidden" style={{ minHeight: '100svh', height: '100svh' }}>
                <div className="relative w-full flex items-center justify-center overflow-hidden" style={{ minHeight: 0, flex: '1 1 auto' }}>
                    <div className="absolute inset-0 z-0 bg-[#1C1C1C]">
                        {heroMediaKind === 'video' ? (
                            <EditableMedia
                                contentKey="home.hero.media.video"
                                fallback={heroMediaFallback}
                                editorLabel="Home hero background media"
                                mediaKind="video"
                                wrapperClassName="absolute inset-0"
                                className="hero-img h-full w-full object-cover opacity-0 scale-125"
                                defaultMediaSettings={coverMediaDefaults}
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                }}
                                videoProps={{
                                    preload: 'auto',
                                    'aria-hidden': true,
                                }}
                            />
                        ) : (
                            <EditableMediaFrame
                                contentKey="home.hero.media.video"
                                fallback={heroMediaFallback}
                                editorLabel="Home hero background media"
                                mediaKind="video"
                                className="absolute inset-0"
                                defaultMediaSettings={heroMediaDefaults}
                            >
                                <EditableMediaAsset
                                    source={heroMediaEntry.src}
                                    alt="Home hero banner background"
                                    fallbackKind="image"
                                    mediaConfig={heroBackdropEntry}
                                    className="hero-img absolute inset-0 h-full w-full opacity-0 blur-[18px] brightness-[0.42] saturate-[0.82]"
                                    imageProps={{ draggable: false }}
                                />

                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(28,28,28,0)_42%)]"></div>

                                <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-6 md:px-10 xl:px-12">
                                    <EditableMediaAsset
                                        source={heroMediaEntry.src}
                                        alt="Home hero banner"
                                        fallbackKind="image"
                                        mediaConfig={heroMediaEntry}
                                        className="hero-img h-full w-full max-w-[1900px] opacity-0"
                                        imageProps={{ draggable: false }}
                                    />
                                </div>
                            </EditableMediaFrame>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#11110f] via-[#11110f]/0 to-transparent"></div>
                    </div>

                    <div className="relative z-10 flex h-full min-h-0 w-full flex-col items-start justify-end gap-5 px-6 pb-10 pt-28 text-[#EFECE8] min-[380px]:gap-6 min-[380px]:pb-12 min-[380px]:pt-32 md:flex-row md:items-end md:justify-between md:gap-10 md:px-12 md:pb-16 md:pt-0 xl:pb-[4.5rem]">
                        <div className="home-hero-title-shell w-full max-w-[19rem] min-[380px]:max-w-[22rem] md:min-w-0 md:flex-1 md:max-w-none">
                            <div className="md:overflow-hidden md:-mb-[0.5vw]">
                                <HomeHeroTitleLines
                                    lines={heroTitleCopy.primary}
                                    className="hero-title home-hero-mobile-title md:translate-y-full"
                                    itemClassName="home-hero-primary-line"
                                />
                            </div>
                            {heroTitleCopy.secondary.length > 0 ? (
                                <div className="mt-1 min-[380px]:mt-2 md:mt-0 md:block md:overflow-hidden">
                                    <HomeHeroTitleLines
                                        lines={heroTitleCopy.secondary}
                                        className="hero-title home-hero-mobile-title storefront-home-shift md:translate-y-full"
                                        itemClassName="home-hero-secondary-line"
                                    />
                                </div>
                            ) : null}
                        </div>
                        <div className="w-full max-w-[18.5rem] min-[380px]:max-w-[20.5rem] md:w-[clamp(24.5rem,31vw,26.75rem)] md:max-w-[26.75rem] md:flex-shrink-0 md:pb-0 flex flex-col gap-3 md:gap-4">
                            <HomeHeroSubtextLines
                                lines={heroSubtextCopy}
                                className="hero-sub home-hero-mobile-copy opacity-0"
                            />
                            <div className="hero-sub w-full h-[1px] bg-white/30 opacity-0"></div>
                            <p className="hero-sub text-[10px] tracking-[0.28em] uppercase opacity-0 hover-target cursor-pointer w-max md:text-xs md:tracking-widest"><EditableText contentKey="home.hero.scroll_prompt" fallback="Scroll to explore ↓" editorLabel="Home hero scroll prompt" /></p>
                        </div>
                    </div>
                </div>

                <div className="w-full py-6 overflow-hidden flex whitespace-nowrap bg-[#11110f]/100 text-[#EFECE8] border-b border-white/10 hover-target" data-cursor-text="Scroll">
                    {[false, true].map((isDuplicate) => (
                        <div key={isDuplicate ? 'duplicate' : 'primary'} className="flex animate-marquee items-center" aria-hidden={isDuplicate}>
                            {marqueeItems.map((item) => (
                                <span key={`${isDuplicate ? 'duplicate' : 'primary'}-${item.key}`} className="contents">
                                    <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8"><EditableText contentKey={`home.marquee.${item.key}`} fallback={item.copy} editorLabel={`Home marquee ${item.copy}`} /></span>
                                    <span className="text-xl px-4 opacity-50">✦</span>
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </section>

            <section className="w-full bg-[#11110F] text-[#EFECE8] py-16 md:py-20 xl:py-24">
                <div className="max-w-[1800px] mx-auto px-6 md:px-12">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-8 mb-10 md:mb-12">
                        <div className="max-w-2xl">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-white/45"><span>{categoryShowcaseEyebrow}</span></p>
                            <h2 className="reveal-text opacity-0 translate-y-8 mt-4 storefront-section-display font-serif font-light uppercase tracking-[0.08em]"><span>{categoryShowcaseTitle}</span></h2>
                        </div>
                        <p className="reveal-text opacity-0 translate-y-8 max-w-xl text-sm md:text-base leading-relaxed text-white/60"><span>{categoryShowcaseCopy}</span></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                        {categoryShowcaseItems.map((item) => {
                            const showcaseCollection = resolveLocalizedValue(item.filterValue, activeLanguage);
                            const showcaseHref = buildCollectionsHref({ collection: showcaseCollection });
                            const showcaseTitle = resolveShowcaseCollectionTitle(showcaseCollection, item.titleFallback);
                            const showcaseLabel = resolveLanguageScopedText(`home.category_showcase.${item.mediaKey}.label`, item.labelFallback);

                            return (
                            <a
                                key={item.key}
                                href={showcaseHref}
                                className={`group relative overflow-hidden border border-white/8 bg-[#161614] hover-target transition-link ${item.layout}`}
                            >
                                <EditableMedia
                                    contentKey={`home.category_showcase.${item.mediaKey}.image`}
                                    fallback={item.image}
                                    editorLabel={`${showcaseTitle} showcase image`}
                                    alt={showcaseTitle}
                                    wrapperClassName="absolute inset-0"
                                    className="h-full w-full object-contain p-3 md:p-4 transition-transform duration-[1600ms] ease-out group-hover:scale-[1.02]"
                                    defaultMediaSettings={containMediaDefaults}
                                    onError={(event) => {
                                        event.target.style.display = 'none';
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/24 to-black/12 opacity-88 transition-opacity duration-500 group-hover:opacity-96"></div>
                                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/45"><span>{showcaseLabel}</span></p>
                                    <div className="mt-3 inline-flex items-end gap-3 border-b border-white/0 pb-1 transition-all duration-500 group-hover:border-white/30">
                                        <h3 className="font-serif text-2xl md:text-4xl font-light uppercase tracking-[0.08em] text-white"><span>{showcaseTitle}</span></h3>
                                    </div>
                                </div>
                            </a>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="w-full bg-[#EFECE8] py-20 md:py-24 xl:py-28">
                <div className="max-w-[1800px] mx-auto px-6 md:px-12">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-8 mb-10 md:mb-12 xl:mb-14">
                        <div className="max-w-2xl">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/40"><EditableText contentKey="home.featured.eyebrow" fallback="Featured Products" editorLabel="Home featured eyebrow" /></p>
                            <h2 className="reveal-text opacity-0 translate-y-8 mt-4 storefront-section-display font-serif font-light uppercase tracking-[0.08em] text-[#1C1C1C]"><EditableText contentKey="home.featured.title" fallback="Bestsellers Grid" editorLabel="Home featured title" /></h2>
                        </div>
                        <p className="reveal-text opacity-0 translate-y-8 max-w-xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/58"><EditableText contentKey="home.featured.copy" fallback="Pieces marked as featured in admin now land here first, so the homepage reflects your current lead selection instead of a generic active-product list." editorLabel="Home featured copy" /></p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 xl:grid-cols-4 xl:gap-7">
                        {featuredProducts.map((product) => {
                            const collectionLabel = product.collection
                                ? resolveExactSiteCopyText(siteCopy, getTaxonomyStorageKey('collection', product.collection, activeLanguage), product.collection, activeLanguage)
                                : '';

                            return (
                                <HomeFeaturedProductCard
                                    key={product.id || product.slug || product.name}
                                    product={product}
                                    collectionLabel={collectionLabel}
                                    translations={featuredCardTranslations}
                                />
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="w-full overflow-hidden bg-[#050505] px-3 pb-3 md:px-6 md:pb-6 xl:px-8 xl:pb-8">
                <div className={storySurfaceClassNames.shell} style={storySurfaceVariableStyle}>
                    <EditableMedia
                        contentKey="home.brand.image"
                        fallback="https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=2000"
                        editorLabel="Home brand background media"
                        alt="Styling by VA atelier detail"
                        wrapperClassName="absolute inset-0"
                        className="h-full w-full object-cover scale-[1.06] md:scale-[1.03]"
                        defaultMediaSettings={storyBackdropMediaDefaults}
                        onError={(event) => {
                            event.target.style.display = 'none';
                        }}
                    />

                    <div className="absolute inset-0" style={storySurfaceLayerStyles.layeredTone}></div>
                    <div className="absolute inset-0" style={storySurfaceLayerStyles.vignette}></div>
                    <div className="absolute inset-y-0 left-0 w-full lg:w-[68%]" style={storySurfaceLayerStyles.leftShade}></div>

                    <div className="relative z-[1] flex min-h-[42rem] items-stretch p-4 sm:p-5 md:min-h-[46rem] md:p-6 xl:min-h-[50rem] xl:p-8">
                        <article className="lumina-liquid-glass-strong relative flex min-h-[20rem] w-full max-w-[46rem] flex-col justify-center rounded-[1.85rem] px-6 py-8 sm:px-8 sm:py-9 md:max-w-[48rem] md:px-10 md:py-10 xl:max-w-[50rem] xl:px-12 xl:py-12">
                            <div className={`pointer-events-none absolute inset-0 ${storySurfaceClassNames.glassGlow}`}></div>

                            <div className="relative flex h-full flex-col justify-center">
                                <div className="max-w-[39rem]">
                                    <div className="flex flex-col gap-3 md:gap-4">
                                        <p className="reveal-text opacity-0 translate-y-8 max-w-[18rem] font-sans text-[12px] uppercase tracking-[0.34em] leading-[1.3] text-white/66 min-[380px]:text-[13px] md:max-w-none md:text-[14px]"><EditableText contentKey="home.brand.story.label" fallback={storyPanelLabelFallback} editorLabel="Home brand story panel label" /></p>
                                        <div className="reveal-text opacity-0 translate-y-8 h-px w-full max-w-[10.5rem] bg-[linear-gradient(90deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.18)_68%,rgba(255,255,255,0)_100%)]"></div>
                                    </div>

                                    <div className="mt-6 md:mt-7">
                                        <EditableRichText
                                            contentKey="home.brand.copy"
                                            fallback={storyCopyFallback}
                                            editorLabel="Home brand ethos copy"
                                            className="reveal-text opacity-0 translate-y-8 [&_span[style*='font-size']]:!text-[1.08rem] min-[380px]:[&_span[style*='font-size']]:!text-[1.16rem] md:[&_span[style*='font-size']]:!text-[1.24rem] [&_strong]:font-medium"
                                            blockBaseClassName="text-white/84"
                                            blockClassNames={{
                                                heading1: 'font-serif !font-medium !normal-case !tracking-[0.018em] !leading-[1.08] text-white/94 md:max-w-[34rem]',
                                                heading2: 'font-serif !font-medium !normal-case !tracking-[0.018em] !leading-[1.08] text-white/94 md:max-w-[34rem]',
                                                heading3: 'font-serif !font-medium !normal-case !tracking-[0.018em] !leading-[1.08] text-white/94 md:max-w-[34rem]',
                                                paragraph: 'font-serif !normal-case !not-italic max-w-none !text-[1.02rem] min-[380px]:!text-[1.08rem] leading-[1.76] tracking-[0.02em] text-white/80 md:max-w-[36rem] md:!text-[1.16rem] md:leading-[1.68] md:text-white/76',
                                                quote: 'border-l border-white/20 pl-5 italic text-white/82',
                                                'bullet-list': 'text-white/74 list-disc pl-5 space-y-2',
                                                'numbered-list': 'text-white/74 list-decimal pl-5 space-y-2',
                                            }}
                                            sizeClassNames={storyCopySizeClassNames}
                                        />
                                    </div>

                                    <div className="mt-8 flex flex-wrap gap-3 md:mt-10">
                                        {storyActionLinks.map((action) => (
                                            <a
                                                key={action.key}
                                                href={action.href}
                                                className="hover-target transition-link lumina-liquid-glass inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-[10px] uppercase tracking-[0.24em] text-white/78 transition-transform duration-300 hover:scale-[1.03]"
                                            >
                                                <EditableText contentKey={`home.brand.link.${action.key}`} fallback={action.label} editorLabel={`Home brand ${action.key} link label`} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section className="w-full bg-[#0D0D0C] text-[#EFECE8] border-t border-white/8">
                <div className="max-w-[1800px] mx-auto px-6 md:px-12 py-20 md:py-24">
                    <div className="border border-white/10 bg-white/[0.03] px-6 md:px-10 xl:px-12 py-10 md:py-12 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-10 xl:gap-12">
                        <div className="max-w-2xl">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-white/38"><EditableText contentKey="home.newsletter.eyebrow" fallback="Newsletter Sign-Up" editorLabel="Home newsletter eyebrow" /></p>
                            <h2 className="reveal-text opacity-0 translate-y-8 mt-4 font-serif text-3xl md:text-5xl font-light uppercase tracking-[0.08em] leading-[0.94]"><EditableText contentKey="home.newsletter.title" fallback="Join the atelier dispatch for collection drops, fittings, and editorial releases." editorLabel="Home newsletter title" /></h2>
                        </div>

                        <div className="w-full xl:max-w-[34rem] flex flex-col gap-4">
                            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 md:gap-4">
                                <input
                                    type="email"
                                    name="newsletterEmail"
                                    value={newsletterEmail}
                                    onChange={(event) => {
                                        setNewsletterEmail(event.target.value);

                                        if (newsletterStatus.type !== 'idle') {
                                            setNewsletterStatus({ type: 'idle', message: '' });
                                        }
                                    }}
                                    placeholder={newsletterPlaceholder}
                                    autoComplete="email"
                                    inputMode="email"
                                    disabled={isNewsletterSubmitting}
                                    className="h-14 flex-1 border border-white/12 bg-transparent px-5 text-sm tracking-[0.08em] text-white placeholder:text-white/34 outline-none transition-colors focus:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                <button
                                    type="submit"
                                    disabled={isNewsletterSubmitting}
                                    className="h-14 px-7 border border-white bg-white text-[#121211] text-[10px] uppercase tracking-[0.26em] font-medium transition-colors hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:bg-white/80 disabled:text-[#121211]/72"
                                >
                                    <span>{isNewsletterSubmitting ? newsletterSubmittingLabel : newsletterButtonLabel}</span>
                                </button>
                            </form>

                            {newsletterStatus.type !== 'idle' ? (
                                <p
                                    aria-live="polite"
                                    className={`text-xs leading-relaxed tracking-[0.08em] ${newsletterStatus.type === 'error' ? 'text-[#F3B4B4]' : 'text-white/62'}`}
                                >
                                    {newsletterStatus.message}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}