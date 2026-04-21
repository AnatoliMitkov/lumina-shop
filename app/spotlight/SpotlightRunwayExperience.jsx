"use client";

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import EditableMedia from '../../components/site-copy/EditableMedia';
import EditableText from '../../components/site-copy/EditableText';
import { useSiteCopy } from '../../components/site-copy/SiteCopyProvider';

gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

function formatLookCount(count) {
    return `${count} look${count === 1 ? '' : 's'}`;
}

function CollectionFrameImage({
    collection,
    frameIndex = 0,
    fallbackFrameIndex = 0,
    alt,
    className,
    wrapperClassName = '',
    editorLabel,
}) {
    const siteCopy = useSiteCopy();
    const frames = Array.isArray(collection?.frames) ? collection.frames : [];
    const frameKeys = Array.isArray(collection?.frameKeys) ? collection.frameKeys : [];
    const hasTargetFrame = Boolean(frames[frameIndex]);
    const resolvedIndex = hasTargetFrame ? frameIndex : fallbackFrameIndex;
    const fallback = frames[resolvedIndex] || frames[0] || '';
    const frameKey = frameKeys[resolvedIndex] || '';
    const resolvedSource = frameKey && siteCopy ? siteCopy.resolveMedia(frameKey, fallback) : fallback;

    if (!frameKey) {
        return <img src={resolvedSource} alt={alt} className={className} />;
    }

    return (
        <EditableMedia
            contentKey={frameKey}
            fallback={fallback}
            editorLabel={editorLabel || `${collection?.name || 'Spotlight'} frame ${resolvedIndex + 1}`}
            alt={alt}
            wrapperClassName={wrapperClassName}
            className={className}
        />
    );
}

function RunwayWindowCard({ collection, index, isActive = false, onPreview }) {
    const cardRef = useRef(null);
    const glareRef = useRef(null);

    useEffect(() => {
        const card = cardRef.current;
        const glare = glareRef.current;

        if (!card || !glare || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            return undefined;
        }

        const handlePointerMove = (event) => {
            const bounds = card.getBoundingClientRect();
            const pointerX = (event.clientX - bounds.left) / bounds.width;
            const pointerY = (event.clientY - bounds.top) / bounds.height;
            const rotateY = (pointerX - 0.5) * 12;
            const rotateX = (0.5 - pointerY) * 10;

            gsap.to(card, {
                rotateX,
                rotateY,
                y: -8,
                duration: 0.42,
                ease: 'power3.out',
                overwrite: 'auto',
            });

            gsap.to(glare, {
                xPercent: (pointerX - 0.5) * 26,
                yPercent: (pointerY - 0.5) * 26,
                opacity: 0.92,
                duration: 0.42,
                ease: 'power3.out',
                overwrite: 'auto',
            });
        };

        const handlePointerLeave = () => {
            gsap.to(card, {
                rotateX: 0,
                rotateY: 0,
                y: 0,
                duration: 0.7,
                ease: 'power3.out',
                overwrite: 'auto',
            });

            gsap.to(glare, {
                xPercent: 0,
                yPercent: 0,
                opacity: 0.58,
                duration: 0.7,
                ease: 'power3.out',
                overwrite: 'auto',
            });
        };

        card.addEventListener('pointermove', handlePointerMove);
        card.addEventListener('pointerleave', handlePointerLeave);

        return () => {
            card.removeEventListener('pointermove', handlePointerMove);
            card.removeEventListener('pointerleave', handlePointerLeave);
        };
    }, []);

    return (
        <a
            href={collection.href}
            className="transition-link group block h-full hover-target"
            data-cursor-text="Open Window"
            onMouseEnter={() => onPreview?.(collection)}
            onFocus={() => onPreview?.(collection)}
            style={{ perspective: '1200px' }}
        >
            <article
                ref={cardRef}
                data-runway-card
                className={`relative h-full overflow-hidden rounded-[2rem] border bg-[rgba(12,12,14,0.78)] text-[#F6F0E7] transition-shadow duration-500 ${isActive ? 'border-[#D5B97E]/34 shadow-[0_32px_100px_rgba(213,185,126,0.16)]' : 'border-[#D5B97E]/18 shadow-[0_30px_80px_rgba(0,0,0,0.38)]'} ${index === 0 ? 'md:min-h-[34rem]' : 'md:min-h-[28rem]'}`}
                style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
            >
                <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_28%,rgba(0,0,0,0.05)_60%,rgba(213,185,126,0.08)_100%)]"></div>
                <div className="absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/8"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,239,207,0.18),rgba(255,239,207,0)_34%),linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.48))]"></div>
                <div ref={glareRef} className="pointer-events-none absolute inset-[-14%] bg-[radial-gradient(circle_at_center,rgba(255,242,214,0.22),rgba(255,242,214,0)_54%)] mix-blend-screen" style={{ opacity: 0.58 }}></div>

                <div className={`relative overflow-hidden ${index === 0 ? 'aspect-[16/10]' : 'aspect-[4/5]'}`} style={{ transform: 'translateZ(42px)' }}>
                    <CollectionFrameImage
                        collection={collection}
                        frameIndex={index === 0 ? 0 : 1}
                        fallbackFrameIndex={0}
                        alt={collection.name}
                        className="h-full w-full object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.05]"
                        wrapperClassName="h-full w-full"
                        editorLabel={`${collection.name} runway card image`}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.15)_38%,rgba(0,0,0,0.72))]"></div>
                </div>

                <div className="relative flex h-full flex-col gap-4 px-5 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5" style={{ transform: 'translateZ(54px)' }}>
                    <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.28em] text-[#E7D8BB]/58">
                        <span>{index === 0 ? <EditableText contentKey="spotlight.runway_cards.lead_window" fallback="Lead Window" editorLabel="Spotlight lead window label" /> : `Window ${String(index + 1).padStart(2, '0')}`}</span>
                        <span>{formatLookCount(collection.lookCount)}</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h3 className="font-serif text-[2.2rem] font-light uppercase tracking-[0.06em] leading-[0.9] text-[#F8F2E8] md:text-[2.75rem] [overflow-wrap:anywhere]">{collection.name}</h3>
                        <p className="text-sm leading-relaxed text-white/70">{collection.intro}</p>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-[#E7D8BB]/58">
                        {collection.categories.slice(0, 3).map((category) => (
                            <span key={category} className="rounded-full border border-[#D5B97E]/18 bg-white/[0.04] px-3 py-2 text-[#F3E9D6]">
                                {category}
                            </span>
                        ))}
                    </div>
                </div>
            </article>
        </a>
    );
}

function AvenueRunwayStage({ activeCollection, collections = [], onPreview }) {
    const sceneCollections = collections.slice(0, 4);
    const statChips = [
        `${formatLookCount(activeCollection.lookCount)}`,
        activeCollection.featuredCount > 0 ? `${activeCollection.featuredCount} featured` : null,
        ...activeCollection.categories.slice(0, 2),
    ].filter(Boolean);
    const windowPlacements = [
        { top: '4%', right: '18%', width: '54%', scale: 0.52, opacity: 0.22, rotateY: -18 },
        { top: '19%', right: '12%', width: '60%', scale: 0.66, opacity: 0.34, rotateY: -14 },
        { top: '43%', right: '6%', width: '72%', scale: 0.84, opacity: 0.64, rotateY: -10 },
        { top: '68%', right: '9%', width: '60%', scale: 0.7, opacity: 0.3, rotateY: -14 },
    ];

    return (
        <div className="relative min-h-[34rem] rounded-[2.4rem] border border-[#D5B97E]/14 bg-[rgba(10,10,12,0.92)] p-4 shadow-[0_40px_110px_rgba(0,0,0,0.5)] sm:min-h-[40rem] md:p-6">
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(140deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015)_26%,rgba(0,0,0,0.08)_56%,rgba(213,185,126,0.08)_100%)]"></div>
            <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2.4rem-1px)] border border-white/8"></div>

            <div className="relative h-full overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_16%_12%,rgba(255,243,220,0.08),rgba(255,243,220,0)_22%),radial-gradient(circle_at_74%_10%,rgba(213,185,126,0.12),rgba(213,185,126,0)_30%),linear-gradient(180deg,rgba(34,32,29,0.94)_0%,rgba(16,16,18,0.98)_42%,rgba(5,5,6,1)_100%)]">
                <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:6rem_6rem] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.7),rgba(0,0,0,0.18)_35%,rgba(0,0,0,0.72)_100%)]"></div>
                <div data-avenue-facade className="pointer-events-none absolute bottom-0 left-[-8%] top-[6%] w-[34%] border-r border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_14%,rgba(10,10,12,0.94)_60%,rgba(0,0,0,1)_100%)]" style={{ clipPath: 'polygon(0 0, 88% 6%, 72% 100%, 0 100%)' }}></div>
                <div data-avenue-facade className="pointer-events-none absolute bottom-0 right-[-10%] top-[2%] w-[42%] border-l border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015)_12%,rgba(14,14,16,0.94)_58%,rgba(0,0,0,1)_100%)]" style={{ clipPath: 'polygon(28% 0, 100% 0, 100% 100%, 6% 100%)' }}></div>
                <div data-avenue-road className="pointer-events-none absolute bottom-[-12%] left-[23%] h-[60%] w-[54%] opacity-90" style={{ clipPath: 'polygon(18% 0, 82% 0, 100% 100%, 0 100%)', backgroundImage: 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0)_22%,rgba(0,0,0,0.38)_100%), repeating-linear-gradient(180deg, rgba(255,245,223,0.22) 0 12px, rgba(255,245,223,0) 12px 48px)', backgroundSize: '100% 100%, 100% 180px' }}></div>
                <div className="pointer-events-none absolute bottom-[18%] left-[31%] h-[2px] w-[38%] bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,240,215,0.4),rgba(255,255,255,0))]"></div>
                <div className="pointer-events-none absolute left-[33%] top-[12%] h-[34%] w-[24%] rounded-full bg-[radial-gradient(circle,rgba(255,241,216,0.2),rgba(255,241,216,0)_76%)] blur-3xl"></div>

                <div className="absolute inset-x-4 top-4 z-[2] flex items-start justify-between gap-4 sm:inset-x-6 sm:top-6">
                    <div className="max-w-[16rem] rounded-[1.35rem] border border-white/10 bg-[rgba(10,10,12,0.52)] p-4 backdrop-blur-xl">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#D5B97E]/58"><EditableText contentKey="spotlight.stage.pov.eyebrow" fallback="Fifth Avenue POV" editorLabel="Spotlight POV eyebrow" /></p>
                        <p className="mt-3 text-sm leading-relaxed text-white/72"><EditableText contentKey="spotlight.stage.pov.copy" fallback="The left side is now the street itself: a lit window, a placard at the base, and passing windows that let the scene pivot toward any collection you choose." editorLabel="Spotlight POV copy" /></p>
                    </div>

                    <div className="hidden max-w-[18rem] flex-wrap justify-end gap-2 md:flex">
                        {statChips.map((chip) => (
                            <span key={chip} className="rounded-full border border-white/10 bg-[rgba(10,10,12,0.48)] px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-[#F1E4C5] backdrop-blur-xl">
                                {chip}
                            </span>
                        ))}
                    </div>
                </div>

                <div data-active-window className="absolute bottom-[14%] left-[6%] top-[16%] z-[2] w-[46%] min-w-[15rem] max-w-[25rem]">
                    <div className="pointer-events-none absolute left-[18%] top-[-3%] h-[18%] w-[56%] rounded-full bg-[radial-gradient(circle,rgba(255,245,223,0.34),rgba(255,245,223,0)_74%)] blur-3xl"></div>
                    <div className="absolute inset-0 rounded-[1.9rem] border border-[#D5B97E]/18 bg-[rgba(15,15,18,0.86)] shadow-[0_32px_100px_rgba(0,0,0,0.48)]"></div>
                    <div className="absolute inset-[1px] rounded-[calc(1.9rem-1px)] border border-white/10"></div>
                    <div className="absolute inset-[1.1rem] overflow-hidden rounded-[1.45rem] border border-white/12 bg-[rgba(8,8,10,0.72)]">
                        <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02)_12%,rgba(255,255,255,0)_26%,rgba(255,255,255,0.06)_48%,rgba(255,255,255,0)_72%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0)_24%,rgba(0,0,0,0.16)_52%,rgba(0,0,0,0.78)_100%)]"></div>
                        <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(circle_at_var(--spotlight-x)_var(--spotlight-y),rgba(255,244,220,0.34),rgba(255,244,220,0.1)_18%,rgba(255,244,220,0)_46%)]"></div>
                        <CollectionFrameImage
                            key={`${activeCollection.name}-window`}
                            collection={activeCollection}
                            frameIndex={0}
                            alt={activeCollection.name}
                            className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out"
                            wrapperClassName="h-full w-full"
                            editorLabel={`${activeCollection.name} stage window image`}
                        />
                    </div>

                    <div data-window-placard className="absolute inset-x-3 bottom-3 z-[4]">
                        <a href={activeCollection.href} className="transition-link hover-target block rounded-[1.45rem] border border-[#D5B97E]/18 bg-[rgba(12,12,14,0.84)] px-5 py-4 text-[#F1F1F1] shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition-colors hover:bg-[rgba(16,16,18,0.92)]" data-cursor-text="Enter Window">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-[#D5B97E]/58"><EditableText contentKey="spotlight.stage.window_placard" fallback="Window Placard" editorLabel="Spotlight window placard" /></p>
                            <p className="mt-3 font-serif text-[1.6rem] font-light uppercase leading-[0.92] text-[#F8F2E8] [overflow-wrap:anywhere]">{activeCollection.name}</p>
                            <div className="mt-3 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-white/62">
                                <span>{activeCollection.leadProductName}</span>
                                <span className="text-[#D5B97E]"><EditableText contentKey="spotlight.cta.enter_collection" fallback="Enter Collection" editorLabel="Spotlight enter collection CTA" /></span>
                            </div>
                        </a>
                    </div>
                </div>

                <div className="absolute bottom-[12%] right-[5%] top-[16%] hidden w-[38%] min-w-[13rem] sm:block">
                    {sceneCollections.map((collection, index) => {
                        const placement = windowPlacements[index] || windowPlacements[windowPlacements.length - 1];
                        const isCurrentWindow = collection.name === activeCollection.name;

                        return (
                            <button
                                key={collection.name}
                                type="button"
                                data-avenue-window-card
                                onMouseEnter={() => onPreview?.(collection)}
                                onFocus={() => onPreview?.(collection)}
                                className={`group absolute overflow-hidden rounded-[1.45rem] border text-left backdrop-blur-xl transition-[border-color,box-shadow,transform,opacity] duration-500 ${isCurrentWindow ? 'border-[#D5B97E]/30 shadow-[0_18px_60px_rgba(213,185,126,0.12)]' : 'border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.28)]'}`}
                                style={{ top: placement.top, right: placement.right, width: placement.width, opacity: placement.opacity, transform: `scale(${placement.scale}) rotateY(${placement.rotateY}deg)` }}
                            >
                                <div className="aspect-[4/5] overflow-hidden bg-[#090909]">
                                    <CollectionFrameImage
                                        collection={collection}
                                        frameIndex={1}
                                        fallbackFrameIndex={0}
                                        alt={collection.name}
                                        className="h-full w-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-[1.05]"
                                        wrapperClassName="h-full w-full"
                                        editorLabel={`${collection.name} avenue window image`}
                                    />
                                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)_22%,rgba(0,0,0,0.2)_54%,rgba(0,0,0,0.8)_100%)]"></div>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 p-3">
                                    <div className="rounded-[1rem] border border-white/10 bg-[rgba(10,10,12,0.62)] px-3 py-3 backdrop-blur-xl">
                                        <p className="text-[9px] uppercase tracking-[0.24em] text-[#D5B97E]/54">Window {String(index + 1).padStart(2, '0')}</p>
                                        <p className="mt-2 font-serif text-[1.05rem] font-light uppercase leading-[0.92] text-[#F8F2E8] [overflow-wrap:anywhere]">{collection.name}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="absolute bottom-5 left-6 right-6 z-[2] flex flex-col gap-3 md:right-[42%]">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#D5B97E]/52"><EditableText contentKey="spotlight.selected_window.eyebrow" fallback="Selected Window" editorLabel="Spotlight selected window eyebrow" /></p>
                    <p className="max-w-[22rem] text-sm leading-relaxed text-white/68">{activeCollection.story}</p>
                </div>
            </div>
        </div>
    );
}

export default function SpotlightRunwayExperience({ collections = [] }) {
    const pageRef = useRef(null);
    const spotlightRef = useRef(null);
    const leadCollection = collections[0] || null;
    const [activeCollectionName, setActiveCollectionName] = useState(leadCollection?.name || '');
    const supportingCollections = collections.slice(1, 4);
    const runwayCollections = collections.slice(0, 6);
    const categoryCount = new Set(collections.flatMap((collection) => collection.categories || []).filter(Boolean)).size;
    const collectionCount = collections.length;
    const activeCollection = collections.find((collection) => collection.name === activeCollectionName) || leadCollection;

    useEffect(() => {
        setActiveCollectionName(leadCollection?.name || '');
    }, [leadCollection?.name]);

    useEffect(() => {
        const page = pageRef.current;

        if (!page || !activeCollection) {
            return undefined;
        }

        const activeWindow = page.querySelector('[data-active-window]');
        const windowPlacard = page.querySelector('[data-window-placard]');

        if (!activeWindow || !windowPlacard) {
            return undefined;
        }

        gsap.killTweensOf([activeWindow, windowPlacard]);
        gsap.fromTo(
            [activeWindow, windowPlacard],
            { autoAlpha: 0.72, y: 14 },
            {
                autoAlpha: 1,
                y: 0,
                duration: 0.42,
                ease: 'power2.out',
                stagger: 0.04,
                overwrite: 'auto',
            }
        );

        return () => gsap.killTweensOf([activeWindow, windowPlacard]);
    }, [activeCollection]);

    const handleCollectionPreview = (collection) => {
        if (collection?.name) {
            setActiveCollectionName(collection.name);
        }
    };

    useEffect(() => {
        const page = pageRef.current;

        if (!page) {
            return undefined;
        }

        let frameId = null;
        let nextSpotlightPosition = { x: 68, y: 24 };

        const applySpotlightPosition = () => {
            page.style.setProperty('--spotlight-x', `${nextSpotlightPosition.x}%`);
            page.style.setProperty('--spotlight-y', `${nextSpotlightPosition.y}%`);
            frameId = null;
        };

        const requestSpotlightUpdate = () => {
            if (frameId == null) {
                frameId = window.requestAnimationFrame(applySpotlightPosition);
            }
        };

        const handlePointerMove = (event) => {
            const bounds = page.getBoundingClientRect();
            nextSpotlightPosition = {
                x: ((event.clientX - bounds.left) / bounds.width) * 100,
                y: ((event.clientY - bounds.top) / bounds.height) * 100,
            };

            requestSpotlightUpdate();
        };

        const handlePointerLeave = () => {
            nextSpotlightPosition = { x: 68, y: 24 };
            requestSpotlightUpdate();
        };

        page.addEventListener('pointermove', handlePointerMove);
        page.addEventListener('pointerleave', handlePointerLeave);

        return () => {
            page.removeEventListener('pointermove', handlePointerMove);
            page.removeEventListener('pointerleave', handlePointerLeave);

            if (frameId != null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, []);

    useGSAP(() => {
        const page = pageRef.current;

        if (!page) {
            return undefined;
        }

        const ctx = gsap.context(() => {
            gsap.utils.toArray('[data-avenue-facade]').forEach((facade, index) => {
                gsap.to(facade, {
                    yPercent: index === 0 ? -8 : -12,
                    xPercent: index === 0 ? -2 : 3,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: spotlightRef.current,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                });
            });

            gsap.utils.toArray('[data-avenue-road]').forEach((road) => {
                gsap.to(road, {
                    backgroundPosition: '50% 110%',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: spotlightRef.current,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                });
            });

            gsap.utils.toArray('[data-avenue-window-card]').forEach((card, index) => {
                gsap.fromTo(
                    card,
                    { yPercent: -8 - (index * 5) },
                    {
                        yPercent: 16 + (index * 8),
                        ease: 'none',
                        scrollTrigger: {
                            trigger: spotlightRef.current,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: true,
                        },
                    }
                );
            });

            gsap.utils.toArray('[data-runway-card]').forEach((card, index) => {
                gsap.fromTo(
                    card,
                    { y: 56, autoAlpha: 0 },
                    {
                        y: 0,
                        autoAlpha: 1,
                        duration: 1,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: card,
                            start: 'top 86%',
                        },
                    }
                );

                gsap.to(card, {
                    yPercent: index % 2 === 0 ? -7 : 7,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: card,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                });
            });

            gsap.utils.toArray('[data-runway-copy]').forEach((copyBlock) => {
                gsap.fromTo(
                    copyBlock,
                    { y: 42, autoAlpha: 0 },
                    {
                        y: 0,
                        autoAlpha: 1,
                        duration: 0.96,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: copyBlock,
                            start: 'top 85%',
                        },
                    }
                );
            });
        }, page);

        return () => ctx.revert();
    }, [collections]);

    if (!leadCollection) {
        return null;
    }

    return (
        <div
            ref={pageRef}
            className="relative overflow-hidden bg-[#050505] text-[#F6F0E7]"
            style={{
                '--spotlight-x': '68%',
                '--spotlight-y': '24%',
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--spotlight-x)_var(--spotlight-y),rgba(248,225,177,0.28),rgba(248,225,177,0.12)_12%,rgba(248,225,177,0.05)_28%,rgba(5,5,5,0)_54%)]"></div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(255,240,215,0.08),rgba(255,240,215,0)_24%),radial-gradient(circle_at_84%_18%,rgba(213,185,126,0.1),rgba(213,185,126,0)_26%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18)_18%,rgba(0,0,0,0.34)_42%,rgba(5,5,5,0)_100%)]"></div>
            <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:7rem_7rem] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.7),rgba(0,0,0,0.1)_35%,rgba(0,0,0,0.65)_100%)]"></div>

            <div className="relative mx-auto flex w-full max-w-[1800px] flex-col gap-20 px-5 pb-24 pt-32 sm:px-6 md:px-10 lg:pt-36 xl:px-12 xl:pb-28">
                <section className="grid grid-cols-1 gap-10 border-b border-white/8 pb-10 xl:grid-cols-[0.96fr_1.04fr] xl:items-end">
                    <div className="min-w-0">
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.34em] text-[#D5B97E]/55"><EditableText contentKey="spotlight.hero.eyebrow" fallback="Spotlight / Fifth Avenue Walkthrough" editorLabel="Spotlight hero eyebrow" /></p>
                        <div className="mt-5 overflow-hidden"><h1 className="hero-title font-serif text-[4.2rem] font-light uppercase leading-[0.84] tracking-[0.04em] text-[#F8F2E8] sm:text-[5.6rem] lg:text-[7rem] xl:text-[8.2rem] translate-y-full"><EditableText contentKey="spotlight.hero.title.line_one" fallback="Fifth" editorLabel="Spotlight hero title line one" /></h1></div>
                        <div className="overflow-hidden"><h1 className="hero-title font-serif text-[4.2rem] font-light uppercase leading-[0.84] tracking-[0.04em] text-[#F8F2E8] sm:text-[5.6rem] lg:text-[7rem] xl:text-[8.2rem] translate-y-full"><EditableText contentKey="spotlight.hero.title.line_two" fallback="Avenue" editorLabel="Spotlight hero title line two" /></h1></div>
                        <div className="mt-6 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.28em] text-[#E7D8BB]/58 hero-sub opacity-0">
                            <span className="rounded-full border border-[#D5B97E]/16 bg-white/[0.03] px-4 py-2"><EditableText contentKey="spotlight.hero.chips.brand" fallback="The VA Store" editorLabel="Spotlight hero brand chip" /></span>
                            <span className="rounded-full border border-[#D5B97E]/16 bg-white/[0.03] px-4 py-2"><EditableText contentKey="spotlight.hero.chips.spotlight" fallback="Collection Spotlight" editorLabel="Spotlight hero spotlight chip" /></span>
                            <span className="rounded-full border border-[#D5B97E]/16 bg-white/[0.03] px-4 py-2"><EditableText contentKey="spotlight.hero.chips.lighting" fallback="Museum Lighting" editorLabel="Spotlight hero lighting chip" /></span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.12fr_0.88fr]">
                        <div data-runway-copy className="rounded-[2rem] border border-white/8 bg-white/[0.03] px-6 py-6 backdrop-blur-xl">
                            <p className="hero-sub opacity-0 text-sm leading-relaxed text-white/72 md:text-base"><EditableText contentKey="spotlight.hero.copy" fallback="Spotlight now behaves like a night walk past the house windows: glass showcase depth, volumetric light, controlled motion, and collection cards that open directly into the filtered archive once a window catches you." editorLabel="Spotlight hero copy" /></p>
                            <p className="hero-sub mt-4 opacity-0 text-[10px] uppercase tracking-[0.3em] text-[#D5B97E]/52"><EditableText contentKey="spotlight.hero.tagline" fallback="Deep blacks. Soft golds. After-dark runway presence." editorLabel="Spotlight hero tagline" /></p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-1">
                            {[
                                ['Lead Collection', leadCollection.name],
                                ['Collections', String(collectionCount).padStart(2, '0')],
                                ['Categories', String(Math.max(categoryCount, 1)).padStart(2, '0')],
                            ].map(([label, value]) => (
                                <div key={label} data-runway-copy className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-5 py-5 backdrop-blur-xl">
                                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#D5B97E]/55">{label}</p>
                                    <p className="mt-4 font-serif text-[1.9rem] font-light uppercase leading-[0.95] text-[#F8F2E8] [overflow-wrap:anywhere]">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section ref={spotlightRef} className="grid grid-cols-1 gap-8 xl:grid-cols-[1.12fr_0.88fr] xl:items-center">
                    <AvenueRunwayStage activeCollection={activeCollection} collections={collections} onPreview={handleCollectionPreview} />

                    <div className="flex flex-col gap-5">
                        <div data-runway-copy className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 backdrop-blur-xl md:p-8">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-[#D5B97E]/55"><EditableText contentKey="spotlight.selected_window.eyebrow" fallback="Selected Window" editorLabel="Spotlight selected window eyebrow" /></p>
                            <div className="mt-4 overflow-hidden"><h2 className="hero-title font-serif text-[2.7rem] font-light uppercase leading-[0.92] text-[#F8F2E8] md:text-[4.2rem] translate-y-full [overflow-wrap:anywhere]">{activeCollection.name}</h2></div>
                            <div className="hero-sub mt-5 opacity-0 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-[#E7D8BB]/58">
                                <span className="rounded-full border border-[#D5B97E]/16 bg-white/[0.03] px-3 py-2">{formatLookCount(activeCollection.lookCount)}</span>
                                {activeCollection.featuredCount > 0 && <span className="rounded-full border border-[#D5B97E]/16 bg-white/[0.03] px-3 py-2">{activeCollection.featuredCount} Featured</span>}
                                {activeCollection.categories.slice(0, 3).map((category) => (
                                    <span key={category} className="rounded-full border border-[#D5B97E]/16 bg-white/[0.03] px-3 py-2">{category}</span>
                                ))}
                            </div>
                            <p className="hero-sub mt-6 opacity-0 text-sm leading-relaxed text-white/72 md:text-base">{activeCollection.story}</p>
                            <p className="hero-sub mt-6 opacity-0 border-l border-[#D5B97E]/22 pl-4 font-serif text-lg font-light leading-relaxed text-[#F1E4C5] md:text-xl">"{activeCollection.note}"</p>
                            <div className="hero-sub mt-7 opacity-0 flex flex-col gap-3 sm:flex-row">
                                <a href={activeCollection.href} className="transition-link inline-flex items-center justify-center rounded-full border border-[#D5B97E]/24 bg-[#D5B97E] px-7 py-4 text-[10px] uppercase tracking-[0.28em] text-[#090909] hover-target transition-colors hover:bg-[#E7D8BB]"><EditableText contentKey="spotlight.cta.enter_collection" fallback="Enter Collection" editorLabel="Spotlight enter collection CTA" /></a>
                                <a href="/collections" className="transition-link inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 py-4 text-[10px] uppercase tracking-[0.28em] text-white/82 hover-target transition-colors hover:bg-white/[0.08]"><EditableText contentKey="spotlight.cta.view_archive" fallback="View Archive" editorLabel="Spotlight view archive CTA" /></a>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {supportingCollections.map((collection) => (
                                <a key={collection.name} href={collection.href} onMouseEnter={() => handleCollectionPreview(collection)} onFocus={() => handleCollectionPreview(collection)} className={`transition-link group rounded-[1.7rem] border bg-white/[0.03] p-4 backdrop-blur-xl hover-target ${collection.name === activeCollection.name ? 'border-[#D5B97E]/24 shadow-[0_18px_60px_rgba(213,185,126,0.12)]' : 'border-white/8'}`} data-cursor-text="Open Window">
                                    <div className="overflow-hidden rounded-[1.3rem] border border-white/10 bg-[#111111] aspect-[4/5]">
                                        <CollectionFrameImage
                                            collection={collection}
                                            frameIndex={1}
                                            fallbackFrameIndex={0}
                                            alt={collection.name}
                                            className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.04]"
                                            wrapperClassName="h-full w-full"
                                            editorLabel={`${collection.name} support card image`}
                                        />
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#D5B97E]/52">{formatLookCount(collection.lookCount)}</p>
                                        <p className="font-serif text-[1.55rem] font-light uppercase leading-[0.95] text-[#F8F2E8] [overflow-wrap:anywhere]">{collection.name}</p>
                                        <p className="text-sm leading-relaxed text-white/66">{collection.intro}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
                    <div data-runway-copy className="rounded-[2rem] border border-white/8 bg-[rgba(10,10,12,0.78)] p-6 md:p-8 backdrop-blur-xl xl:sticky xl:top-32">
                        <p className="text-[10px] uppercase tracking-[0.32em] text-[#D5B97E]/55"><EditableText contentKey="spotlight.catwalk.eyebrow" fallback="Collection Catwalk" editorLabel="Spotlight catwalk eyebrow" /></p>
                        <h2 className="mt-4 font-serif text-[2.4rem] font-light uppercase leading-[0.92] text-[#F8F2E8] md:text-[3.8rem]"><EditableText contentKey="spotlight.catwalk.title" fallback="Walk The House Windows" editorLabel="Spotlight catwalk title" /></h2>
                        <p className="mt-5 text-sm leading-relaxed text-white/72 md:text-base"><EditableText contentKey="spotlight.catwalk.copy" fallback="Each collection card below behaves like a luxury window on the avenue. The lighting shifts, the cards tilt with the pointer, and the motion stays focused on opening the archive with that collection already selected." editorLabel="Spotlight catwalk copy" /></p>
                        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {[
                                ['Runway Pace', 'Scrollytelling layers move at different speeds to simulate walking past a sequence of storefront windows.'],
                                ['Museum Light', 'Soft gold gradients and tracked radial light keep the collection feeling curated rather than flat.'],
                            ].map(([label, copy]) => (
                                <div key={label} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#D5B97E]/58"><EditableText contentKey={`spotlight.catwalk.cards.${label.toLowerCase().replace(/\s+/g, '_')}.label`} fallback={label} editorLabel={`${label} spotlight card label`} /></p>
                                    <p className="mt-4 text-sm leading-relaxed text-white/68"><EditableText contentKey={`spotlight.catwalk.cards.${label.toLowerCase().replace(/\s+/g, '_')}.copy`} fallback={copy} editorLabel={`${label} spotlight card copy`} /></p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-white/8 bg-white/[0.03]">
                            <div className="grid grid-cols-[0.74fr_1fr] items-stretch">
                                <div className="relative min-h-[14rem] bg-[#0b0b0d]">
                                    <CollectionFrameImage
                                        collection={activeCollection}
                                        frameIndex={1}
                                        fallbackFrameIndex={0}
                                        alt={activeCollection.name}
                                        className="h-full w-full object-cover"
                                        wrapperClassName="h-full w-full"
                                        editorLabel={`${activeCollection.name} current focus image`}
                                    />
                                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)_22%,rgba(0,0,0,0.18)_54%,rgba(0,0,0,0.76)_100%)]"></div>
                                </div>
                                <div className="flex flex-col justify-between gap-4 p-5">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#D5B97E]/58"><EditableText contentKey="spotlight.current_focus.eyebrow" fallback="Current Focus" editorLabel="Spotlight current focus eyebrow" /></p>
                                        <p className="mt-3 font-serif text-[1.8rem] font-light uppercase leading-[0.92] text-[#F8F2E8] [overflow-wrap:anywhere]">{activeCollection.name}</p>
                                        <p className="mt-3 text-sm leading-relaxed text-white/68">{activeCollection.intro}</p>
                                    </div>
                                    <a href={activeCollection.href} className="transition-link inline-flex w-full items-center justify-between rounded-full border border-[#D5B97E]/20 bg-[rgba(12,12,14,0.82)] px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-[#F1F1F1] hover-target transition-colors hover:bg-[rgba(18,18,20,0.92)]">
                                        <span><EditableText contentKey="spotlight.current_focus.cta" fallback="Step Inside" editorLabel="Spotlight current focus CTA" /></span>
                                        <span className="text-[#D5B97E]">{String(activeCollection.lookCount).padStart(2, '0')}</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {runwayCollections.map((collection, index) => (
                            <RunwayWindowCard key={collection.name} collection={collection} index={index} isActive={collection.name === activeCollection.name} onPreview={handleCollectionPreview} />
                        ))}
                    </div>
                </section>

                <section className="relative overflow-hidden rounded-[2.2rem] border border-white/8 bg-[rgba(10,10,12,0.82)] p-6 md:p-8 xl:p-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,240,215,0.12),rgba(255,240,215,0)_26%),radial-gradient(circle_at_82%_18%,rgba(213,185,126,0.12),rgba(213,185,126,0)_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0)_18%,rgba(0,0,0,0.22)_56%,rgba(0,0,0,0.48)_100%)]"></div>
                    <div className="relative grid grid-cols-1 gap-8 xl:grid-cols-[1fr_0.85fr] xl:items-end">
                        <div data-runway-copy>
                            <p className="text-[10px] uppercase tracking-[0.32em] text-[#D5B97E]/55"><EditableText contentKey="spotlight.after_dark.eyebrow" fallback="After Dark" editorLabel="Spotlight after dark eyebrow" /></p>
                            <h2 className="mt-4 font-serif text-[2.4rem] font-light uppercase leading-[0.92] text-[#F8F2E8] md:text-[4rem]"><EditableText contentKey="spotlight.after_dark.title" fallback="The virtual walk ends where the archive begins." editorLabel="Spotlight after dark title" /></h2>
                            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/72 md:text-base"><EditableText contentKey="spotlight.after_dark.copy" fallback="Choose the selected window for the strongest entrance or move directly into the archive if you already know the silhouette you want. Spotlight is here to make the collections feel cinematic before the product grid takes over." editorLabel="Spotlight after dark copy" /></p>
                        </div>

                        <div data-runway-copy className="flex flex-col gap-4 sm:flex-row xl:justify-end">
                            <a href={activeCollection.href} className="transition-link inline-flex items-center justify-center rounded-full border border-[#D5B97E]/24 bg-[#D5B97E] px-7 py-4 text-[10px] uppercase tracking-[0.28em] text-[#090909] hover-target transition-colors hover:bg-[#E7D8BB]"><EditableText contentKey="spotlight.after_dark.cta.enter_selected" fallback="Enter Selected Collection" editorLabel="Spotlight after dark enter selected CTA" /></a>
                            <a href="/collections" className="transition-link inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 py-4 text-[10px] uppercase tracking-[0.28em] text-white/82 hover-target transition-colors hover:bg-white/[0.08]"><EditableText contentKey="spotlight.after_dark.cta.view_archive" fallback="View Full Archive" editorLabel="Spotlight after dark view archive CTA" /></a>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
