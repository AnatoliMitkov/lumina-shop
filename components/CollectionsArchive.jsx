"use client";

import { gsap } from 'gsap';
import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
    buildProductHref,
    formatProductCurrency,
    normalizeProductRecord,
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

function StatCard({ label, value, copy, delayMs = 0 }) {
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
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">{label}</p>
            <p className="storefront-stat-display font-serif font-light text-[#1C1C1C]">{String(displayValue).padStart(2, '0')}</p>
            <p className="text-xs md:text-sm leading-relaxed text-[#1C1C1C]/58">{copy}</p>
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

            <a href={href} className="transition-link w-full aspect-[3/4] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C] ring-1 ring-transparent transition-[box-shadow,transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={mediaStyle} data-cursor-text="Inspect">
                <img className={`w-full h-full object-cover transition-transform duration-[1.8s] ease-out ${isFocused ? 'scale-[1.08]' : 'group-hover:scale-[1.04]'}`} src={image} alt={product.name} />
            </a>

            <div className="collection-card-copy flex flex-col gap-3 transition-[transform,opacity] duration-500 ease-out">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                    <span className={`rounded-full border px-3 py-2 transition-colors duration-300 ${isFocused ? 'border-[#1C1C1C]/18 bg-white text-[#1C1C1C]' : 'border-[#1C1C1C]/10 bg-white/60'}`}>{product.collection}</span>
                    <span className={`rounded-full border px-3 py-2 transition-colors duration-300 ${isFocused ? 'border-[#1C1C1C]/18 bg-white text-[#1C1C1C]' : 'border-[#1C1C1C]/10 bg-white/60'}`}>{product.category}</span>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div>
                        <a href={href} className="transition-link font-serif text-2xl md:text-3xl font-light leading-none uppercase tracking-[0.08em] hover-target">{product.name}</a>
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

function FeaturedCarousel({ products, activeIndex, onDotSelect, onStep }) {
    if (products.length === 0) {
        return null;
    }

    return (
        <section className="mb-16 md:mb-20 grid grid-cols-1 lg:grid-cols-[0.98fr_0.88fr] gap-6 md:gap-8 items-start border border-[#1C1C1C]/10 bg-white/40 rounded-sm overflow-hidden">
            <div className="storefront-media-stage relative aspect-[5/4] lg:aspect-auto overflow-hidden bg-[#1C1C1C]">
                <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/70 backdrop-blur-sm">
                    <span>Featured Reel</span>
                    <span>{String(activeIndex + 1).padStart(2, '0')}</span>
                    <span>/</span>
                    <span>{String(products.length).padStart(2, '0')}</span>
                </div>

                <div className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                    {products.map((product) => (
                        <a key={product.id || product.slug} href={buildProductHref(product)} className="transition-link view-img hover-target block min-w-full h-full" data-cursor-text="Spotlight">
                            <img src={resolveProductGallery(product)[0] || product.image_main} alt={product.name} className="w-full h-full object-cover" />
                        </a>
                    ))}
                </div>

                {products.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-4 border-t border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            {products.map((product, index) => (
                                <button
                                    key={`${product.id || product.slug}-dot`}
                                    type="button"
                                    onClick={() => onDotSelect(index)}
                                    aria-label={`Go to featured product ${index + 1}`}
                                    className={`h-2.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-10 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/55'}`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => onStep(-1)} className="hover-target h-10 w-10 rounded-full border border-white/12 text-base text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                                ←
                            </button>
                            <button type="button" onClick={() => onStep(1)} className="hover-target h-10 w-10 rounded-full border border-white/12 text-base text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                                →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-5 md:p-7 flex flex-col gap-5 md:gap-6">
                <div>
                    <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/45 mb-4">Featured Spotlight / {products[activeIndex].collection}</p>
                    <div className="overflow-hidden"><h3 className="hero-title storefront-section-display font-serif font-light uppercase tracking-[0.1em] translate-y-full">{products[activeIndex].name}</h3></div>
                    {products[activeIndex].subtitle && <p className="hero-sub opacity-0 mt-5 max-w-xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">{products[activeIndex].subtitle}</p>}
                </div>

                <div className="hero-sub opacity-0 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">
                    <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm px-4 py-3.5">
                        <p className="mb-2">Price</p>
                        <p className="font-serif text-xl md:text-2xl font-light text-[#1C1C1C] tracking-normal">{formatProductCurrency(products[activeIndex].price)}</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm px-4 py-3.5">
                        <p className="mb-2">Lead Time</p>
                        <p className="font-serif text-xl md:text-2xl font-light text-[#1C1C1C] tracking-normal">{products[activeIndex].lead_time_days}d</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm px-4 py-3.5">
                        <p className="mb-2">Status</p>
                        <p className="font-serif text-xl md:text-2xl font-light text-[#1C1C1C] tracking-normal">{products[activeIndex].inventory_count > 0 ? 'Ready' : 'Made'}</p>
                    </div>
                </div>

                <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/65">{products[activeIndex].story || products[activeIndex].description}</p>

                <div className="hero-sub opacity-0 flex flex-col sm:flex-row gap-3 pt-1">
                    <a href={buildProductHref(products[activeIndex])} className="transition-link inline-flex items-center justify-center px-6 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover-target hover:bg-black transition-colors">View Spotlight Piece</a>
                    <a href="/spotlight" className="transition-link inline-flex items-center justify-center px-6 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover-target hover:bg-white transition-colors">Open Spotlight Page</a>
                </div>
            </div>
        </section>
    );
}

export default function CollectionsArchive({ products = [] }) {
    const archiveRef = useRef(null);
    const hoverIntentTimeoutRef = useRef(null);
    const normalizedProducts = sortProducts(products)
        .map((product) => normalizeProductRecord(product))
        .filter((product) => product.status !== 'archived');
    const [activeCollection, setActiveCollection] = useState('All');
    const [searchValue, setSearchValue] = useState('');
    const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
    const [focusedProductId, setFocusedProductId] = useState(null);
    const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());

    const collectionOptions = ['All', ...Array.from(new Set(normalizedProducts.map((product) => product.collection).filter(Boolean)))];
    const featuredProducts = normalizedProducts.filter((product) => product.featured).slice(0, 5);
    const filteredProducts = normalizedProducts.filter((product) => {
        const matchesCollection = activeCollection === 'All' || product.collection === activeCollection;
        const matchesSearch = !deferredSearch || buildSearchString(product).includes(deferredSearch);

        return matchesCollection && matchesSearch;
    });

    useEffect(() => {
        if (featuredProducts.length === 0) {
            setActiveFeaturedIndex(0);
            return;
        }

        setActiveFeaturedIndex((currentIndex) => currentIndex >= featuredProducts.length ? 0 : currentIndex);
    }, [featuredProducts.length]);

    useEffect(() => {
        if (featuredProducts.length <= 1) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            startTransition(() => {
                setActiveFeaturedIndex((currentIndex) => (currentIndex + 1) % featuredProducts.length);
            });
        }, 5200);

        return () => window.clearInterval(intervalId);
    }, [featuredProducts.length]);

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
    }, [activeCollection, deferredSearch, filteredProducts.length]);

    useEffect(() => {
        return () => {
            if (hoverIntentTimeoutRef.current) {
                window.clearTimeout(hoverIntentTimeoutRef.current);
            }
        };
    }, []);

    const handleFeaturedStep = (direction) => {
        if (featuredProducts.length <= 1) {
            return;
        }

        startTransition(() => {
            setActiveFeaturedIndex((currentIndex) => {
                const nextIndex = currentIndex + direction;

                if (nextIndex < 0) {
                    return featuredProducts.length - 1;
                }

                return nextIndex % featuredProducts.length;
            });
        });
    };

    const handleFeaturedSelect = (index) => {
        startTransition(() => {
            setActiveFeaturedIndex(index);
        });
    };

    const handleReset = () => {
        setActiveCollection('All');
        setSearchValue('');
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
            {featuredProducts.length > 0 && <FeaturedCarousel products={featuredProducts} activeIndex={activeFeaturedIndex} onDotSelect={handleFeaturedSelect} onStep={handleFeaturedStep} />}

            <section className="mb-12 md:mb-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <StatCard label="Pieces" value={normalizedProducts.length} delayMs={0} copy="A concise edit of visible looks ready to browse at once." />
                <StatCard label="Featured" value={featuredProducts.length} delayMs={160} copy="Lead pieces carrying the strongest seasonal direction right now." />
                <StatCard label="Collections" value={Math.max(collectionOptions.length - 1, 1)} delayMs={320} copy="Distinct storylines shaping the archive into easier visual paths." />
            </section>

            <section className="mb-10 md:mb-12 flex flex-col gap-6 border-y border-[#1C1C1C]/10 py-8 md:py-10">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div className="max-w-2xl">
                        <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/45 mb-4">Filter The Archive</p>
                        <div className="overflow-hidden"><h3 className="hero-title storefront-section-display font-serif font-light uppercase tracking-[0.1em] translate-y-full">Find A Signature</h3></div>
                        <div className="overflow-hidden"><h3 className="hero-title storefront-section-display storefront-hero-shift font-serif font-light uppercase tracking-[0.1em] translate-y-full">Piece</h3></div>
                    </div>

                    <label className="hero-sub opacity-0 flex w-full max-w-xl flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/48">
                        Search Pieces
                        <input
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            placeholder="Search by collection, category, mood, or name"
                            className="h-13 border border-[#1C1C1C]/12 bg-white/75 px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                        />
                    </label>
                </div>

                <div className="reveal-text opacity-0 translate-y-8 flex flex-wrap gap-2">
                    {collectionOptions.map((option) => (
                        <FilterButton key={option} label={option} isActive={activeCollection === option} onClick={() => setActiveCollection(option)} />
                    ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42">
                    <p>{String(filteredProducts.length).padStart(2, '0')} piece{filteredProducts.length === 1 ? '' : 's'} visible</p>
                    {(activeCollection !== 'All' || searchValue) && (
                        <button type="button" onClick={handleReset} className="hover-target border border-[#1C1C1C]/12 bg-white/60 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/58 transition-colors hover:text-[#1C1C1C]">
                            Reset Archive
                        </button>
                    )}
                </div>
            </section>

            {filteredProducts.length === 0 ? (
                <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-8 md:p-10 flex flex-col gap-5">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">No Matches</p>
                    <p className="font-serif text-3xl md:text-5xl font-light leading-tight max-w-2xl">Nothing matched that filter. Try a broader collection or clear the search phrase.</p>
                    <button type="button" onClick={handleReset} className="hover-target w-max px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium">Reset Archive</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12 md:gap-y-14">
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
