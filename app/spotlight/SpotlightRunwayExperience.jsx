"use client";

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import EditableMedia from '../../components/site-copy/EditableMedia';
import EditableText from '../../components/site-copy/EditableText';
import { useSiteCopy } from '../../components/site-copy/SiteCopyProvider';
import {
    PAGE_MOTION_CHANGE_EVENT,
    REDUCED_MOTION_QUERY,
    resolvePageMotionEnabled,
} from '../../utils/page-motion';

gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

const SCENE_SPACING = 1.22;
const SCENE_TRANSITION_END = 0.96;

function formatLookCount(count) {
    const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
    return `${safeCount} look${safeCount === 1 ? '' : 's'}`;
}

function formatSequenceNumber(index) {
    return String(Math.max(index, 0) + 1).padStart(2, '0');
}

function resolvePaletteCopy(palettes = []) {
    const values = Array.isArray(palettes)
        ? palettes.map((value) => String(value || '').trim()).filter(Boolean).slice(0, 3)
        : [];

    return values.length > 0 ? values.join(' / ') : 'Onyx / Gold';
}

function resolveCategoryCopy(categories = []) {
    const values = Array.isArray(categories)
        ? categories.map((value) => String(value || '').trim()).filter(Boolean).slice(0, 3)
        : [];

    return values.length > 0 ? values.join(' / ') : 'Atelier silhouettes';
}

function usePageMotionState() {
    // Start with true (server-safe default) to avoid hydration mismatch.
    // Real value is read from localStorage/media query only after mount.
    const [isPageMotionEnabled, setIsPageMotionEnabled] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        // Sync to real preference on mount
        setIsPageMotionEnabled(resolvePageMotionEnabled());

        const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);

        const syncMotionState = (event) => {
            if (typeof event?.detail?.isEnabled === 'boolean') {
                setIsPageMotionEnabled(event.detail.isEnabled);
                return;
            }

            setIsPageMotionEnabled(resolvePageMotionEnabled());
        };

        window.addEventListener(PAGE_MOTION_CHANGE_EVENT, syncMotionState);

        if (typeof mediaQueryList.addEventListener === 'function') {
            mediaQueryList.addEventListener('change', syncMotionState);
        } else {
            mediaQueryList.addListener(syncMotionState);
        }

        return () => {
            window.removeEventListener(PAGE_MOTION_CHANGE_EVENT, syncMotionState);

            if (typeof mediaQueryList.removeEventListener === 'function') {
                mediaQueryList.removeEventListener('change', syncMotionState);
            } else {
                mediaQueryList.removeListener(syncMotionState);
            }
        };
    }, []);

    return isPageMotionEnabled;
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

function EditorialMetricCard({ label, value, detail }) {
    return (
        <div className="rounded-[1.7rem] border border-black/10 bg-white/[0.48] p-4 backdrop-blur-xl md:p-5">
            <p className="text-[9px] uppercase tracking-[0.28em] text-black/42">{label}</p>
            <p className="mt-4 font-sans text-[1.4rem] font-medium uppercase leading-[0.9] tracking-[-0.04em] text-black/88 [overflow-wrap:anywhere]">{value}</p>
            {detail ? <p className="mt-3 text-xs leading-relaxed text-black/54">{detail}</p> : null}
        </div>
    );
}

function splitSceneTitle(title, fallbackSecondary = 'Window') {
    const words = String(title || '').trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return ['Editorial', fallbackSecondary];
    }

    if (words.length === 1) {
        return [words[0], fallbackSecondary];
    }

    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}

function buildGhostLines(primary, secondary, tertiary) {
    const values = [primary, secondary, tertiary, 'The House']
        .map((value) => String(value || '').trim())
        .filter(Boolean);

    return values.slice(0, 4);
}

function firstSentence(text = '') {
    const s = String(text || '').trim();
    const match = s.match(/^.+?[.!?](?:\s|$)/);
    return match ? match[0].trim() : s;
}

function buildSpotlightScenes(collections = [], collectionCount = 0, categoryCount = 0) {
    const leadCollection = collections[0] || null;
    const featuredCollections = collections.slice(0, 3);

    if (!leadCollection) {
        return [];
    }

    const [openingTop, openingBottom] = splitSceneTitle('Fifth Avenue', 'House');

    const openingScene = {
        key: 'opening',
        type: 'opening',
        navLabel: 'Opening',
        eyebrow: 'Editorial Entrance / Fifth Avenue',
        marker: '01 / Motion Field',
        titleLines: [openingTop, openingBottom],
        ghostLines: ['Fifth', 'Avenue', 'Stages', 'The House'],
        washClass: 'bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.44),rgba(255,255,255,0)_30%),radial-gradient(circle_at_72%_34%,rgba(252,222,204,0.26),rgba(252,222,204,0)_32%),linear-gradient(180deg,rgba(245,242,237,0.68),rgba(238,235,230,0)_62%)]',
        collection: leadCollection,
        mediaFrameIndex: 1,
        summary: '5th Avenue should behave more like a motion poster than a luxury landing page: giant type, one central window, and just enough movement to keep the image alive.',
        sideTitle: 'Soft light. Giant type. One active window.',
        sideCopy: [
            'The new direction is flatter, cleaner, and more typographic. Motion should frame the collection instead of performing around it.',
            'That keeps the page closer to an interactive editorial poster and farther from a segmented luxury microsite.',
        ],
        chips: [
            'The VA Store',
            leadCollection.name,
            resolvePaletteCopy(leadCollection.palettes),
        ],
        ctaPrimary: {
            label: 'Enter Collection',
            href: leadCollection.href,
            cursorText: 'Enter Collection',
        },
        ctaSecondary: {
            label: 'View Archive',
            href: '/collections',
            cursorText: 'View Archive',
        },
        metrics: [
            { label: 'Lead Collection', value: leadCollection.name, detail: 'The anchor window that sets the tone for the route.' },
            { label: 'Collections', value: String(Math.max(collectionCount, 1)).padStart(2, '0'), detail: 'The sequence stays concise instead of stacking endlessly down the page.' },
            { label: 'Categories', value: String(Math.max(categoryCount, 1)).padStart(2, '0'), detail: 'Selection stays curated while the archive remains broad.' },
            { label: 'Palette', value: resolvePaletteCopy(leadCollection.palettes), detail: 'The lighting language for the opening view.' },
        ],
    };

    const collectionScenes = featuredCollections.map((collection, index) => {
        const [titleTop, titleBottom] = splitSceneTitle(collection.name, 'Collection');

        return {
            key: `collection-${collection.name}`,
            type: 'collection',
            navLabel: collection.name,
            eyebrow: `Window ${formatSequenceNumber(index)} / Collection Focus`,
            marker: `${formatSequenceNumber(index + 1)} / Scene`,
            titleLines: [titleTop, titleBottom],
            ghostLines: buildGhostLines(titleTop, titleBottom, resolvePaletteCopy(collection.palettes).split(' / ')[0]),
            washClass: 'bg-[radial-gradient(circle_at_52%_26%,rgba(255,255,255,0.54),rgba(255,255,255,0)_24%),radial-gradient(circle_at_62%_36%,rgba(250,214,196,0.34),rgba(250,214,196,0)_28%),linear-gradient(180deg,rgba(247,250,255,0.18),rgba(221,229,243,0)_72%)]',
            collection,
            mediaFrameIndex: 0,
            chips: [
                formatLookCount(collection.lookCount),
                resolvePaletteCopy(collection.palettes),
                resolveCategoryCopy(collection.categories),
            ],
            summary: collection.story,
            detailCopy: collection.intro,
            note: collection.note,
            ctaPrimary: {
                label: 'Enter Collection',
                href: collection.href,
                cursorText: 'Enter Window',
            },
            ctaSecondary: {
                label: 'View Archive',
                href: '/collections',
                cursorText: 'View Archive',
            },
            metrics: [
                { label: 'Lead Piece', value: collection.leadProductName },
                { label: 'Palette', value: resolvePaletteCopy(collection.palettes) },
                { label: 'Categories', value: resolveCategoryCopy(collection.categories) },
            ],
        };
    });

    const archiveCollection = featuredCollections[featuredCollections.length - 1] || leadCollection;
    const archiveScene = {
        key: 'archive',
        type: 'archive',
        navLabel: 'Archive',
        eyebrow: 'Final Frame / Archive',
        marker: `${formatSequenceNumber(collectionScenes.length + 1)} / Exit`,
        titleLines: ['Open', 'Archive'],
        ghostLines: buildGhostLines('Open', 'Archive', archiveCollection.name),
        washClass: 'bg-[radial-gradient(circle_at_24%_30%,rgba(250,214,196,0.28),rgba(250,214,196,0)_24%),radial-gradient(circle_at_72%_24%,rgba(255,255,255,0.52),rgba(255,255,255,0)_26%),linear-gradient(180deg,rgba(247,250,255,0.14),rgba(221,229,243,0)_72%)]',
        collection: archiveCollection,
        mediaFrameIndex: 0,
        chips: [
            `${Math.max(collectionCount, 1)} collections`,
            `${Math.max(categoryCount, 1)} categories`,
            'Full archive',
        ],
        summary: 'The motion field resolves into one clean exit. The collection spotlight should end with a direct path into the archive rather than dropping into a long stack of more sections.',
        detailCopy: 'This final frame should feel like the end of a sequence, not the beginning of another page layout.',
        note: 'Once the sequence lands, archive access becomes the clearest next action.',
        ctaPrimary: {
            label: 'View Archive',
            href: '/collections',
            cursorText: 'Open Archive',
        },
        ctaSecondary: {
            label: 'Enter Selected',
            href: leadCollection.href,
            cursorText: 'Enter Selected',
        },
        metrics: [
            { label: 'Selected Window', value: leadCollection.name },
            { label: 'Lead Piece', value: leadCollection.leadProductName },
            { label: 'Palette', value: resolvePaletteCopy(leadCollection.palettes) },
        ],
    };

    return [openingScene, ...collectionScenes, archiveScene];
}

function resolveTimelineDuration(sceneCount) {
    if (sceneCount <= 1) {
        return 0;
    }

    return ((sceneCount - 2) * SCENE_SPACING) + SCENE_TRANSITION_END;
}

function resolveSceneStopTime(sceneIndex, sceneCount) {
    const duration = resolveTimelineDuration(sceneCount);

    if (sceneIndex <= 0 || duration <= 0) {
        return 0;
    }

    if (sceneIndex >= sceneCount - 1) {
        return duration;
    }

    return Math.min((sceneIndex * SCENE_SPACING) - 0.18, duration);
}

function SceneNavigator({ scenes = [], activeSceneIndex = 0, onSelect }) {
    if (scenes.length <= 1) {
        return null;
    }

    return (
        <>
            <div className="absolute right-5 top-1/2 z-[30] hidden -translate-y-1/2 flex-col gap-2 lg:flex">
                {scenes.map((scene, index) => {
                    const isActive = index === activeSceneIndex;

                    return (
                        <button
                            key={scene.key}
                            type="button"
                            onClick={() => onSelect(index)}
                            className="hover-target group flex items-center justify-end gap-3 text-right"
                            data-cursor-mode="label"
                            data-cursor-text={scene.navLabel}
                            data-cursor-attract="0.1"
                            aria-pressed={isActive}
                        >
                            <span className={`font-sans text-[9px] uppercase tracking-[0.3em] transition-colors ${isActive ? 'text-black/86' : 'text-black/34 group-hover:text-black/58'}`}>
                                {scene.navLabel}
                            </span>
                            <span className={`block h-px w-10 transition-all ${isActive ? 'bg-black/86' : 'bg-black/20 group-hover:bg-black/48'}`}></span>
                        </button>
                    );
                })}
            </div>

            <div className="absolute inset-x-5 bottom-5 z-[30] flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {scenes.map((scene, index) => {
                    const isActive = index === activeSceneIndex;

                    return (
                        <button
                            key={scene.key}
                            type="button"
                            onClick={() => onSelect(index)}
                            className={`hover-target shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.24em] backdrop-blur-xl transition-colors ${isActive ? 'border-black/18 bg-white/[0.84] text-black/88' : 'border-black/10 bg-white/[0.42] text-black/50'}`}
                            data-cursor-mode="label"
                            data-cursor-text={scene.navLabel}
                            data-cursor-attract="0.1"
                            aria-pressed={isActive}
                        >
                            {scene.navLabel}
                        </button>
                    );
                })}
            </div>
        </>
    );
}

function OpeningSceneLayer({ scene }) {
    return (
        <div className="relative h-full overflow-hidden">
            <div data-scene-wash className={`pointer-events-none absolute inset-0 ${scene.washClass}`}></div>

            {/* Top metadata bar */}
            <div className="absolute inset-x-6 top-8 z-[7] flex items-start justify-between lg:inset-x-10 lg:top-10">
                <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.38em] text-black/38">
                    <EditableText contentKey="spotlight.hero.eyebrow" fallback={scene.eyebrow} editorLabel="Spotlight hero eyebrow" />
                </p>
                <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.38em] text-black/26">{scene.marker}</p>
            </div>

            {/* Editorial image — tall portrait, floats right, no glass card */}
            <div
                data-scene-media
                className="absolute right-[5%] top-[10%] z-[5] w-[28%] overflow-hidden rounded-[1.8rem] shadow-[0_32px_80px_rgba(12,12,12,0.1)]"
                style={{ aspectRatio: '3/4' }}
            >
                <CollectionFrameImage
                    collection={scene.collection}
                    frameIndex={scene.mediaFrameIndex}
                    fallbackFrameIndex={0}
                    alt={scene.collection.name}
                    className="h-full w-full object-cover"
                    wrapperClassName="h-full w-full"
                    editorLabel={`${scene.collection.name} opening scene image`}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(240,237,232,0.18),transparent_18%,transparent_72%,rgba(12,12,12,0.22)_100%)]"></div>
                <div className="absolute inset-x-5 bottom-5 text-[9px] uppercase tracking-[0.38em] text-white/58">{scene.collection.name}</div>
            </div>

            {/* Oversized title — motion poster centerpiece */}
            <div data-scene-heading className="absolute bottom-[22%] left-0 z-[3] w-full">
                <div className="overflow-hidden pl-6 lg:pl-10">
                    <h1 className="hero-title block font-sans text-[18vw] font-medium uppercase leading-[0.82] tracking-[-0.07em] text-[#0c0c0c] translate-y-full">
                        {scene.titleLines[0]}
                    </h1>
                </div>
                <div className="overflow-hidden pl-6 lg:pl-10">
                    <h1 className="hero-title block font-sans text-[18vw] font-medium uppercase leading-[0.82] tracking-[-0.07em] text-[#0c0c0c] translate-y-full">
                        {scene.titleLines[1]}
                    </h1>
                </div>
            </div>

            {/* Bottom strip — brief tagline + CTAs */}
            <div data-scene-copy className="absolute inset-x-6 bottom-[4.5rem] z-[7] flex items-end justify-between gap-6 opacity-0 lg:inset-x-10 lg:bottom-10">
                <div className="flex max-w-[32ch] flex-col gap-2">
                    <p className="text-[9px] uppercase tracking-[0.46em] text-black/30">
                        <EditableText contentKey="spotlight.hero.tagline" fallback={scene.sideTitle} editorLabel="Spotlight hero tagline" />
                    </p>
                    <p className="text-sm leading-relaxed text-black/44">
                        <EditableText contentKey="spotlight.hero.copy" fallback={scene.summary} editorLabel="Spotlight hero copy" />
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3">
                    <a href={scene.ctaPrimary.href} className="transition-link hover-target inline-flex items-center justify-center rounded-full border border-black/88 bg-[#0c0c0c] px-7 py-4 text-[10px] uppercase tracking-[0.28em] text-white transition-colors hover:bg-black/80" data-cursor-mode="label" data-cursor-text={scene.ctaPrimary.cursorText} data-cursor-attract="0.12" data-magnetic data-magnetic-strength="14"><span data-magnetic-inner><EditableText contentKey="spotlight.cta.enter_collection" fallback={scene.ctaPrimary.label} editorLabel="Spotlight enter collection CTA" /></span></a>
                    <a href={scene.ctaSecondary.href} className="transition-link hover-target inline-flex items-center justify-center rounded-full border border-black/12 bg-transparent px-7 py-4 text-[10px] uppercase tracking-[0.28em] text-black/56 transition-colors hover:border-black/28 hover:text-black/80" data-cursor-mode="label" data-cursor-text={scene.ctaSecondary.cursorText} data-cursor-attract="0.12" data-magnetic data-magnetic-strength="14"><span data-magnetic-inner><EditableText contentKey="spotlight.cta.view_archive" fallback={scene.ctaSecondary.label} editorLabel="Spotlight view archive CTA" /></span></a>
                </div>
            </div>
        </div>
    );
}

function FocusSceneLayer({ scene, isCompactViewport = false, isFinale = false }) {
    const titleSizeClass = isCompactViewport
        ? 'text-[12vw]'
        : 'text-[14vw]';

    return (
        <div className="relative h-full overflow-hidden">
            <div data-scene-wash className={`pointer-events-none absolute inset-0 ${scene.washClass}`}></div>

            {/* Top metadata bar */}
            <div className="absolute inset-x-6 top-8 z-[7] flex items-start justify-between lg:inset-x-10 lg:top-10">
                <p className="text-[10px] uppercase tracking-[0.38em] text-black/38">{scene.eyebrow}</p>
                <p className="text-[10px] uppercase tracking-[0.38em] text-black/26">{scene.marker}</p>
            </div>

            {/* Portrait image — free-floating right anchor, no card shell */}
            <div
                data-scene-media
                className="absolute right-[5%] top-[8%] z-[5] w-[26%] overflow-hidden rounded-[1.6rem] shadow-[0_28px_72px_rgba(12,12,12,0.1)]"
                style={{ aspectRatio: '3/4' }}
            >
                <CollectionFrameImage
                    collection={scene.collection}
                    frameIndex={scene.mediaFrameIndex}
                    fallbackFrameIndex={0}
                    alt={scene.collection.name}
                    className="h-full w-full object-cover"
                    wrapperClassName="h-full w-full"
                    editorLabel={`${scene.collection.name} scrollytelling scene image`}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(240,237,232,0.14),transparent_20%,transparent_70%,rgba(12,12,12,0.2)_100%)]"></div>
                <div className="absolute inset-x-4 bottom-4 text-[9px] uppercase tracking-[0.38em] text-white/52">{scene.collection.name}</div>
            </div>

            {/* Oversized title — motion poster centerpiece */}
            <div data-scene-heading className="absolute bottom-[22%] left-0 z-[3] w-full">
                <div className="overflow-hidden pl-6 lg:pl-10">
                    <p className={`block font-sans font-medium uppercase leading-[0.82] tracking-[-0.07em] text-[#0c0c0c] [overflow-wrap:anywhere] ${titleSizeClass}`}>
                        {scene.titleLines[0]}
                    </p>
                </div>
                <div className="overflow-hidden pl-[5%] lg:pl-[6%]">
                    <p className={`block font-sans font-medium uppercase leading-[0.82] tracking-[-0.07em] text-[#0c0c0c]/72 [overflow-wrap:anywhere] ${titleSizeClass}`}>
                        {scene.titleLines[1]}
                    </p>
                </div>
            </div>

            {/* Bottom strip — single sentence + CTAs */}
            <div data-scene-copy className="absolute inset-x-6 bottom-[4.5rem] z-[7] flex items-end justify-between gap-6 opacity-0 lg:inset-x-10 lg:bottom-10">
                <div className="flex max-w-[36ch] flex-col gap-2">
                    <p className="text-[9px] uppercase tracking-[0.46em] text-black/30">
                        {isFinale ? 'Archive Access' : 'Selected Window'}
                    </p>
                    <p className="text-sm leading-relaxed text-black/44">{firstSentence(scene.summary)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3">
                    <a href={scene.ctaPrimary.href} className="transition-link hover-target inline-flex items-center justify-center rounded-full border border-black/88 bg-[#0c0c0c] px-7 py-4 text-[10px] uppercase tracking-[0.28em] text-white transition-colors hover:bg-black/80" data-cursor-mode="label" data-cursor-text={scene.ctaPrimary.cursorText} data-cursor-attract="0.12" data-magnetic data-magnetic-strength="14"><span data-magnetic-inner>{scene.ctaPrimary.label}</span></a>
                    <a href={scene.ctaSecondary.href} className="transition-link hover-target inline-flex items-center justify-center rounded-full border border-black/12 bg-transparent px-7 py-4 text-[10px] uppercase tracking-[0.28em] text-black/56 transition-colors hover:border-black/28 hover:text-black/80" data-cursor-mode="label" data-cursor-text={scene.ctaSecondary.cursorText} data-cursor-attract="0.12" data-magnetic data-magnetic-strength="14"><span data-magnetic-inner>{scene.ctaSecondary.label}</span></a>
                </div>
            </div>
        </div>
    );
}

export default function SpotlightRunwayExperience({ collections = [] }) {
    const pageRef = useRef(null);
    const scrollSectionRef = useRef(null);
    const viewportRef = useRef(null);
    const activeSceneIndexRef = useRef(0);
    const isPageMotionEnabled = usePageMotionState();
    const collectionCount = collections.length;
    const categoryCount = new Set(collections.flatMap((collection) => collection.categories || []).filter(Boolean)).size;
    const scenes = buildSpotlightScenes(collections, collectionCount, categoryCount);
    const [activeSceneIndex, setActiveSceneIndex] = useState(0);
    const [isCompactViewport, setIsCompactViewport] = useState(false);
    const sceneCount = scenes.length;
    const timelineDuration = resolveTimelineDuration(sceneCount);
    const virtualHeight = `${Math.max(sceneCount * 115, 420)}vh`;

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const syncViewportDensity = () => {
            setIsCompactViewport(window.innerHeight < 780);
        };

        syncViewportDensity();
        window.addEventListener('resize', syncViewportDensity);

        return () => window.removeEventListener('resize', syncViewportDensity);
    }, []);

    useEffect(() => {
        setActiveSceneIndex(0);
        activeSceneIndexRef.current = 0;
    }, [collectionCount, categoryCount]);

    useEffect(() => {
        if (activeSceneIndex >= sceneCount) {
            const nextIndex = Math.max(sceneCount - 1, 0);
            setActiveSceneIndex(nextIndex);
            activeSceneIndexRef.current = nextIndex;
        }
    }, [activeSceneIndex, sceneCount]);

    const handleSceneSelect = (sceneIndex) => {
        const safeIndex = Math.min(Math.max(sceneIndex, 0), Math.max(sceneCount - 1, 0));

        if (isPageMotionEnabled && scrollSectionRef.current) {
            const bounds = scrollSectionRef.current.getBoundingClientRect();
            const sectionTop = window.scrollY + bounds.top;
            const scrollRange = Math.max(scrollSectionRef.current.offsetHeight - window.innerHeight, 0);
            const progress = timelineDuration <= 0 ? 0 : resolveSceneStopTime(safeIndex, sceneCount) / timelineDuration;

            window.scrollTo({
                top: sectionTop + (scrollRange * progress),
                behavior: 'smooth',
            });

            return;
        }

        activeSceneIndexRef.current = safeIndex;
        setActiveSceneIndex(safeIndex);
    };

    useEffect(() => {
        const surface = viewportRef.current;

        if (!surface) {
            return undefined;
        }

        if (!isPageMotionEnabled) {
            surface.style.setProperty('--spotlight-x', '54%');
            surface.style.setProperty('--spotlight-y', '32%');
            return undefined;
        }

        let frameId = null;
        let nextSpotlightPosition = { x: 54, y: 32 };

        const applySpotlightPosition = () => {
            surface.style.setProperty('--spotlight-x', `${nextSpotlightPosition.x}%`);
            surface.style.setProperty('--spotlight-y', `${nextSpotlightPosition.y}%`);
            frameId = null;
        };

        const requestSpotlightUpdate = () => {
            if (frameId == null) {
                frameId = window.requestAnimationFrame(applySpotlightPosition);
            }
        };

        const handlePointerMove = (event) => {
            const bounds = surface.getBoundingClientRect();
            nextSpotlightPosition = {
                x: ((event.clientX - bounds.left) / bounds.width) * 100,
                y: ((event.clientY - bounds.top) / bounds.height) * 100,
            };

            requestSpotlightUpdate();
        };

        const handlePointerLeave = () => {
            nextSpotlightPosition = { x: 54, y: 32 };
            requestSpotlightUpdate();
        };

        surface.addEventListener('pointermove', handlePointerMove);
        surface.addEventListener('pointerleave', handlePointerLeave);

        return () => {
            surface.removeEventListener('pointermove', handlePointerMove);
            surface.removeEventListener('pointerleave', handlePointerLeave);

            if (frameId != null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [isPageMotionEnabled]);

    useEffect(() => {
        const page = pageRef.current;

        if (!page || isPageMotionEnabled) {
            return undefined;
        }

        gsap.set(
            page.querySelectorAll('[data-scene-layer], [data-scene-ghost], [data-scene-heading], [data-scene-media], [data-scene-copy], [data-scene-meta], [data-magnetic], [data-magnetic-inner]'),
            { clearProps: 'opacity,transform,filter,clipPath,y,x,scale,rotate' }
        );

        return undefined;
    }, [isPageMotionEnabled, sceneCount]);

    useGSAP(() => {
        const page = pageRef.current;
        const scrollSection = scrollSectionRef.current;
        const viewport = viewportRef.current;

        if (!page || !scrollSection || !viewport || sceneCount === 0 || !isPageMotionEnabled) {
            return undefined;
        }

        const cleanupFns = [];

        const ctx = gsap.context(() => {
            gsap.utils.toArray('[data-magnetic]').forEach((element) => {
                const magneticTarget = element;
                const magneticInner = element.querySelector('[data-magnetic-inner]') || element;
                const magneticStrength = Number.parseFloat(element.getAttribute('data-magnetic-strength') || '14');
                const innerStrength = magneticStrength * 0.42;
                const xTo = gsap.quickTo(magneticTarget, 'x', { duration: 0.34, ease: 'power3.out' });
                const yTo = gsap.quickTo(magneticTarget, 'y', { duration: 0.34, ease: 'power3.out' });
                const innerXTo = magneticInner === magneticTarget ? null : gsap.quickTo(magneticInner, 'x', { duration: 0.44, ease: 'power3.out' });
                const innerYTo = magneticInner === magneticTarget ? null : gsap.quickTo(magneticInner, 'y', { duration: 0.44, ease: 'power3.out' });

                const handlePointerMove = (event) => {
                    const bounds = magneticTarget.getBoundingClientRect();
                    const relativeX = event.clientX - (bounds.left + (bounds.width / 2));
                    const relativeY = event.clientY - (bounds.top + (bounds.height / 2));
                    const offsetX = (relativeX / bounds.width) * magneticStrength;
                    const offsetY = (relativeY / bounds.height) * magneticStrength;

                    xTo(offsetX);
                    yTo(offsetY);

                    if (innerXTo && innerYTo) {
                        innerXTo(offsetX * innerStrength);
                        innerYTo(offsetY * innerStrength);
                    }
                };

                const handlePointerLeave = () => {
                    xTo(0);
                    yTo(0);

                    if (innerXTo && innerYTo) {
                        innerXTo(0);
                        innerYTo(0);
                    }
                };

                magneticTarget.addEventListener('pointermove', handlePointerMove);
                magneticTarget.addEventListener('pointerleave', handlePointerLeave);

                cleanupFns.push(() => {
                    magneticTarget.removeEventListener('pointermove', handlePointerMove);
                    magneticTarget.removeEventListener('pointerleave', handlePointerLeave);
                });
            });

            const sceneLayers = gsap.utils.toArray('[data-scene-layer]');
            const layerEntries = sceneLayers.map((layer, index) => ({
                layer,
                index,
                ghost: layer.querySelector('[data-scene-ghost]'),
                heading: layer.querySelector('[data-scene-heading]'),
                media: layer.querySelector('[data-scene-media]'),
                copy: layer.querySelector('[data-scene-copy]'),
                meta: layer.querySelector('[data-scene-meta]'),
            }));

            layerEntries.forEach(({ layer, index, ghost, heading, media, copy, meta }) => {
                gsap.set(layer, {
                    autoAlpha: index === 0 ? 1 : 0,
                    pointerEvents: index === 0 ? 'auto' : 'none',
                });

                if (ghost) {
                    gsap.set(ghost, {
                        autoAlpha: index === 0 ? 1 : 0,
                        yPercent: index === 0 ? 0 : 14,
                        scale: index === 0 ? 1 : 0.9,
                        filter: index === 0 ? 'blur(0px)' : 'blur(18px)',
                    });
                }

                if (heading) {
                    gsap.set(heading, {
                        autoAlpha: index === 0 ? 1 : 0,
                        yPercent: index === 0 ? 0 : 18,
                        scale: index === 0 ? 1 : 0.92,
                        filter: index === 0 ? 'blur(0px)' : 'blur(12px)',
                    });
                }

                if (media) {
                    gsap.set(media, {
                        autoAlpha: index === 0 ? 1 : 0,
                        yPercent: index === 0 ? 0 : 8,
                        scale: index === 0 ? 1 : 0.94,
                        clipPath: index === 0 ? 'inset(0% 0% 0% 0% round 2.3rem)' : 'inset(12% 14% 12% 14% round 2.3rem)',
                    });
                }

                if (copy) {
                    gsap.set(copy, {
                        autoAlpha: index === 0 ? 1 : 0,
                        y: index === 0 ? 0 : 24,
                    });
                }

                if (meta) {
                    gsap.set(meta, {
                        autoAlpha: index === 0 ? 1 : 0,
                        y: index === 0 ? 0 : 24,
                    });
                }
            });

            const masterTimeline = gsap.timeline({
                defaults: { ease: 'power3.inOut' },
                scrollTrigger: {
                    trigger: scrollSection,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 1.2,
                    pin: viewport,
                    pinSpacing: false,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    onUpdate: (self) => {
                        const currentTime = self.progress * timelineDuration;
                        const nextIndex = scenes.reduce((closestIndex, _, sceneIndex) => {
                            const closestDistance = Math.abs(resolveSceneStopTime(closestIndex, sceneCount) - currentTime);
                            const sceneDistance = Math.abs(resolveSceneStopTime(sceneIndex, sceneCount) - currentTime);

                            return sceneDistance < closestDistance ? sceneIndex : closestIndex;
                        }, 0);

                        if (nextIndex !== activeSceneIndexRef.current) {
                            activeSceneIndexRef.current = nextIndex;
                            setActiveSceneIndex(nextIndex);
                        }
                    },
                },
            });

            layerEntries.forEach((entry, index) => {
                if (index >= layerEntries.length - 1) {
                    return;
                }

                const nextEntry = layerEntries[index + 1];
                const position = index * SCENE_SPACING;

                masterTimeline.set(nextEntry.layer, { autoAlpha: 1, pointerEvents: 'auto' }, position + 0.1);

                if (entry.ghost) {
                    masterTimeline.to(entry.ghost, {
                        yPercent: -10,
                        scale: 1.06,
                        filter: 'blur(10px)',
                        autoAlpha: 0,
                        duration: 0.42,
                    }, position);
                }

                if (entry.heading) {
                    masterTimeline.to(entry.heading, {
                        yPercent: -8,
                        scale: 1.04,
                        filter: 'blur(8px)',
                        autoAlpha: 0,
                        duration: 0.42,
                    }, position + 0.02);
                }

                if (entry.media) {
                    masterTimeline.to(entry.media, {
                        yPercent: -3,
                        scale: 1.02,
                        clipPath: 'inset(6% 8% 10% 8% round 2.3rem)',
                        autoAlpha: 0,
                        duration: 0.44,
                    }, position + 0.04);
                }

                if (entry.copy) {
                    masterTimeline.to(entry.copy, {
                        y: -12,
                        autoAlpha: 0,
                        duration: 0.36,
                    }, position + 0.06);
                }

                if (entry.meta) {
                    masterTimeline.to(entry.meta, {
                        y: 12,
                        autoAlpha: 0,
                        duration: 0.36,
                    }, position + 0.06);
                }

                if (nextEntry.ghost) {
                    masterTimeline.fromTo(nextEntry.ghost, {
                        yPercent: 12,
                        scale: 0.94,
                        filter: 'blur(10px)',
                        autoAlpha: 0,
                    }, {
                        yPercent: 0,
                        scale: 1,
                        filter: 'blur(0px)',
                        autoAlpha: 1,
                        duration: 0.44,
                    }, position + 0.12);
                }

                if (nextEntry.heading) {
                    masterTimeline.fromTo(nextEntry.heading, {
                        yPercent: 14,
                        scale: 0.96,
                        filter: 'blur(8px)',
                        autoAlpha: 0,
                    }, {
                        yPercent: 0,
                        scale: 1,
                        filter: 'blur(0px)',
                        autoAlpha: 1,
                        duration: 0.46,
                    }, position + 0.14);
                }

                if (nextEntry.media) {
                    masterTimeline.fromTo(nextEntry.media, {
                        yPercent: 6,
                        scale: 0.96,
                        clipPath: 'inset(10% 12% 10% 12% round 2.3rem)',
                        autoAlpha: 0,
                    }, {
                        yPercent: 0,
                        scale: 1,
                        clipPath: 'inset(0% 0% 0% 0% round 2.3rem)',
                        autoAlpha: 1,
                        duration: 0.50,
                    }, position + 0.16);
                }

                if (nextEntry.copy) {
                    masterTimeline.fromTo(nextEntry.copy, {
                        y: 16,
                        autoAlpha: 0,
                    }, {
                        y: 0,
                        autoAlpha: 1,
                        duration: 0.38,
                    }, position + 0.20);
                }

                if (nextEntry.meta) {
                    masterTimeline.fromTo(nextEntry.meta, {
                        y: 16,
                        autoAlpha: 0,
                    }, {
                        y: 0,
                        autoAlpha: 1,
                        duration: 0.38,
                    }, position + 0.22);
                }

                masterTimeline.set(entry.layer, { autoAlpha: 0, pointerEvents: 'none' }, position + 0.96);
            });
        }, page);

        return () => {
            cleanupFns.forEach((cleanup) => cleanup());
            ctx.revert();
        };
    }, { dependencies: [isPageMotionEnabled, sceneCount] });

    if (sceneCount === 0) {
        return null;
    }

    return (
        <div ref={pageRef} className="relative bg-[#f0ede8] text-[#0c0c0c]">
            <section ref={scrollSectionRef} className="relative" style={{ height: isPageMotionEnabled ? virtualHeight : '100vh' }}>
                <div ref={viewportRef} className="relative h-screen overflow-hidden" style={{ '--spotlight-x': '54%', '--spotlight-y': '32%' }}>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--spotlight-x)_var(--spotlight-y),rgba(250,214,196,0.24),rgba(250,214,196,0.1)_14%,rgba(250,214,196,0.02)_32%,transparent_60%)]"></div>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(255,255,255,0.48),transparent_24%),radial-gradient(circle_at_86%_12%,rgba(252,222,204,0.18),transparent_26%),linear-gradient(180deg,rgba(245,242,237,0.98),rgba(240,237,232,0.96)_46%,rgba(238,235,230,0.98)_100%)]"></div>

                    <SceneNavigator scenes={scenes} activeSceneIndex={activeSceneIndex} onSelect={handleSceneSelect} />

                    <div className="relative h-full">
                        {scenes.map((scene, index) => {
                            const visibilityClass = !isPageMotionEnabled
                                ? index === activeSceneIndex
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none'
                                : '';

                            return (
                                <article key={scene.key} data-scene-layer className={`absolute inset-0 transition-opacity duration-300 ${visibilityClass}`}>
                                    {scene.type === 'opening'
                                        ? <OpeningSceneLayer scene={scene} />
                                        : <FocusSceneLayer scene={scene} isCompactViewport={isCompactViewport} isFinale={scene.type === 'archive'} />}
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
