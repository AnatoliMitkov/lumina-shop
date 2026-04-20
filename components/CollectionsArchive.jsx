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

function FilterButton({ label, isActive, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors ${isActive ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/12 bg-white/60 text-[#1C1C1C]/58 hover:border-[#1C1C1C]/24 hover:text-[#1C1C1C]'}`}
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
        <div ref={cardRef} className="storefront-stat-card reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-4 md:p-5 flex flex-col gap-2.5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45"><EditableText contentKey={labelKey} fallback={label} editorLabel={`${label} stat label`} /></p>
            <p className="storefront-stat-display font-serif font-light text-[#1C1C1C]">{String(displayValue).padStart(2, '0')}</p>
            <p className="text-xs md:text-sm leading-relaxed text-[#1C1C1C]/58"><EditableText contentKey={copyKey} fallback={copy} editorLabel={`${label} stat copy`} /></p>
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
            className="collection-product-card group relative flex flex-col gap-4 md:gap-5 opacity-100 transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={cardStyle}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            onFocusCapture={onHoverStart}
            onBlurCapture={onHoverEnd}
        >
            <div className="pointer-events-none absolute inset-x-5 top-6 bottom-24 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_center,_rgba(28,28,28,0.2),_rgba(28,28,28,0))] transition-all duration-500 ease-out" style={glowStyle}></div>

            <a href={href} className="transition-link w-full aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C] ring-1 ring-transparent transition-[box-shadow,transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={mediaStyle} data-cursor-text="Inspect">
                <img className={`w-full h-full object-cover transition-transform duration-[1.8s] ease-out ${isFocused ? 'scale-[1.08]' : 'group-hover:scale-[1.04]'}`} src={image} alt={product.name} />
            </a>

            <div className="collection-card-copy flex flex-col gap-3 transition-[transform,opacity] duration-500 ease-out">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                    <span className={`rounded-full border px-3 py-2 transition-colors duration-300 ${isFocused ? 'border-[#1C1C1C]/18 bg-white text-[#1C1C1C]' : 'border-[#1C1C1C]/10 bg-white/60'}`}>{product.collection}</span>
                    <span className={`rounded-full border px-3 py-2 transition-colors duration-300 ${isFocused ? 'border-[#1C1C1C]/18 bg-white text-[#1C1C1C]' : 'border-[#1C1C1C]/10 bg-white/60'}`}>{product.category}</span>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div>
                        <a href={href} className="transition-link font-serif text-xl md:text-2xl xl:text-[1.75rem] font-light leading-[0.94] uppercase tracking-[0.06em] hover-target [overflow-wrap:anywhere]">{product.name}</a>
                        {product.subtitle && <p className="mt-3 max-w-md text-sm leading-relaxed text-[#1C1C1C]/58">{product.subtitle}</p>}
                    </div>

                    <p className="shrink-0 text-sm uppercase tracking-[0.2em] font-medium text-[#1C1C1C]">{formatProductCurrency(product.price)}</p>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-[#1C1C1C]/10 pt-4 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">
                    <span>{product.inventory_count > 0 ? `${product.inventory_count} ready` : 'Made to order'}</span>
                    <span>{product.lead_time_days} day lead time</span>
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
    const featuredProducts = normalizedProducts.filter((product) => product.featured).slice(0, 5);
    const searchPlaceholder = siteCopy ? siteCopy.resolveText('collections.filters.search_placeholder', 'Search by collection, category, mood, or name') : 'Search by collection, category, mood, or name';
    const filteredProducts = normalizedProducts.filter((product) => {
        const matchesCollection = activeCollection === 'All' || product.collection === activeCollection;
        const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
        const matchesSearch = !deferredSearch || buildSearchString(product).includes(deferredSearch);

        return matchesCollection && matchesCategory && matchesSearch;
    });
    useEffect(() => {
        if (!filteredProducts.some((product) => (product.id || product.slug) === focusedProductId)) {
            setFocusedProductId(null);
        }
    }, [filteredProducts, focusedProductId]);

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
            <section className="mb-12 md:mb-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <StatCard label="Pieces" labelKey="collections.stats.pieces.label" value={normalizedProducts.length} delayMs={0} copy="A concise edit of visible looks ready to browse at once." copyKey="collections.stats.pieces.copy" />
                <StatCard label="Collections" labelKey="collections.stats.collections.label" value={Math.max(collectionOptions.length - 1, 1)} delayMs={160} copy="Distinct storylines shaping the archive into easier visual paths." copyKey="collections.stats.collections.copy" />
                <StatCard label="Categories" labelKey="collections.stats.categories.label" value={Math.max(categoryOptions.length - 1, 1)} delayMs={320} copy="Focused entry points for shoppers who already know the silhouette they want." copyKey="collections.stats.categories.copy" />
            </section>

            <section className="mb-10 md:mb-12 flex flex-col gap-5 rounded-sm border border-[#1C1C1C]/10 bg-white/45 p-5 md:p-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div className="max-w-2xl">
                        <p className="text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="collections.filters.eyebrow" fallback="Filter The Archive" editorLabel="Collections filter eyebrow" /></p>
                        <p className="text-sm md:text-base leading-relaxed text-[#1C1C1C]/62"><EditableText contentKey="collections.filters.copy" fallback="Move through the archive by collection or silhouette, then narrow further with search if you already know the mood, name, or finish you want." editorLabel="Collections filter copy" /></p>
                    </div>

                    <div className="flex w-full max-w-4xl flex-col gap-4 md:flex-row md:items-end">
                        <label className="flex min-w-0 flex-1 flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/48">
                            <EditableText contentKey="collections.filters.search_label" fallback="Search Pieces" editorLabel="Collections search label" />
                            <input
                                value={searchValue}
                                onChange={(event) => setSearchValue(event.target.value)}
                                placeholder={searchPlaceholder}
                                className="h-13 border border-[#1C1C1C]/12 bg-white/75 px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                            />
                        </label>

                        <label className="flex w-full md:w-44 flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/48">
                            <EditableText contentKey="collections.filters.cards_per_row" fallback="Cards Per Row" editorLabel="Collections cards per row label" />
                            <select
                                value={cardsPerRow}
                                onChange={(event) => setCardsPerRow(Number(event.target.value) || 3)}
                                className="h-13 border border-[#1C1C1C]/12 bg-white/75 px-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                            >
                                {[2, 3, 4, 6, 12].map((option) => (
                                    <option key={option} value={option}>{String(option).padStart(2, '0')}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {collectionOptions.map((option) => (
                        <FilterButton key={option} label={option} isActive={activeCollection === option} onClick={() => updateArchiveFilters({ collection: option })} />
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-[#1C1C1C]/10 pt-4">
                    {categoryOptions.map((option) => (
                        <FilterButton key={option} label={option} isActive={activeCategory === option} onClick={() => updateArchiveFilters({ category: option })} />
                    ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42">
                    <p>
                        {String(filteredProducts.length).padStart(2, '0')} piece{filteredProducts.length === 1 ? '' : 's'} visible across {String(cardsPerRow).padStart(2, '0')} columns
                        {activeCollection !== 'All' ? ` / ${activeCollection}` : ''}
                        {activeCategory !== 'All' ? ` / ${activeCategory}` : ''}
                    </p>
                    {(activeCollection !== 'All' || activeCategory !== 'All' || searchValue) && (
                        <button type="button" onClick={handleReset} className="hover-target border border-[#1C1C1C]/12 bg-white/60 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/58 transition-colors hover:text-[#1C1C1C]">
                            <EditableText contentKey="collections.filters.reset" fallback="Reset Archive" editorLabel="Collections reset archive" />
                        </button>
                    )}
                </div>
            </section>

            {filteredProducts.length === 0 ? (
                <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-8 md:p-10 flex flex-col gap-5">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45"><EditableText contentKey="collections.empty.eyebrow" fallback="No Matches" editorLabel="Collections empty eyebrow" /></p>
                    <p className="font-serif text-3xl md:text-5xl font-light leading-tight max-w-2xl"><EditableText contentKey="collections.empty.title" fallback="Nothing matched that filter. Try a broader collection or clear the search phrase." editorLabel="Collections empty title" /></p>
                    <button type="button" onClick={handleReset} className="hover-target w-max px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium"><EditableText contentKey="collections.empty.reset" fallback="Reset Archive" editorLabel="Collections empty reset" /></button>
                </div>
            ) : (
                <div
                    className="grid grid-cols-1 gap-x-6 gap-y-12 md:gap-y-14 md:[grid-template-columns:repeat(var(--archive-columns-tablet),minmax(0,1fr))] xl:[grid-template-columns:repeat(var(--archive-columns-desktop),minmax(0,1fr))]"
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
