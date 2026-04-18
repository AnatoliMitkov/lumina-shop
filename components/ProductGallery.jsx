"use client";

import { startTransition, useEffect, useState } from 'react';

function formatIndex(value) {
    return String(value).padStart(2, '0');
}

export default function ProductGallery({ productName, collection, category, gallery = [], palette = [] }) {
    const images = gallery.filter(Boolean);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const handleCloseLightbox = () => {
        setIsLightboxOpen(false);
    };

    useEffect(() => {
        setActiveIndex((currentIndex) => (currentIndex >= images.length ? 0 : currentIndex));

        if (images.length === 0) {
            handleCloseLightbox();
        }
    }, [images.length]);

    useEffect(() => {
        if (!isLightboxOpen) {
            return undefined;
        }

        const nav = document.getElementById('nav');
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                handleCloseLightbox();
                return;
            }

            if (event.key === 'ArrowLeft' && images.length > 1) {
                handleStep(-1);
            }

            if (event.key === 'ArrowRight' && images.length > 1) {
                handleStep(1);
            }
        };

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        const previousNavPointerEvents = nav?.style.pointerEvents ?? '';

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        if (nav) {
            nav.style.pointerEvents = 'none';
        }
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
            if (nav) {
                nav.style.pointerEvents = previousNavPointerEvents;
            }
        };
    }, [images.length, isLightboxOpen]);

    if (images.length === 0) {
        return (
            <div className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-8 md:p-10 min-h-[32rem] flex items-end">
                <div className="max-w-lg flex flex-col gap-4">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/42">Product Imagery</p>
                    <p className="font-serif text-3xl md:text-5xl font-light leading-tight uppercase tracking-[0.08em] text-[#1C1C1C]">Imagery for this piece is still being prepared.</p>
                </div>
            </div>
        );
    }

    const activeImage = images[activeIndex];
    const hasMultipleImages = images.length > 1;
    const paletteLabel = palette.length > 0 ? palette.join(' / ') : 'Atelier neutral';
    const galleryLayoutClassName = hasMultipleImages ? 'grid-cols-1 lg:grid-cols-[5.5rem_minmax(0,1fr)]' : 'grid-cols-1';

    const handleSelect = (nextIndex) => {
        startTransition(() => {
            setActiveIndex(nextIndex);
        });
    };

    const handleStep = (direction) => {
        startTransition(() => {
            setActiveIndex((currentIndex) => {
                const nextIndex = currentIndex + direction;

                if (nextIndex < 0) {
                    return images.length - 1;
                }

                return nextIndex % images.length;
            });
        });
    };

    const handleOpenLightbox = (nextIndex = activeIndex) => {
        startTransition(() => {
            setActiveIndex(nextIndex);
        });

        setIsLightboxOpen(true);
    };

    const handleLightboxPointerMove = (event) => {
        const frameBounds = event.currentTarget.getBoundingClientRect();
        const originX = ((event.clientX - frameBounds.left) / frameBounds.width) * 100;
        const originY = ((event.clientY - frameBounds.top) / frameBounds.height) * 100;

        event.currentTarget.style.setProperty('--product-lightbox-origin-x', `${Math.min(100, Math.max(0, originX)).toFixed(2)}%`);
        event.currentTarget.style.setProperty('--product-lightbox-origin-y', `${Math.min(100, Math.max(0, originY)).toFixed(2)}%`);
    };

    const handleLightboxPointerLeave = (event) => {
        event.currentTarget.style.setProperty('--product-lightbox-origin-x', '50%');
        event.currentTarget.style.setProperty('--product-lightbox-origin-y', '50%');
    };

    return (
        <>
            <section className="flex flex-col gap-4 md:gap-5">
                <div className={`grid ${galleryLayoutClassName} gap-4 md:gap-5 items-start`}>
                {hasMultipleImages && (
                    <div className="order-2 lg:order-1 flex lg:flex-col gap-3 overflow-auto pr-1 lg:max-h-[48rem]" data-lenis-prevent-wheel>
                        {images.map((image, index) => {
                            const isActive = index === activeIndex;

                            return (
                                <button
                                    key={`${image}-${index}`}
                                    type="button"
                                    onClick={() => handleSelect(index)}
                                    aria-label={`Open image ${index + 1} for ${productName}`}
                                    aria-pressed={isActive}
                                    className={`group shrink-0 text-left ${isActive ? 'opacity-100' : 'opacity-55 hover:opacity-100'}`}
                                >
                                    <span className="mb-2 block text-[10px] uppercase tracking-[0.26em] text-[#1C1C1C]/42">{formatIndex(index + 1)}</span>
                                    <span className={`block aspect-[4/5] w-20 overflow-hidden rounded-sm border bg-[#1C1C1C] transition-all duration-300 ${isActive ? 'border-[#1C1C1C]/28 shadow-[0_18px_34px_rgba(28,28,28,0.12)]' : 'border-[#1C1C1C]/10'}`}>
                                        <img src={image} alt={`${productName} thumbnail ${index + 1}`} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="order-1 relative overflow-hidden rounded-sm border border-[#1C1C1C]/10 bg-[#161614] product-gallery-stage">
                    <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/12 bg-black/28 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/72 backdrop-blur-sm">
                        <span>{collection}</span>
                        <span>/</span>
                        <span>{category}</span>
                    </div>

                    {hasMultipleImages && (
                        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
                            <button type="button" onClick={() => handleStep(-1)} className="hover-target flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/24 text-base text-white/72 transition-colors hover:bg-black/40 hover:text-white">
                                ←
                            </button>
                            <button type="button" onClick={() => handleStep(1)} className="hover-target flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/24 text-base text-white/72 transition-colors hover:bg-black/40 hover:text-white">
                                →
                            </button>
                        </div>
                    )}

                    <div className="absolute right-4 top-4 z-10 rounded-full border border-white/12 bg-black/28 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/72 backdrop-blur-sm">
                        {formatIndex(activeIndex + 1)} / {formatIndex(images.length)}
                    </div>

                    <button
                        type="button"
                        onClick={() => handleOpenLightbox(activeIndex)}
                        aria-label={`Open ${productName} image ${activeIndex + 1} in fullscreen`}
                        className="group relative block aspect-[4/5] w-full overflow-hidden view-img hover-target text-left"
                        data-cursor-text="Expand"
                    >
                        <img key={`stage-${activeImage}`} src={activeImage} alt={productName} className="product-gallery-frame h-full w-full object-cover object-center transition-transform duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]" />
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-black/8"></span>
                        <span className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/24 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/76 backdrop-blur-sm">Open Frame</span>
                    </button>
                </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm px-5 py-4 flex flex-col gap-2">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">Gallery</p>
                        <p className="font-serif text-2xl md:text-3xl font-light leading-none uppercase tracking-[0.08em] text-[#1C1C1C]">{images.length} frames</p>
                    </div>
                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm px-5 py-4 flex flex-col gap-2">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">Palette</p>
                        <p className="font-serif text-2xl md:text-3xl font-light leading-none uppercase tracking-[0.08em] text-[#1C1C1C]">{palette.length > 0 ? formatIndex(palette.length) : '01'}</p>
                    </div>
                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm px-5 py-4 flex flex-col gap-2">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">Tone Notes</p>
                        <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{paletteLabel}</p>
                    </div>
                </div>
            </section>

            {isLightboxOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${productName} fullscreen gallery`}
                    className="product-lightbox-backdrop fixed inset-0 z-[260] overflow-hidden bg-[rgba(10,10,10,0.84)]"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            handleCloseLightbox();
                        }
                    }}
                >
                    <div className="product-lightbox-panel mx-auto flex h-[100dvh] w-full max-w-[1820px] flex-col gap-4 overflow-hidden px-4 pb-4 pt-24 md:px-8 md:pb-6 md:pt-28 xl:px-12 xl:pb-8 xl:pt-32">
                        <div className="relative z-20 flex items-center justify-between gap-4 px-1 text-white md:px-2">
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">Fullscreen Gallery</p>
                                <div className="flex flex-wrap items-center gap-3 text-sm md:text-base uppercase tracking-[0.18em] text-white/78">
                                    <span>{productName}</span>
                                    <span className="text-white/35">{formatIndex(activeIndex + 1)} / {formatIndex(images.length)}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleCloseLightbox();
                                }}
                                className="hover-target relative z-20 inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-5 text-[10px] uppercase tracking-[0.24em] text-white/74 transition-colors hover:bg-white hover:text-[#121211]"
                            >
                                Close
                            </button>
                        </div>

                        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-4 overflow-hidden pt-1 md:pt-2 xl:grid-cols-[minmax(0,1fr)_18rem] xl:grid-rows-1 xl:gap-5">
                            <div className="product-lightbox-stage relative min-h-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080808]/88">
                                {hasMultipleImages && (
                                    <>
                                        <button type="button" onClick={() => handleStep(-1)} className="hover-target absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/28 text-base text-white/78 transition-colors hover:bg-white hover:text-[#121211]">
                                            ←
                                        </button>
                                        <button type="button" onClick={() => handleStep(1)} className="hover-target absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/28 text-base text-white/78 transition-colors hover:bg-white hover:text-[#121211]">
                                            →
                                        </button>
                                    </>
                                )}

                                <div
                                    className="product-lightbox-media flex h-full items-center justify-center px-4 py-4 md:px-8 md:py-6 xl:px-12 xl:py-8"
                                    onMouseMove={handleLightboxPointerMove}
                                    onMouseLeave={handleLightboxPointerLeave}
                                >
                                    <div className="product-lightbox-frame-shell flex h-full w-full items-center justify-center">
                                        <img key={`lightbox-${activeImage}`} src={activeImage} alt={`${productName} fullscreen ${activeIndex + 1}`} className="product-lightbox-frame h-auto max-h-full w-auto max-w-full object-contain" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex min-h-0 max-h-[18rem] flex-col gap-4 overflow-hidden xl:max-h-none">
                                <div className="shrink-0 rounded-[1.5rem] border border-white/10 bg-white/[0.05] px-5 py-5 text-white">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/45 mb-3">Frame Notes</p>
                                    <div className="flex flex-col gap-2 text-sm leading-relaxed text-white/72">
                                        <p>{collection} / {category}</p>
                                        <p>{paletteLabel}</p>
                                    </div>
                                </div>

                                {hasMultipleImages && (
                                    <div className="flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 overflow-hidden" data-lenis-prevent-wheel>
                                        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.28em] text-white/42">
                                            <span>Frames</span>
                                            <span>{formatIndex(images.length)}</span>
                                        </div>
                                        <div className="flex min-h-0 gap-3 overflow-auto pb-1 xl:flex-1 xl:flex-col xl:pr-1">
                                            {images.map((image, index) => {
                                                const isActive = index === activeIndex;

                                                return (
                                                    <button
                                                        key={`${image}-lightbox-${index}`}
                                                        type="button"
                                                        onClick={() => handleSelect(index)}
                                                        aria-label={`Open image ${index + 1} for ${productName}`}
                                                        aria-pressed={isActive}
                                                        className={`group shrink-0 text-left transition-opacity ${isActive ? 'opacity-100' : 'opacity-55 hover:opacity-100'}`}
                                                    >
                                                        <span className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-white/45">{formatIndex(index + 1)}</span>
                                                        <span className={`block overflow-hidden rounded-[1.1rem] border bg-black ${isActive ? 'border-white/22 shadow-[0_24px_50px_rgba(0,0,0,0.3)]' : 'border-white/10'}`}>
                                                            <img src={image} alt={`${productName} lightbox thumbnail ${index + 1}`} className="h-28 w-24 object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] xl:h-36 xl:w-full" />
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}