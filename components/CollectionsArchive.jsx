"use client";

import { gsap } from 'gsap';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, resolveLocalizedValue } from '../utils/language';
import {
    buildCollectionsHref,
    buildProductHref,
    formatProductCurrency,
    normalizeProductRecord,
    PRODUCT_CATEGORY_OPTIONS,
    PRODUCT_COLLECTION_OPTIONS,
    resolveProductGallery,
    sortProducts,
} from '../utils/products';

const MOBILE_ARCHIVE_MEDIA_QUERY = '(max-width: 767px)';

function buildSearchString(product) {
    return [
        product.name,
        product.subtitle,
        product.collection,
        product.category,
        product.description,
        ...(product.tags || []),
        ...(product.palette || []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

function normalizeOptionValue(value) {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (value == null) {
        return '';
    }

    return String(value).trim();
}

function buildFilterOptionList(seedOptions = [], values = []) {
    const normalizedSeedOptions = [...new Set(seedOptions.map((option) => normalizeOptionValue(option)).filter(Boolean))];
    const normalizedValues = [...new Set(values.map((value) => normalizeOptionValue(value)).filter(Boolean))];

    if (normalizedValues.length === 0) {
        return normalizedSeedOptions;
    }

    const seedOptionSet = new Set(normalizedSeedOptions.map((option) => option.toLowerCase()));
    const seededMatches = normalizedSeedOptions.filter((option) => normalizedValues.some((value) => value.toLowerCase() === option.toLowerCase()));
    const customMatches = normalizedValues
        .filter((option) => !seedOptionSet.has(option.toLowerCase()))
        .sort((leftOption, rightOption) => leftOption.localeCompare(rightOption));

    return [...seededMatches, ...customMatches];
}

function resolveFilterValue(value, options = []) {
    const normalizedValue = normalizeOptionValue(value).toLowerCase();

    if (!normalizedValue || normalizedValue === 'all') {
        return 'All';
    }

    return options.find((option) => option.toLowerCase() === normalizedValue) || 'All';
}

function FilterButton({ label, isActive, onClick, theme = 'light' }) {
    const activeClassName = theme === 'dark'
        ? 'border-[#EFE7DA] bg-[#EFE7DA] text-[#1C1C1C]'
        : 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]';
    const inactiveClassName = theme === 'dark'
        ? 'border-white/10 bg-white/[0.04] text-white/62 hover:border-white/24 hover:text-white'
        : 'border-[#1C1C1C]/12 bg-white/60 text-[#1C1C1C]/58 hover:border-[#1C1C1C]/24 hover:text-[#1C1C1C]';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`hover-target rounded-full border px-3 py-2.5 text-[9px] uppercase tracking-[0.18em] transition-colors sm:px-4 sm:py-3 sm:text-[10px] sm:tracking-[0.24em] ${isActive ? activeClassName : inactiveClassName}`}
        >
            {label}
        </button>
    );
}

function StatCard({ label, labelKey, value, delayMs = 0 }) {
    const cardRef = useRef(null);
    const animationFrameRef = useRef(null);
    const startTimeoutRef = useRef(null);
    const fallbackReadyTimeoutRef = useRef(null);
    const hasAnimatedRef = useRef(false);
    const hasIntersectedRef = useRef(false);
    const isPageRevealCompleteRef = useRef(false);
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const card = cardRef.current;

        if (!card) {
            return undefined;
        }

        const targetValue = Math.max(0, Number(value) || 0);
        const pathname = window.location.pathname;

        const markPageRevealComplete = () => {
            isPageRevealCompleteRef.current = true;

            if (fallbackReadyTimeoutRef.current) {
                window.clearTimeout(fallbackReadyTimeoutRef.current);
                fallbackReadyTimeoutRef.current = null;
            }

            maybeStartCountUp();
        };

        const maybeStartCountUp = () => {
            if (!hasIntersectedRef.current || !isPageRevealCompleteRef.current || hasAnimatedRef.current) {
                return;
            }

            startTimeoutRef.current = window.setTimeout(startCountUp, 220 + delayMs);
        };

        const startCountUp = () => {
            if (hasAnimatedRef.current) {
                return;
            }

            hasAnimatedRef.current = true;
            const animationDuration = 2100;
            const animationStart = performance.now();

            const tick = (currentTime) => {
                const progress = Math.min((currentTime - animationStart) / animationDuration, 1);
                const easedProgress = 1 - ((1 - progress) ** 2.6);
                const nextValue = progress >= 1 ? targetValue : Math.floor(targetValue * easedProgress);

                setDisplayValue(nextValue);

                if (progress < 1) {
                    animationFrameRef.current = window.requestAnimationFrame(tick);
                }
            };

            animationFrameRef.current = window.requestAnimationFrame(tick);
        };

        const handlePageRevealComplete = (event) => {
            if (event.detail?.pathname !== pathname) {
                return;
            }

            markPageRevealComplete();
        };

        if (window.__luminaLastRevealPathname === pathname) {
            markPageRevealComplete();
        } else {
            fallbackReadyTimeoutRef.current = window.setTimeout(markPageRevealComplete, 1900);
        }

        window.addEventListener('lumina:page-reveal-complete', handlePageRevealComplete);

        if (card.getBoundingClientRect().top < window.innerHeight * 0.92) {
            hasIntersectedRef.current = true;
            maybeStartCountUp();
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    hasIntersectedRef.current = true;
                    maybeStartCountUp();
                    observer.disconnect();
                }
            },
            {
                threshold: 0.2,
            }
        );

        if (!hasIntersectedRef.current) {
            observer.observe(card);
        }

        return () => {
            observer.disconnect();
            window.removeEventListener('lumina:page-reveal-complete', handlePageRevealComplete);

            if (animationFrameRef.current) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }

            if (startTimeoutRef.current) {
                window.clearTimeout(startTimeoutRef.current);
            }

            if (fallbackReadyTimeoutRef.current) {
                window.clearTimeout(fallbackReadyTimeoutRef.current);
            }
        };
    }, [delayMs, value]);

    return (
        <div ref={cardRef} className="storefront-stat-card reveal-text opacity-0 translate-y-8 flex flex-col gap-2 rounded-sm border border-[#1C1C1C]/10 bg-white/50 p-3 md:gap-3 md:p-5">
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.24em] md:tracking-[0.28em] text-[#1C1C1C]/45"><EditableText contentKey={labelKey} fallback={label} editorLabel={`${labelKey} stat label`} /></p>
            <p className="storefront-stat-display font-serif text-2xl md:text-[2.65rem] font-light leading-none text-[#1C1C1C]">{String(displayValue).padStart(2, '0')}</p>
        </div>
    );
}

function ProductCard({ product, isFocused, isDimmed, onHoverStart, onHoverEnd, translations }) {
    const href = buildProductHref(product);
    const image = resolveProductGallery(product)[0] || product.image_main;
    const cardStyle = isFocused
        ? { transform: 'translateY(-10px) scale(1.035)' }
        : isDimmed
            ? { opacity: 0.35, filter: 'grayscale(1)', transform: 'scale(0.985)' }
            : undefined;
    const glowStyle = isFocused
        ? { opacity: 1, transform: 'scale(1)' }
        : { opacity: 0, transform: 'scale(0.9)' };
    const mediaStyle = isFocused
        ? { boxShadow: '0 34px 80px rgba(28, 28, 28, 0.24)' }
        : undefined;

    return (
        <article
            className="collection-product-card group relative mx-auto flex w-full max-w-[min(90vw,28rem)] flex-col gap-3 opacity-100 transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:max-w-none md:gap-5"
            style={cardStyle}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            onFocusCapture={onHoverStart}
            onBlurCapture={onHoverEnd}
        >
            <div className="pointer-events-none absolute inset-x-3 top-4 bottom-20 -z-10 rounded-[1.4rem] md:inset-x-5 md:top-6 md:bottom-24 md:rounded-[2rem] bg-[radial-gradient(circle_at_center,_rgba(28,28,28,0.2),_rgba(28,28,28,0))] transition-all duration-500 ease-out" style={glowStyle}></div>

            <a href={href} className="transition-link w-full aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C] ring-1 ring-transparent transition-[box-shadow,transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={mediaStyle} data-cursor-text={translations.inspect}>
                <img className={`w-full h-full object-cover transition-transform duration-[1.8s] ease-out ${isFocused ? 'scale-[1.08]' : 'group-hover:scale-[1.04]'}`} src={image} alt={product.name} />
            </a>

            <div className="collection-card-copy flex flex-col gap-2.5 md:gap-3 transition-[transform,opacity] duration-500 ease-out">
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] uppercase tracking-[0.18em] md:tracking-[0.22em] text-[#1C1C1C]/42">
                    <span className={`rounded-full border px-2.5 py-1.5 md:px-3 md:py-2 transition-colors duration-300 ${isFocused ? 'border-[#1C1C1C]/18 bg-white text-[#1C1C1C]' : 'border-[#1C1C1C]/10 bg-white/60'}`}>{product.collection}</span>
                    <span className={`hidden sm:inline-flex rounded-full border px-3 py-2 transition-colors duration-300 ${isFocused ? 'border-[#1C1C1C]/18 bg-white text-[#1C1C1C]' : 'border-[#1C1C1C]/10 bg-white/60'}`}>{product.category}</span>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-4">
                    <div className="min-w-0">
                        <a href={href} className="transition-link font-serif text-[1rem] sm:text-[1.1rem] md:text-2xl xl:text-[1.75rem] font-light leading-[1.02] md:leading-[0.94] uppercase tracking-[0.05em] md:tracking-[0.06em] hover-target [overflow-wrap:anywhere]">{product.name}</a>
                        {product.subtitle && <p className="mt-2 hidden max-w-md text-sm leading-relaxed text-[#1C1C1C]/58 md:block">{product.subtitle}</p>}
                    </div>

                    <p className="shrink-0 text-xs md:text-sm uppercase tracking-[0.18em] md:tracking-[0.2em] font-medium text-[#1C1C1C]">{formatProductCurrency(product.price)}</p>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-[#1C1C1C]/10 pt-3 text-[9px] md:flex-row md:items-center md:justify-between md:gap-4 md:pt-4 md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.24em] text-[#1C1C1C]/45">
                    <span>{product.inventory_count > 0 ? `${product.inventory_count} ${translations.ready}` : translations.madeToOrder}</span>
                    <span className="hidden sm:inline">{product.lead_time_days} {translations.dayLeadTime}</span>
                </div>
            </div>
        </article>
    );
}

export default function CollectionsArchive({ products = [] }) {
    const siteCopy = useSiteCopy();
    const getText = (key, fallback) => siteCopy ? siteCopy.resolveText(key, fallback) : resolveLocalizedValue(fallback, DEFAULT_LANGUAGE);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const archiveRef = useRef(null);
    const hoverIntentTimeoutRef = useRef(null);
    const [searchValue, setSearchValue] = useState('');
    const [cardsPerRow, setCardsPerRow] = useState(3);
    const [focusedProductId, setFocusedProductId] = useState(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
    const mobileColumns = Math.max(1, Math.min(cardsPerRow, 4));
    const tabletColumns = Math.max(1, Math.min(cardsPerRow, 4));
    const desktopColumns = Math.max(cardsPerRow, 2);
    const cardsPerRowOptions = isMobileViewport ? [1, 2, 4] : [2, 3, 4, 6, 12];
    const normalizedProducts = useMemo(() => {
        return sortProducts(products)
            .map((product) => normalizeProductRecord(product))
            .filter((product) => product.status !== 'archived');
    }, [products]);
    const collectionOptions = useMemo(() => {
        return ['All', ...buildFilterOptionList(PRODUCT_COLLECTION_OPTIONS, normalizedProducts.map((product) => product.collection))];
    }, [normalizedProducts]);
    const categoryOptions = useMemo(() => {
        return ['All', ...buildFilterOptionList(PRODUCT_CATEGORY_OPTIONS, normalizedProducts.map((product) => product.category))];
    }, [normalizedProducts]);
    const activeCollection = resolveFilterValue(searchParams.get('collection'), collectionOptions);
    const activeCategory = resolveFilterValue(searchParams.get('category'), categoryOptions);
    const searchPlaceholder = getText('collections.filters.search_placeholder', localizedFallback('Search by collection, category, mood, or name', 'Търсене по колекция, категория, настроение или име'));
    const filteredProducts = normalizedProducts.filter((product) => {
        const matchesCollection = activeCollection === 'All' || product.collection === activeCollection;
        const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
        const matchesSearch = !deferredSearch || buildSearchString(product).includes(deferredSearch);

        return matchesCollection && matchesCategory && matchesSearch;
    });
    const readyToBrowseLabel = filteredProducts.length === 1
        ? getText('collections.filters.ready_singular', localizedFallback('piece ready to browse', 'модел за разглеждане'))
        : getText('collections.filters.ready_plural', localizedFallback('pieces ready to browse', 'модела за разглеждане'));
    const visibleNowLabel = filteredProducts.length === 1
        ? getText('collections.filters.visible_singular', localizedFallback('piece visible now', 'модел видим сега'))
        : getText('collections.filters.visible_plural', localizedFallback('pieces visible now', 'модела видими сега'));
    const formatFilterOptionLabel = (option) => option === 'All'
        ? getText('collections.filters.option_all', localizedFallback('All', 'Всички'))
        : option;
    const productCardTranslations = {
        inspect: getText('collections.card.inspect', localizedFallback('Inspect', 'Преглед')), 
        ready: getText('collections.card.ready', localizedFallback('ready', 'готови')),
        madeToOrder: getText('collections.card.made_to_order', localizedFallback('Made to order', 'По поръчка')),
        dayLeadTime: getText('collections.card.day_lead_time', localizedFallback('day lead time', 'дни срок')),
    };
    const hasActiveFilters = activeCollection !== 'All' || activeCategory !== 'All' || Boolean(searchValue);
    const activeFilterCount = [activeCollection !== 'All', activeCategory !== 'All', Boolean(searchValue)].filter(Boolean).length;
    const activeFilterLabels = [
        activeCollection !== 'All' ? activeCollection : '',
        activeCategory !== 'All' ? activeCategory : '',
        searchValue ? `${getText('collections.filters.search_prefix', localizedFallback('Search:', 'Търсене:'))} ${searchValue}` : '',
    ].filter(Boolean);

    useEffect(() => {
        if (!filteredProducts.some((product) => (product.id || product.slug) === focusedProductId)) {
            setFocusedProductId(null);
        }
    }, [filteredProducts, focusedProductId]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const mediaQueryList = window.matchMedia(MOBILE_ARCHIVE_MEDIA_QUERY);

        const syncViewport = (matchesMobile) => {
            setIsMobileViewport(matchesMobile);
            setCardsPerRow((currentValue) => {
                const allowedOptions = matchesMobile ? [1, 2, 4] : [2, 3, 4, 6, 12];

                if (allowedOptions.includes(currentValue)) {
                    return currentValue;
                }

                return matchesMobile ? 1 : 3;
            });
        };

        syncViewport(mediaQueryList.matches);

        const handleChange = (event) => {
            syncViewport(event.matches);
        };

        if (typeof mediaQueryList.addEventListener === 'function') {
            mediaQueryList.addEventListener('change', handleChange);
            return () => mediaQueryList.removeEventListener('change', handleChange);
        }

        mediaQueryList.addListener(handleChange);

        return () => mediaQueryList.removeListener(handleChange);
    }, []);

    useEffect(() => {
        if (!isFilterPanelOpen) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsFilterPanelOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFilterPanelOpen]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const rootElement = document.documentElement;

        if (isFilterPanelOpen) {
            rootElement.dataset.archiveFilterPanel = 'open';
        } else {
            delete rootElement.dataset.archiveFilterPanel;
        }

        return () => {
            delete rootElement.dataset.archiveFilterPanel;
        };
    }, [isFilterPanelOpen]);

    useEffect(() => {
        const archive = archiveRef.current;

        if (!archive) {
            return undefined;
        }

        const ctx = gsap.context(() => {
            const cards = gsap.utils.toArray('.collection-product-card');
            const copies = gsap.utils.toArray('.collection-card-copy');

            if (cards.length === 0) {
                return;
            }

            gsap.fromTo(
                cards,
                { autoAlpha: 0, y: 22 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.72,
                    stagger: 0.055,
                    ease: 'power3.out',
                    clearProps: 'opacity,transform',
                }
            );

            gsap.fromTo(
                copies,
                { autoAlpha: 0, y: 24 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.82,
                    stagger: 0.05,
                    ease: 'power3.out',
                    clearProps: 'opacity,transform',
                    delay: 0.08,
                }
            );
        }, archive);

        return () => {
            ctx.revert();
        };
    }, [activeCategory, activeCollection, deferredSearch, filteredProducts.length]);

    useEffect(() => {
        return () => {
            if (hoverIntentTimeoutRef.current) {
                window.clearTimeout(hoverIntentTimeoutRef.current);
            }
        };
    }, []);

    const updateArchiveFilters = ({ collection = activeCollection, category = activeCategory }) => {
        const nextHref = buildCollectionsHref({ collection, category });
        const currentQuery = searchParams.toString();
        const currentHref = currentQuery ? `${pathname}?${currentQuery}` : pathname;

        if (nextHref === currentHref) {
            return;
        }

        router.replace(nextHref, { scroll: false });
    };

    const handleReset = () => {
        setSearchValue('');
        updateArchiveFilters({ collection: 'All', category: 'All' });
    };

    const handleProductHoverStart = (productId) => {
        if (hoverIntentTimeoutRef.current) {
            window.clearTimeout(hoverIntentTimeoutRef.current);
        }

        hoverIntentTimeoutRef.current = window.setTimeout(() => {
            setFocusedProductId(productId);
        }, 220);
    };

    const handleProductHoverEnd = () => {
        if (hoverIntentTimeoutRef.current) {
            window.clearTimeout(hoverIntentTimeoutRef.current);
        }

        setFocusedProductId(null);
    };

    return (
        <div ref={archiveRef}>
            <section className="mb-1 md:mb-4 grid grid-cols-3 gap-1.5 min-[380px]:gap-2 md:gap-5">
                <StatCard label={localizedFallback('Pieces', 'Модели')} labelKey="collections.stats.pieces.label" value={normalizedProducts.length} delayMs={0} />
                <StatCard label={localizedFallback('Collections', 'Колекции')} labelKey="collections.stats.collections.label" value={Math.max(collectionOptions.length - 1, 1)} delayMs={160} />
                <StatCard label={localizedFallback('Categories', 'Категории')} labelKey="collections.stats.categories.label" value={Math.max(categoryOptions.length - 1, 1)} delayMs={320} />
            </section>

            <section className="mb-8 md:mb-10 rounded-sm border border-[#1C1C1C]/10 bg-white/45 p-3.5 min-[380px]:p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45 min-[380px]:tracking-[0.3em]"><EditableText contentKey="collections.filters.eyebrow" fallback={localizedFallback('Filter The Archive', 'Филтрирай архива')} editorLabel="Collections filter eyebrow" /></p>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-[#1C1C1C]/62 min-[380px]:text-sm md:mt-3 md:text-base">
                            {String(filteredProducts.length).padStart(2, '0')} {readyToBrowseLabel}
                            {activeCollection !== 'All' ? ` / ${activeCollection}` : ''}
                            {activeCategory !== 'All' ? ` / ${activeCategory}` : ''}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 min-[380px]:gap-2">
                        {hasActiveFilters && (
                            <button type="button" onClick={handleReset} className="hover-target rounded-full border border-[#1C1C1C]/12 bg-white/70 px-3 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[#1C1C1C]/62 transition-colors hover:border-[#1C1C1C]/24 hover:text-[#1C1C1C] min-[380px]:px-4 min-[380px]:py-3 min-[380px]:text-[10px] min-[380px]:tracking-[0.24em]">
                                <EditableText contentKey="collections.filters.reset" fallback={localizedFallback('Reset Archive', 'Изчисти филтрите')} editorLabel="Collections reset archive" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsFilterPanelOpen(true)}
                            className="hover-target inline-flex items-center gap-2 rounded-full border border-[#1C1C1C] bg-[#1C1C1C] px-3 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[#EFECE8] transition-colors hover:bg-black min-[380px]:gap-3 min-[380px]:px-4 min-[380px]:py-3 min-[380px]:text-[10px] min-[380px]:tracking-[0.24em]"
                        >
                            <EditableText contentKey="collections.filters.open_panel" fallback={localizedFallback('Search & Filter', 'Търси и филтрирай')} editorLabel="Collections open filter panel" />
                            <span className="rounded-full border border-white/12 bg-white/10 px-2 py-1 text-[9px] leading-none text-white/78">{String(activeFilterCount).padStart(2, '0')}</span>
                        </button>
                    </div>
                </div>

                {activeFilterLabels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 min-[380px]:mt-4 min-[380px]:gap-2">
                        {activeFilterLabels.map((label) => (
                            <span key={label} className="rounded-full border border-[#1C1C1C]/10 bg-white/75 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#1C1C1C]/62 min-[380px]:text-[10px] min-[380px]:tracking-[0.2em]">
                                {label}
                            </span>
                        ))}
                    </div>
                )}
            </section>

            {isFilterPanelOpen && (
                <div className="fixed inset-0 z-[140] flex items-end justify-center p-3 backdrop-blur-sm min-[380px]:p-4 md:items-center">
                    <button type="button" aria-label={getText('collections.filters.close_panel', localizedFallback('Close filter panel', 'Затвори панела с филтри'))} onClick={() => setIsFilterPanelOpen(false)} className="absolute inset-0 bg-[#1C1C1C]/55"></button>

                    <div className="relative flex w-full max-w-4xl max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[rgba(12,12,14,0.95)] text-[#EFECE8] shadow-[0_28px_90px_rgba(0,0,0,0.4)] md:max-h-[calc(100vh-3rem)]" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 md:gap-4 md:px-6 md:py-5">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 md:tracking-[0.28em]"><EditableText contentKey="collections.filters.eyebrow" fallback={localizedFallback('Filter The Archive', 'Филтрирай архива')} editorLabel="Collections filter eyebrow" /></p>
                                <h3 className="mt-2.5 font-serif text-[1.6rem] font-light uppercase tracking-[0.06em] text-white min-[380px]:text-[1.8rem] md:mt-3 md:text-3xl md:tracking-[0.08em]"><EditableText contentKey="collections.filters.title" fallback={localizedFallback('Archive Controls', 'Контроли на архива')} editorLabel="Collections filter modal title" /></h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsFilterPanelOpen(false)}
                                className="hover-target rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/10 min-[380px]:px-4 min-[380px]:text-[10px] min-[380px]:tracking-[0.24em]"
                            >
                                {getText('collections.filters.close', localizedFallback('Close', 'Затвори'))}
                            </button>
                        </div>

                        <div data-lenis-prevent-wheel className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
                            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                                <label className="flex min-w-0 flex-col gap-2 text-[10px] uppercase tracking-[0.18em] text-white/48 md:tracking-[0.22em]">
                                    <EditableText contentKey="collections.filters.search_label" fallback={localizedFallback('Search Pieces', 'Търси модели')} editorLabel="Collections search label" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="h-12 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors placeholder:text-white/28 focus:border-white/24 md:h-14 md:rounded-[1.05rem]"
                                    />
                                </label>

                                <div className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.18em] text-white/48 md:tracking-[0.22em]">
                                    <p><EditableText contentKey="collections.filters.cards_per_row" fallback={localizedFallback('Cards Per Row', 'Карти на ред')} editorLabel="Collections cards per row label" /></p>
                                    <div className="flex flex-wrap gap-2">
                                        {cardsPerRowOptions.map((option) => (
                                            <FilterButton
                                                key={option}
                                                label={String(option).padStart(2, '0')}
                                                theme="dark"
                                                isActive={cardsPerRow === option}
                                                onClick={() => setCardsPerRow(option)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col gap-6">
                                <section>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/42 md:tracking-[0.24em]"><EditableText contentKey="collections.filters.collection_title" fallback={localizedFallback('Collections', 'Колекции')} editorLabel="Collections filter collection title" /></p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {collectionOptions.map((option) => (
                                            <FilterButton key={option} label={formatFilterOptionLabel(option)} theme="dark" isActive={activeCollection === option} onClick={() => updateArchiveFilters({ collection: option })} />
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/42 md:tracking-[0.24em]"><EditableText contentKey="collections.filters.category_title" fallback={localizedFallback('Categories', 'Категории')} editorLabel="Collections filter category title" /></p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {categoryOptions.map((option) => (
                                            <FilterButton key={option} label={formatFilterOptionLabel(option)} theme="dark" isActive={activeCategory === option} onClick={() => updateArchiveFilters({ category: option })} />
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 text-[10px] uppercase tracking-[0.18em] text-white/42 sm:flex-row sm:items-center sm:justify-between sm:tracking-[0.24em] md:px-6">
                            <p>{String(filteredProducts.length).padStart(2, '0')} {visibleNowLabel}</p>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                {hasActiveFilters && (
                                    <button type="button" onClick={handleReset} className="hover-target rounded-full border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[9px] uppercase tracking-[0.18em] text-white/66 transition-colors hover:bg-white/[0.08] hover:text-white min-[380px]:px-4 min-[380px]:py-3 min-[380px]:text-[10px] min-[380px]:tracking-[0.24em]">
                                        <EditableText contentKey="collections.filters.reset" fallback={localizedFallback('Reset Archive', 'Изчисти филтрите')} editorLabel="Collections reset archive" />
                                    </button>
                                )}

                                <button type="button" onClick={() => setIsFilterPanelOpen(false)} className="hover-target rounded-full bg-[#EFE7DA] px-3 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[#1C1C1C] transition-colors hover:bg-white min-[380px]:px-4 min-[380px]:py-3 min-[380px]:text-[10px] min-[380px]:tracking-[0.24em]">
                                    {getText('collections.filters.view_pieces', localizedFallback('View Pieces', 'Виж моделите'))}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {filteredProducts.length === 0 ? (
                <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-8 md:p-10 flex flex-col gap-5">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45"><EditableText contentKey="collections.empty.eyebrow" fallback={localizedFallback('No Matches', 'Няма резултати')} editorLabel="Collections empty eyebrow" /></p>
                    <p className="font-serif text-3xl md:text-5xl font-light leading-tight max-w-2xl"><EditableText contentKey="collections.empty.title" fallback={localizedFallback('Nothing matched that filter. Try a broader collection or clear the search phrase.', 'Нищо не съвпадна с този филтър. Опитайте по-широка колекция или изчистете търсенето.')} editorLabel="Collections empty title" /></p>
                    <button type="button" onClick={handleReset} className="hover-target w-max px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium"><EditableText contentKey="collections.empty.reset" fallback={localizedFallback('Reset Archive', 'Изчисти филтрите')} editorLabel="Collections empty reset" /></button>
                </div>
            ) : (
                <div
                    className="grid justify-items-center gap-x-4 gap-y-9 [grid-template-columns:repeat(var(--archive-columns-mobile),minmax(0,1fr))] md:gap-x-6 md:gap-y-14 md:[grid-template-columns:repeat(var(--archive-columns-tablet),minmax(0,1fr))] xl:[grid-template-columns:repeat(var(--archive-columns-desktop),minmax(0,1fr))]"
                    style={{
                        '--archive-columns-mobile': mobileColumns,
                        '--archive-columns-tablet': tabletColumns,
                        '--archive-columns-desktop': desktopColumns,
                    }}
                >
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id || product.slug}
                            product={product}
                            translations={productCardTranslations}
                            isFocused={focusedProductId === (product.id || product.slug)}
                            isDimmed={Boolean(focusedProductId) && focusedProductId !== (product.id || product.slug)}
                            onHoverStart={() => handleProductHoverStart(product.id || product.slug)}
                            onHoverEnd={handleProductHoverEnd}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
