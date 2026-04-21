"use client";

import { gsap } from 'gsap';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
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
            className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors ${isActive ? activeClassName : inactiveClassName}`}
        >
            {label}
        </button>
    );
}

function StatCard({ label, labelKey, value, copy, copyKey, delayMs = 0 }) {
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
        <div ref={cardRef} className="storefront-stat-card reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-3 md:p-5 flex flex-col gap-1.5 md:gap-2.5">
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.24em] md:tracking-[0.28em] text-[#1C1C1C]/45"><EditableText contentKey={labelKey} fallback={label} editorLabel={`${label} stat label`} /></p>
            <p className="storefront-stat-display font-serif text-2xl md:text-[2.65rem] font-light leading-none text-[#1C1C1C]">{String(displayValue).padStart(2, '0')}</p>
        </div>
    );
}

function ProductCard({ product, isFocused, isDimmed, onHoverStart, onHoverEnd }) {
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
            className="collection-product-card group relative flex flex-col gap-3 md:gap-5 opacity-100 transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={cardStyle}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            onFocusCapture={onHoverStart}
            onBlurCapture={onHoverEnd}
        >
            <div className="pointer-events-none absolute inset-x-3 top-4 bottom-20 -z-10 rounded-[1.4rem] md:inset-x-5 md:top-6 md:bottom-24 md:rounded-[2rem] bg-[radial-gradient(circle_at_center,_rgba(28,28,28,0.2),_rgba(28,28,28,0))] transition-all duration-500 ease-out" style={glowStyle}></div>

            <a href={href} className="transition-link w-full aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C] ring-1 ring-transparent transition-[box-shadow,transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={mediaStyle} data-cursor-text="Inspect">
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
                    <span>{product.inventory_count > 0 ? `${product.inventory_count} ready` : 'Made to order'}</span>
                    <span className="hidden sm:inline">{product.lead_time_days} day lead time</span>
                </div>
            </div>
        </article>
    );
}

export default function CollectionsArchive({ products = [] }) {
    const siteCopy = useSiteCopy();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const archiveRef = useRef(null);
    const hoverIntentTimeoutRef = useRef(null);
    const [searchValue, setSearchValue] = useState('');
    const [cardsPerRow, setCardsPerRow] = useState(3);
    const [focusedProductId, setFocusedProductId] = useState(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
    const tabletColumns = Math.min(cardsPerRow, 4);
    const desktopColumns = Math.max(cardsPerRow, 2);
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
    const searchPlaceholder = siteCopy ? siteCopy.resolveText('collections.filters.search_placeholder', 'Search by collection, category, mood, or name') : 'Search by collection, category, mood, or name';
    const filteredProducts = normalizedProducts.filter((product) => {
        const matchesCollection = activeCollection === 'All' || product.collection === activeCollection;
        const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
        const matchesSearch = !deferredSearch || buildSearchString(product).includes(deferredSearch);

        return matchesCollection && matchesCategory && matchesSearch;
    });
    const hasActiveFilters = activeCollection !== 'All' || activeCategory !== 'All' || Boolean(searchValue);
    const activeFilterCount = [activeCollection !== 'All', activeCategory !== 'All', Boolean(searchValue)].filter(Boolean).length;
    const activeFilterLabels = [
        activeCollection !== 'All' ? activeCollection : '',
        activeCategory !== 'All' ? activeCategory : '',
        searchValue ? `Search: ${searchValue}` : '',
    ].filter(Boolean);

    useEffect(() => {
        if (!filteredProducts.some((product) => (product.id || product.slug) === focusedProductId)) {
            setFocusedProductId(null);
        }
    }, [filteredProducts, focusedProductId]);

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
            <section className="mb-7 md:mb-16 grid grid-cols-3 gap-2 md:gap-5">
                <StatCard label="Pieces" labelKey="collections.stats.pieces.label" value={normalizedProducts.length} delayMs={0} copy="A concise edit of visible looks ready to browse at once." copyKey="collections.stats.pieces.copy" />
                <StatCard label="Collections" labelKey="collections.stats.collections.label" value={Math.max(collectionOptions.length - 1, 1)} delayMs={160} copy="Distinct storylines shaping the archive into easier visual paths." copyKey="collections.stats.collections.copy" />
                <StatCard label="Categories" labelKey="collections.stats.categories.label" value={Math.max(categoryOptions.length - 1, 1)} delayMs={320} copy="Focused entry points for shoppers who already know the silhouette they want." copyKey="collections.stats.categories.copy" />
            </section>

            <section className="mb-8 md:mb-10 rounded-sm border border-[#1C1C1C]/10 bg-white/45 p-4 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45"><EditableText contentKey="collections.filters.eyebrow" fallback="Filter The Archive" editorLabel="Collections filter eyebrow" /></p>
                        <p className="mt-3 text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
                            {String(filteredProducts.length).padStart(2, '0')} piece{filteredProducts.length === 1 ? '' : 's'} ready to browse
                            {activeCollection !== 'All' ? ` / ${activeCollection}` : ''}
                            {activeCategory !== 'All' ? ` / ${activeCategory}` : ''}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {hasActiveFilters && (
                            <button type="button" onClick={handleReset} className="hover-target rounded-full border border-[#1C1C1C]/12 bg-white/70 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/62 transition-colors hover:border-[#1C1C1C]/24 hover:text-[#1C1C1C]">
                                <EditableText contentKey="collections.filters.reset" fallback="Reset Archive" editorLabel="Collections reset archive" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsFilterPanelOpen(true)}
                            className="hover-target inline-flex items-center gap-3 rounded-full border border-[#1C1C1C] bg-[#1C1C1C] px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-[#EFECE8] transition-colors hover:bg-black"
                        >
                            <EditableText contentKey="collections.filters.open_panel" fallback="Search & Filter" editorLabel="Collections open filter panel" />
                            <span className="rounded-full border border-white/12 bg-white/10 px-2 py-1 text-[9px] leading-none text-white/78">{String(activeFilterCount).padStart(2, '0')}</span>
                        </button>
                    </div>
                </div>

                {activeFilterLabels.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {activeFilterLabels.map((label) => (
                            <span key={label} className="rounded-full border border-[#1C1C1C]/10 bg-white/75 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#1C1C1C]/62">
                                {label}
                            </span>
                        ))}
                    </div>
                )}
            </section>

            {isFilterPanelOpen && (
                <div className="fixed inset-0 z-[140] flex items-end justify-center p-4 backdrop-blur-sm md:items-center">
                    <button type="button" aria-label="Close filter panel" onClick={() => setIsFilterPanelOpen(false)} className="absolute inset-0 bg-[#1C1C1C]/55"></button>

                    <div className="relative flex w-full max-w-4xl max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[rgba(12,12,14,0.95)] text-[#EFECE8] shadow-[0_28px_90px_rgba(0,0,0,0.4)] md:max-h-[calc(100vh-3rem)]" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-6">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40"><EditableText contentKey="collections.filters.eyebrow" fallback="Filter The Archive" editorLabel="Collections filter eyebrow" /></p>
                                <h3 className="mt-3 font-serif text-3xl font-light uppercase tracking-[0.08em] text-white"><EditableText contentKey="collections.filters.title" fallback="Archive Controls" editorLabel="Collections filter modal title" /></h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsFilterPanelOpen(false)}
                                className="hover-target rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/72 transition-colors hover:bg-white/10"
                            >
                                Close
                            </button>
                        </div>

                        <div data-lenis-prevent-wheel className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
                            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                                <label className="flex min-w-0 flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/48">
                                    <EditableText contentKey="collections.filters.search_label" fallback="Search Pieces" editorLabel="Collections search label" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="h-14 rounded-[1.05rem] border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors placeholder:text-white/28 focus:border-white/24"
                                    />
                                </label>

                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/48">
                                    <EditableText contentKey="collections.filters.cards_per_row" fallback="Cards Per Row" editorLabel="Collections cards per row label" />
                                    <select
                                        value={cardsPerRow}
                                        onChange={(event) => setCardsPerRow(Number(event.target.value) || 3)}
                                        className="h-14 rounded-[1.05rem] border border-white/10 bg-white/[0.04] px-4 text-[10px] uppercase tracking-[0.22em] text-white outline-none transition-colors focus:border-white/24"
                                    >
                                        {[2, 3, 4, 6, 12].map((option) => (
                                            <option key={option} value={option}>{String(option).padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="mt-6 flex flex-col gap-6">
                                <section>
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/42"><EditableText contentKey="collections.filters.collection_title" fallback="Collections" editorLabel="Collections filter collection title" /></p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {collectionOptions.map((option) => (
                                            <FilterButton key={option} label={option} theme="dark" isActive={activeCollection === option} onClick={() => updateArchiveFilters({ collection: option })} />
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/42"><EditableText contentKey="collections.filters.category_title" fallback="Categories" editorLabel="Collections filter category title" /></p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {categoryOptions.map((option) => (
                                            <FilterButton key={option} label={option} theme="dark" isActive={activeCategory === option} onClick={() => updateArchiveFilters({ category: option })} />
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 text-[10px] uppercase tracking-[0.24em] text-white/42 sm:flex-row sm:items-center sm:justify-between md:px-6">
                            <p>{String(filteredProducts.length).padStart(2, '0')} piece{filteredProducts.length === 1 ? '' : 's'} visible now</p>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                {hasActiveFilters && (
                                    <button type="button" onClick={handleReset} className="hover-target rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-white/66 transition-colors hover:bg-white/[0.08] hover:text-white">
                                        <EditableText contentKey="collections.filters.reset" fallback="Reset Archive" editorLabel="Collections reset archive" />
                                    </button>
                                )}

                                <button type="button" onClick={() => setIsFilterPanelOpen(false)} className="hover-target rounded-full bg-[#EFE7DA] px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C] transition-colors hover:bg-white">
                                    View Pieces
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {filteredProducts.length === 0 ? (
                <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-8 md:p-10 flex flex-col gap-5">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45"><EditableText contentKey="collections.empty.eyebrow" fallback="No Matches" editorLabel="Collections empty eyebrow" /></p>
                    <p className="font-serif text-3xl md:text-5xl font-light leading-tight max-w-2xl"><EditableText contentKey="collections.empty.title" fallback="Nothing matched that filter. Try a broader collection or clear the search phrase." editorLabel="Collections empty title" /></p>
                    <button type="button" onClick={handleReset} className="hover-target w-max px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium"><EditableText contentKey="collections.empty.reset" fallback="Reset Archive" editorLabel="Collections empty reset" /></button>
                </div>
            ) : (
                <div
                    className="grid grid-cols-2 gap-x-4 gap-y-9 md:gap-x-6 md:gap-y-14 md:[grid-template-columns:repeat(var(--archive-columns-tablet),minmax(0,1fr))] xl:[grid-template-columns:repeat(var(--archive-columns-desktop),minmax(0,1fr))]"
                    style={{
                        '--archive-columns-tablet': tabletColumns,
                        '--archive-columns-desktop': desktopColumns,
                    }}
                >
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id || product.slug}
                            product={product}
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
