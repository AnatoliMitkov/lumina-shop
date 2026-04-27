"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CreatorProgramForm from './CreatorProgramForm';
import {
    CREATOR_PROGRAM_BENEFITS,
    CREATOR_PROGRAM_BRAND_NAME,
    CREATOR_PROGRAM_HASHTAG,
    getCreatorProgramText,
} from '../utils/creator-program';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../utils/language';
import {
    PAGE_MOTION_CHANGE_EVENT,
    REDUCED_MOTION_QUERY,
    resolvePageMotionEnabled,
} from '../utils/page-motion';

const ORBIT_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const METRIC_LAYOUT = {
    stripTopMobile: '3.7rem',
    stripTopDesktop: '5rem',
    stripInsetMobile: '1.5rem',
    stripInsetDesktop: '3.5rem',
    leadingGhostTopMobile: 'clamp(1.2rem,4.2vw,3.1rem)',
    leadingGhostTopDesktop: 'clamp(1.5rem,4.1vw,3.3rem)',
    trailingGhostTopMobile: 'clamp(3.2rem,7.6vw,5.5rem)',
    trailingGhostTopDesktop: 'clamp(2.8rem,6.1vw,4.8rem)',
    numberSize: 'clamp(4rem,10.6vw,10rem)',
};

function usePageMotionState() {
    const [isPageMotionEnabled, setIsPageMotionEnabled] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

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

function wrapIndex(index, total) {
    if (!total) {
        return 0;
    }

    return (index + total) % total;
}

function resolveOffset(index, activeIndex, total) {
    let delta = index - activeIndex;
    const midpoint = Math.floor(total / 2);

    if (delta > midpoint) {
        delta -= total;
    }

    if (delta < -midpoint) {
        delta += total;
    }

    return delta;
}

function buildCardMotion(offset, isPageMotionEnabled) {
    const absOffset = Math.abs(offset);
    const direction = Math.sign(offset) || 0;
    const presets = {
        0: { x: 0, y: -8, z: 200, scale: 1, opacity: 1, rotateY: 0, blur: 0 },
        1: { x: 27, y: 14, z: 40, scale: 0.78, opacity: 0.58, rotateY: 18, blur: 0.8 },
        2: { x: 48, y: 42, z: -180, scale: 0.56, opacity: 0.16, rotateY: 28, blur: 2.4 },
    };
    const preset = presets[Math.min(absOffset, 2)];

    return {
        opacity: absOffset > 2 ? 0 : preset.opacity,
        pointerEvents: absOffset > 2 ? 'none' : 'auto',
        zIndex: 40 - absOffset,
        filter: `blur(${absOffset > 2 ? 5 : preset.blur}px) saturate(${absOffset === 0 ? 1 : 0.88})`,
        transform: `translate3d(${direction * preset.x}vw, ${preset.y}px, ${absOffset > 2 ? -320 : preset.z}px) rotateY(${-direction * preset.rotateY}deg) scale(${absOffset > 2 ? 0.48 : preset.scale})`,
        transition: isPageMotionEnabled
            ? `transform 720ms ${ORBIT_EASE}, opacity 520ms ${ORBIT_EASE}, filter 520ms ${ORBIT_EASE}`
            : 'none',
    };
}

function parseMetricValue(value) {
    const rawValue = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    const match = rawValue.match(/(\d+(?:\.\d+)?)/);

    if (!match) {
        return {
            rawValue,
            hasNumericValue: false,
            numericValue: 0,
            prefix: '',
            suffix: '',
            minimumIntegerDigits: 0,
            fractionDigits: 0,
        };
    }

    const numberToken = match[1];
    const [integerPart = '0', decimalPart = ''] = numberToken.split('.');
    const numericValue = Number(numberToken);

    return {
        rawValue,
        hasNumericValue: Number.isFinite(numericValue),
        numericValue: Number.isFinite(numericValue) ? numericValue : 0,
        prefix: rawValue.slice(0, match.index).trim(),
        suffix: rawValue.slice(match.index + numberToken.length).trim(),
        minimumIntegerDigits: decimalPart ? 0 : integerPart.length,
        fractionDigits: decimalPart.length,
    };
}

function formatAnimatedMetricNumber(value, parsedMetric) {
    if (!parsedMetric?.hasNumericValue) {
        return parsedMetric?.rawValue || '';
    }

    if (parsedMetric.fractionDigits > 0) {
        return value.toFixed(parsedMetric.fractionDigits);
    }

    return String(Math.round(value));
}

function buildMetricGhostLabel(metricLabel, scene) {
    const normalizedLabel = String(metricLabel || '').trim();

    if (normalizedLabel) {
        return normalizedLabel;
    }

    return [scene?.navLabel, scene?.titleLines?.[1], scene?.titleLines?.[0]]
        .map((value) => String(value || '').trim())
        .find(Boolean) || 'Scene';
}

function resolveMinimalSceneStats(scene) {
    const numericMetrics = Array.isArray(scene?.metrics)
        ? scene.metrics
            .map((metric) => ({
                ...metric,
                parsedMetric: parseMetricValue(metric?.value),
                ghostLabel: String(metric?.ghostLabel || buildMetricGhostLabel(metric?.label, scene)).trim(),
            }))
            .filter((metric) => metric.parsedMetric.hasNumericValue)
            .slice(0, 2)
        : [];

    if (numericMetrics.length > 0) {
        return numericMetrics;
    }

    const markerMatch = String(scene?.marker || '').match(/^(\d+)/);

    if (!markerMatch) {
        return [];
    }

    return [
        {
            label: scene?.navLabel || 'Scene',
            value: markerMatch[1],
            parsedMetric: parseMetricValue(markerMatch[1]),
            ghostLabel: buildMetricGhostLabel(scene?.navLabel || 'Scene', scene),
        },
    ];
}

function AnimatedMetricValue({ value, delayMs = 0, isPageMotionEnabled, className, style }) {
    const parsedMetric = useMemo(() => parseMetricValue(value), [value]);
    const [displayValue, setDisplayValue] = useState(() => (parsedMetric.hasNumericValue ? 0 : parsedMetric.rawValue));

    useEffect(() => {
        if (!parsedMetric.hasNumericValue) {
            setDisplayValue(parsedMetric.rawValue);
            return undefined;
        }

        if (typeof window === 'undefined') {
            setDisplayValue(parsedMetric.numericValue);
            return undefined;
        }

        let animationFrameId = null;
        let startTimeoutId = null;
        let fallbackTimeoutId = null;
        const pathname = window.location.pathname;

        const stopAnimation = () => {
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            if (startTimeoutId) {
                window.clearTimeout(startTimeoutId);
                startTimeoutId = null;
            }

            if (fallbackTimeoutId) {
                window.clearTimeout(fallbackTimeoutId);
                fallbackTimeoutId = null;
            }
        };

        const startAnimation = () => {
            stopAnimation();
            setDisplayValue(0);

            if (!isPageMotionEnabled) {
                setDisplayValue(parsedMetric.numericValue);
                return;
            }

            const animationDuration = 1500;
            const animationStart = performance.now();

            const tick = (currentTime) => {
                const progress = Math.min((currentTime - animationStart) / animationDuration, 1);
                const easedProgress = 1 - ((1 - progress) ** 2.6);
                const nextValue = progress >= 1
                    ? parsedMetric.numericValue
                    : parsedMetric.numericValue * easedProgress;

                setDisplayValue(nextValue);

                if (progress < 1) {
                    animationFrameId = window.requestAnimationFrame(tick);
                }
            };

            animationFrameId = window.requestAnimationFrame(tick);
        };

        const queueAnimation = () => {
            if (startTimeoutId) {
                window.clearTimeout(startTimeoutId);
            }

            startTimeoutId = window.setTimeout(startAnimation, delayMs);
        };

        const handlePageRevealComplete = (event) => {
            if (event.detail?.pathname !== pathname) {
                return;
            }

            queueAnimation();
        };

        window.addEventListener('lumina:page-reveal-complete', handlePageRevealComplete);

        if (window.__luminaLastRevealPathname === pathname) {
            queueAnimation();
        } else {
            fallbackTimeoutId = window.setTimeout(queueAnimation, 1500 + delayMs);
        }

        return () => {
            stopAnimation();
            window.removeEventListener('lumina:page-reveal-complete', handlePageRevealComplete);
        };
    }, [parsedMetric, delayMs, isPageMotionEnabled]);

    if (!parsedMetric.hasNumericValue) {
        return <span className={className} style={style}>{parsedMetric.rawValue}</span>;
    }

    const prefix = parsedMetric.prefix ? `${parsedMetric.prefix} ` : '';
    const suffix = parsedMetric.suffix ? ` ${parsedMetric.suffix}` : '';

    return (
        <span className={className} style={style}>{`${prefix}${formatAnimatedMetricNumber(displayValue, parsedMetric)}${suffix}`}</span>
    );
}

function MinimalSceneMetricStrip({ scene, isPageMotionEnabled }) {
    const stats = useMemo(() => resolveMinimalSceneStats(scene), [scene]);

    if (!stats.length) {
        return null;
    }

    const metricStripStyle = {
        '--metric-strip-top-mobile': METRIC_LAYOUT.stripTopMobile,
        '--metric-strip-top-desktop': METRIC_LAYOUT.stripTopDesktop,
        '--metric-strip-inset-mobile': METRIC_LAYOUT.stripInsetMobile,
        '--metric-strip-inset-desktop': METRIC_LAYOUT.stripInsetDesktop,
        '--metric-ghost-leading-top-mobile': METRIC_LAYOUT.leadingGhostTopMobile,
        '--metric-ghost-leading-top-desktop': METRIC_LAYOUT.leadingGhostTopDesktop,
        '--metric-ghost-trailing-top-mobile': METRIC_LAYOUT.trailingGhostTopMobile,
        '--metric-ghost-trailing-top-desktop': METRIC_LAYOUT.trailingGhostTopDesktop,
    };

    return (
        <div
            className={`pointer-events-none absolute inset-x-[var(--metric-strip-inset-mobile)] top-[var(--metric-strip-top-mobile)] z-[55] flex items-start gap-6 md:inset-x-[var(--metric-strip-inset-desktop)] md:top-[var(--metric-strip-top-desktop)] ${stats.length > 1 ? 'justify-between' : 'justify-start'}`}
            style={metricStripStyle}
        >
            {stats.map((metric, index) => {
                const isLeadingMetric = index === 0 || stats.length === 1;
                const alignClassName = isLeadingMetric ? 'items-start text-left' : 'items-end text-right';
                const ghostLines = String(metric.ghostLabel || metric.label || '')
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);

                const longestGhostLength = ghostLines.reduce((max, line) => Math.max(max, line.length), 0) || 1;

                return (
                    <div
                        key={`${scene.key}-${metric.label}`}
                        className={`relative flex items-start min-h-[13.5rem] min-w-0 w-[clamp(10.5rem,18vw,16rem)] md:w-[clamp(12rem,19vw,20rem)] [@container] ${isLeadingMetric ? 'justify-start' : 'justify-end'}`}
                    >
                        <div
                            className={`pointer-events-none absolute z-0 flex w-full flex-col -space-y-2 ${isLeadingMetric ? 'left-0 top-[var(--metric-ghost-leading-top-mobile)] items-start text-left md:top-[var(--metric-ghost-leading-top-desktop)]' : 'right-0 top-[var(--metric-ghost-trailing-top-mobile)] items-end text-right md:top-[var(--metric-ghost-trailing-top-desktop)]'}`}
                            aria-hidden="true"
                        >
                            {ghostLines.map((line, lineIndex) => (
                                <span
                                    key={`${metric.label}-${line}`}
                                    className={`block whitespace-nowrap font-sans font-extrabold uppercase leading-[0.82] tracking-[-0.05em] ${lineIndex === 0 ? 'text-[rgba(61,44,28,0.048)]' : 'text-[rgba(61,44,28,0.036)]'}`}
                                    style={{ fontSize: `clamp(1.05rem, ${(64 / longestGhostLength).toFixed(2)}cqi, 2.8rem)` }}
                                >
                                    {line}
                                </span>
                            ))}
                        </div>

                        <div className={`relative z-10 flex w-full flex-col ${alignClassName}`}>
                            <AnimatedMetricValue
                                value={metric.value}
                                delayMs={index * 110}
                                isPageMotionEnabled={isPageMotionEnabled}
                                className="block font-serif font-medium italic leading-[0.72] tracking-[-0.07em] text-[rgba(45,32,22,0.68)] [font-variant-numeric:tabular-nums] [text-shadow:0_12px_30px_rgba(255,255,255,0.42)] [transform:skewX(-4deg)]"
                                style={{ fontSize: METRIC_LAYOUT.numberSize }}
                            />
                            <span className={`mt-2 text-[11px] uppercase tracking-[0.22em] text-black/52 ${isLeadingMetric ? 'translate-x-2 md:translate-x-3' : '-translate-x-2 md:-translate-x-3'}`}>
                                {metric.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function SceneCounter({ activeIndex, total }) {
    return (
        <div className="flex w-[min(88vw,22rem)] items-center justify-center gap-3 self-center rounded-full border border-black/10 bg-white/55 px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-black/56 backdrop-blur-xl md:w-auto md:self-end md:px-4">
            <span>{activeIndex + 1}</span>
            <span className="block h-px flex-1 bg-black/16 md:w-8 md:flex-none"></span>
            <span>{total}</span>
        </div>
    );
}

function SceneAction({ action, onTrigger }) {
    if (!action) {
        return null;
    }

    const className = action.primary
        ? 'inline-flex min-h-14 items-center justify-center rounded-full border border-white/42 bg-[#0c0c0c] px-6 text-[10px] uppercase tracking-[0.28em] text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-colors hover:bg-black'
        : 'inline-flex min-h-14 items-center justify-center rounded-full border border-white/36 bg-white/90 px-6 text-[10px] uppercase tracking-[0.28em] text-black/86 shadow-[0_18px_38px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-colors hover:border-white/54 hover:bg-white hover:text-black';

    if (action.kind === 'link') {
        return (
            <Link href={action.href} className={className} onClick={(event) => event.stopPropagation()}>
                {action.label}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onTrigger(action);
            }}
            className={className}
        >
            {action.label}
        </button>
    );
}

function OrbitalCard({ scene, isActive, isIntro, offset, onSelect, onAction, isPageMotionEnabled, primaryAction, secondaryAction }) {
    const motionStyle = buildCardMotion(offset, isPageMotionEnabled);
    const titleClassName = isActive
        ? 'font-sans text-[clamp(1.98rem,5.247vw,4.8rem)] font-medium uppercase leading-[0.84] tracking-[-0.06em] text-white whitespace-nowrap [text-shadow:0_8px_24px_rgba(0,0,0,0.34)]'
        : 'font-sans text-[clamp(1.35rem,3.1vw,2.2rem)] font-medium uppercase leading-[0.9] tracking-[-0.04em] text-white [overflow-wrap:anywhere] [text-shadow:0_8px_18px_rgba(0,0,0,0.34)]';

    const handleCardKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        onSelect(scene.index);
    };

    return (
        <div
            role={isActive ? undefined : 'button'}
            tabIndex={isActive ? undefined : 0}
            onClick={isActive ? undefined : () => onSelect(scene.index)}
            onKeyDown={isActive ? undefined : handleCardKeyDown}
            className={`absolute left-1/2 top-[60%] w-[min(42rem,82vw)] max-w-[42rem] -translate-x-1/2 -translate-y-1/2 text-left [transform-style:preserve-3d] md:top-1/2 ${isActive ? '' : 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30'}`}
            style={motionStyle}
            aria-pressed={isActive ? undefined : isActive}
        >
            <article className={`relative overflow-hidden rounded-[2rem] border ${isActive ? 'border-white/24 shadow-[0_36px_120px_rgba(0,0,0,0.26)]' : 'border-white/12 shadow-[0_18px_60px_rgba(0,0,0,0.12)]'}`}>
                <div className="absolute inset-0">
                    <img src={scene.image.src} alt={scene.image.alt} className={`h-full w-full object-cover transition-transform duration-700 ${isActive ? 'scale-100' : 'scale-110'}`} />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.34)_0%,rgba(8,8,8,0.22)_24%,rgba(8,8,8,0.46)_64%,rgba(8,8,8,0.78)_100%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(0,0,0,0.38),rgba(0,0,0,0)_34%),linear-gradient(110deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.12)_34%,rgba(0,0,0,0)_60%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_22%,rgba(255,255,255,0.22),rgba(255,255,255,0)_26%),radial-gradient(circle_at_82%_18%,rgba(255,220,198,0.16),rgba(255,220,198,0)_28%)]"></div>
                </div>

                <div className={`relative z-10 flex flex-col justify-between ${isActive ? 'min-h-[min(68vh,36rem)] p-4 sm:min-h-[min(70vh,40rem)] sm:p-5 md:min-h-[min(72vh,46rem)] md:p-8' : 'min-h-[18rem] p-4 md:min-h-[22rem] md:p-5'}`}>
                    <div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className={`text-[10px] uppercase tracking-[0.34em] text-white/68 [text-shadow:0_6px_18px_rgba(0,0,0,0.32)] ${isIntro && isActive ? 'hero-sub' : ''}`}>{scene.eyebrow}</p>
                                <p className={`mt-2 text-[10px] uppercase tracking-[0.34em] [text-shadow:0_6px_18px_rgba(0,0,0,0.32)] ${isActive ? 'text-white/52' : 'text-white/42'}`}>{scene.marker}</p>
                            </div>
                            <span className={`rounded-full border border-white/14 px-3 py-2 text-[10px] uppercase tracking-[0.24em] [text-shadow:0_6px_18px_rgba(0,0,0,0.28)] ${isActive ? 'bg-white/10 text-white/82' : 'bg-black/24 text-white/68'}`}>{scene.navLabel}</span>
                        </div>

                        <div className="mt-5 overflow-hidden">
                            <h2 className={`${titleClassName} ${isIntro && isActive ? 'hero-title' : ''}`}>{scene.titleLines[0]}</h2>
                        </div>
                        <div className="overflow-hidden">
                            <h2 className={`${titleClassName} ${isIntro && isActive ? 'hero-title' : ''} ${isActive ? 'text-white/72' : 'text-white/64'}`}>{scene.titleLines[1]}</h2>
                        </div>

                        <p className={`mt-4 max-w-[36ch] text-[15px] leading-relaxed [text-shadow:0_8px_22px_rgba(0,0,0,0.34)] ${isActive ? 'text-white/88 md:text-[15.5px]' : 'text-white/0'}`}>{isActive ? scene.summary : ''}</p>
                    </div>

                    <div>
                        {isActive ? (
                            <div className="mt-6 flex flex-col gap-3 md:flex-row md:flex-wrap">
                                <SceneAction action={primaryAction} onTrigger={onAction} />
                                <SceneAction action={secondaryAction} onTrigger={onAction} />
                            </div>
                        ) : (
                            <div className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/66 [text-shadow:0_6px_18px_rgba(0,0,0,0.3)]">
                                <span>{scene.kicker}</span>
                                <span>{scene.image.collection}</span>
                            </div>
                        )}
                    </div>
                </div>
            </article>
        </div>
    );
}

export default function CollaborationStageExperience({
    initialValues,
    initialLanguage = DEFAULT_LANGUAGE,
    policyHref,
    stageMedia = [],
    isAuthenticated = false,
}) {
    const { i18n } = useTranslation();
    const viewportRef = useRef(null);
    const lockRef = useRef(false);
    const touchStartRef = useRef(null);
    const wheelDeltaRef = useRef(0);
    const unlockTimerRef = useRef(null);
    const isPageMotionEnabled = usePageMotionState();
    const initialNormalizedLanguage = normalizeLanguage(initialLanguage) || DEFAULT_LANGUAGE;
    const [currentLanguage, setCurrentLanguage] = useState(initialNormalizedLanguage);

    useEffect(() => {
        const resolvedLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language) || initialNormalizedLanguage;

        setCurrentLanguage((previousLanguage) => (previousLanguage === resolvedLanguage ? previousLanguage : resolvedLanguage));
    }, [i18n.resolvedLanguage, i18n.language, initialNormalizedLanguage]);

    const localize = (englishValue, bulgarianValue) => getCreatorProgramText(currentLanguage, englishValue, bulgarianValue);
    const [activeSceneIndex, setActiveSceneIndex] = useState(0);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

    const sceneMedia = useMemo(() => {
        const validMedia = Array.isArray(stageMedia) ? stageMedia.filter((item) => item?.src) : [];

        if (!validMedia.length) {
            return [];
        }

        const expanded = [...validMedia];

        while (expanded.length < 5) {
            expanded.push(validMedia[expanded.length % validMedia.length]);
        }

        return expanded.slice(0, 5);
    }, [stageMedia]);

    const scenes = useMemo(() => {
        if (!sceneMedia.length) {
            return [];
        }

        return [
            {
                key: 'intro',
                navLabel: localize('Entry', 'Вход'),
                eyebrow: `${CREATOR_PROGRAM_BRAND_NAME} / ${localize('Collaboration', 'Партньорска')}`,
                marker: '01 / Orbit',
                titleLines: [localize('Collaboration', 'Партньорска'), localize('Program', 'Програма')],
                kicker: localize('A clear overview in five scenes.', 'Ясен преглед в пет сцени.'),
                summary: localize(
                    'This page gives a quick editorial overview of the partnership: fit, value, standards, and the final application path.',
                    'Тази страница дава бърз редакционен преглед на партньорството: fit, стойност, стандарти и финалния път за кандидатстване.'
                ),
                metrics: [
                    { label: localize('Visible scenes', 'Видими сцени'), value: '5', ghostLabel: localize('Scenes', 'Сцени') },
                    { label: localize('Interaction', 'Интеракция'), value: localize('Left / Right', 'Ляво / Дясно') },
                    { label: localize('Focus', 'Фокус'), value: localize('Center Card', 'Централна карта') },
                ],
                primaryAction: { kind: 'scene', target: 1, label: localize('See the value', 'Виж стойността'), primary: true },
                secondaryAction: { kind: 'scene', target: 4, label: localize('Jump to apply', 'Към кандидатстване') },
                image: sceneMedia[0],
            },
            {
                key: 'pricing',
                navLabel: localize('Value', 'Стойност'),
                eyebrow: localize('Creator offer / direct', 'Creator offer / директно'),
                marker: '02 / Offer',
                titleLines: [localize('Creator', 'Creator'), localize('Pricing', 'Pricing')],
                kicker: localize('Access begins with approved fit.', 'Достъпът започва след одобрен fit.'),
                summary: localize(
                    'Approved creators receive 70% creator pricing to style and present the pieces at a premium standard. After full delivery and review, up to the remaining 30% may be refunded.',
                    'Одобрените creators получават 70% creator pricing, за да представят моделите на premium ниво. След пълно изпълнение и преглед, до оставащите 30% могат да бъдат възстановени.'
                ),
                metrics: [
                    { label: localize('Approved creator pricing', 'Преференциална цена'), value: CREATOR_PROGRAM_BENEFITS[0].value, ghostLabel: localize('Pricing', 'Цена') },
                    { label: localize('Refund upside', 'Възстановяване'), value: CREATOR_PROGRAM_BENEFITS[1].value, ghostLabel: localize('Upside', 'Бонус') },
                    { label: localize('Decision model', 'Модел на одобрение'), value: localize('Manual', 'Ръчен') },
                ],
                primaryAction: { kind: 'scene', target: 2, label: localize('See the upside', 'Виж upside'), primary: true },
                secondaryAction: { kind: 'scene', target: 4, label: localize('Go to apply', 'Към кандидатстване') },
                image: sceneMedia[1],
            },
            {
                key: 'upside',
                navLabel: localize('Upside', 'Upside'),
                eyebrow: localize('Affiliate layer / audience', 'Affiliate слой / аудитория'),
                marker: '03 / Signal',
                titleLines: [localize('Affiliate', 'Affiliate'), localize('Return', 'Return')],
                kicker: localize('Performance creates long-term upside.', 'Силното изпълнение носи дългосрочен upside.'),
                summary: localize(
                    'Each approved creator unlocks a personal affiliate code with 7% commission. Your audience receives 5% off, and eligible store discounts can still stack.',
                    'Всеки одобрен creator получава личен affiliate код със 7% комисиона. Аудиторията получава 5% отстъпка, а допустимите store отстъпки могат да се комбинират.'
                ),
                metrics: [
                    { label: localize('Affiliate commission', 'Affiliate комисиона'), value: CREATOR_PROGRAM_BENEFITS[2].value, ghostLabel: localize('Commission', 'Комисиона') },
                    { label: localize('Audience discount', 'Отстъпка за аудиторията'), value: CREATOR_PROGRAM_BENEFITS[3].value, ghostLabel: localize('Discount', 'Отстъпка') },
                    { label: localize('Long-term path', 'Дългосрочно'), value: CREATOR_PROGRAM_BENEFITS[4].value },
                ],
                primaryAction: { kind: 'scene', target: 3, label: localize('See the rules', 'Виж правилата'), primary: true },
                secondaryAction: { kind: 'scene', target: 0, label: localize('Back to entry', 'Назад към входа') },
                image: sceneMedia[2],
            },
            {
                key: 'rules',
                navLabel: localize('Rules', 'Правила'),
                eyebrow: localize('Execution / visible', 'Изпълнение / видимо'),
                marker: '04 / Rules',
                titleLines: [localize('Clear', 'Ясни'), localize('Rules', 'Правила')],
                kicker: localize('Clear standards. No guesswork.', 'Ясни стандарти. Без догадки.'),
                summary: localize(
                    'One premium video within seven days, strong lighting, clean styling, no watermarks, brand tagging, raw footage delivery, three linked stories, and #thevastore.',
                    'Едно premium видео до седем дни, силна светлина, clean styling, без watermarks, тагване на бранда, предаване на raw файлове, три stories с линк и #thevastore.'
                ),
                metrics: [
                    { label: localize('Delivery window', 'Срок'), value: '7', ghostLabel: localize('Window', 'Срок') },
                    { label: localize('Core post', 'Основен пост'), value: '1' },
                    { label: localize('House hashtag', 'Официален хаштаг'), value: CREATOR_PROGRAM_HASHTAG },
                ],
                primaryAction: { kind: 'scene', target: 4, label: localize('Open final action', 'Към финалното действие'), primary: true },
                secondaryAction: { kind: 'link', href: policyHref, label: localize('Read policy', 'Прочети политиката') },
                image: sceneMedia[3],
            },
            {
                key: 'apply',
                navLabel: localize('Apply', 'Кандидатстване'),
                eyebrow: localize('Final action / now', 'Финално действие / сега'),
                marker: '05 / Apply',
                titleLines: [localize('Apply', 'Кандидатствай'), localize('Now', 'Сега')],
                kicker: localize('Apply only if your work is already elevated.', 'Кандидатствай само ако работата ти вече е на високо ниво.'),
                summary: localize(
                    'If your visual language already feels refined and brand-ready, submit your application now. The full collaboration policy sits next to the form.',
                    'Ако визуалният ти език вече е изчистен и готов за бранд среда, изпрати кандидатурата си сега. Пълната политика за партньорство е до формата.'
                ),
                metrics: [
                    { label: localize('Main deliverable', 'Основен deliverable'), value: localize('Premium Video', 'Premium Видео') },
                    { label: localize('Review', 'Преглед'), value: localize('Manual', 'Ръчен') },
                    { label: localize('Agreement', 'Споразумение'), value: localize('PDF', 'PDF') },
                ],
                primaryAction: { kind: 'modal', label: localize('Open application', 'Отвори кандидатурата'), primary: true },
                secondaryAction: { kind: 'link', href: policyHref, label: localize('Collaboration policy', 'Политика за партньорство') },
                image: sceneMedia[4],
            },
        ].map((scene, index) => ({ ...scene, index }));
    }, [localize, policyHref, sceneMedia]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return undefined;
        }

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
        const previousBodyOverscroll = document.body.style.overscrollBehavior;

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        document.body.style.overscrollBehavior = 'none';

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
            document.body.style.overscrollBehavior = previousBodyOverscroll;

            if (unlockTimerRef.current) {
                window.clearTimeout(unlockTimerRef.current);
            }
        };
    }, []);

    const sceneCount = scenes.length;

    const moveBy = (delta) => {
        if (!sceneCount || lockRef.current) {
            return;
        }

        lockRef.current = true;
        wheelDeltaRef.current = 0;
        setActiveSceneIndex((currentIndex) => wrapIndex(currentIndex + delta, sceneCount));

        if (unlockTimerRef.current) {
            window.clearTimeout(unlockTimerRef.current);
        }

        unlockTimerRef.current = window.setTimeout(() => {
            lockRef.current = false;
        }, isPageMotionEnabled ? 620 : 80);
    };

    const jumpTo = (index) => {
        if (!sceneCount || index === activeSceneIndex) {
            return;
        }

        if (lockRef.current) {
            return;
        }

        lockRef.current = true;
        setActiveSceneIndex(wrapIndex(index, sceneCount));

        if (unlockTimerRef.current) {
            window.clearTimeout(unlockTimerRef.current);
        }

        unlockTimerRef.current = window.setTimeout(() => {
            lockRef.current = false;
        }, isPageMotionEnabled ? 560 : 80);
    };

    useEffect(() => {
        const viewport = viewportRef.current;

        if (!viewport || !sceneCount) {
            return undefined;
        }

        const handleWheel = (event) => {
            if (isFormOpen) {
                return;
            }

            event.preventDefault();

            const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            wheelDeltaRef.current += dominantDelta;

            if (lockRef.current || Math.abs(wheelDeltaRef.current) < 36) {
                return;
            }

            moveBy(wheelDeltaRef.current > 0 ? 1 : -1);
        };

        const handleTouchStart = (event) => {
            touchStartRef.current = event.touches[0]?.clientX ?? null;
        };

        const handleTouchMove = (event) => {
            if (touchStartRef.current == null || lockRef.current || isFormOpen) {
                return;
            }

            const currentX = event.touches[0]?.clientX ?? touchStartRef.current;
            const deltaX = touchStartRef.current - currentX;

            if (Math.abs(deltaX) < 46) {
                return;
            }

            moveBy(deltaX > 0 ? 1 : -1);
            touchStartRef.current = null;
        };

        const handleTouchEnd = () => {
            touchStartRef.current = null;
        };

        const handleKeyDown = (event) => {
            if (isFormOpen) {
                if (event.key === 'Escape') {
                    setIsFormOpen(false);
                }

                return;
            }

            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                moveBy(1);
            }

            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                moveBy(-1);
            }
        };

        viewport.addEventListener('wheel', handleWheel, { passive: false });
        viewport.addEventListener('touchstart', handleTouchStart, { passive: true });
        viewport.addEventListener('touchmove', handleTouchMove, { passive: true });
        viewport.addEventListener('touchend', handleTouchEnd, { passive: true });
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            viewport.removeEventListener('wheel', handleWheel);
            viewport.removeEventListener('touchstart', handleTouchStart);
            viewport.removeEventListener('touchmove', handleTouchMove);
            viewport.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [sceneCount, isFormOpen, isPageMotionEnabled]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const root = document.documentElement;

        if (isFormOpen) {
            root.setAttribute('data-collaboration-form', 'open');
        } else {
            root.removeAttribute('data-collaboration-form');
        }

        return () => {
            root.removeAttribute('data-collaboration-form');
        };
    }, [isFormOpen]);

    const handleActionTrigger = (action) => {
        if (!action) {
            return;
        }

        if (action.kind === 'scene') {
            jumpTo(action.target);
            return;
        }

        if (action.kind === 'modal') {
            if (!isAuthenticated) {
                setIsAuthPromptOpen(true);
                return;
            }

            setIsFormOpen(true);
        }
    };

    if (!sceneCount) {
        return null;
    }

    const activeScene = scenes[activeSceneIndex];
    const applyNowAction = {
        kind: 'modal',
        label: localize('Apply now', 'Кандидатствай сега'),
        primary: true,
    };
    const viewPolicyAction = {
        kind: 'link',
        href: policyHref,
        label: localize('View policy', 'Виж политиката'),
    };

    return (
        <>
            <div
                ref={viewportRef}
                className="hero-img relative h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_14%_10%,rgba(255,255,255,0.5),transparent_22%),radial-gradient(circle_at_82%_16%,rgba(246,212,187,0.22),transparent_24%),linear-gradient(180deg,rgba(245,240,234,0.98),rgba(236,230,223,0.96)_46%,rgba(229,223,215,0.98)_100%)]"
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_42%),conic-gradient(from_180deg_at_50%_50%,rgba(0,0,0,0.02),rgba(0,0,0,0),rgba(0,0,0,0.02))]"></div>

                <MinimalSceneMetricStrip scene={activeScene} isPageMotionEnabled={isPageMotionEnabled} />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative h-[72vmin] w-[72vmin] max-h-[48rem] max-w-[48rem] rounded-full border border-black/10"></div>
                    <div className="absolute h-[54vmin] w-[54vmin] max-h-[36rem] max-w-[36rem] rounded-full border border-black/6"></div>
                    <div className="absolute h-5 w-5 rounded-full border border-black/18 bg-white/70 shadow-[0_0_28px_rgba(255,255,255,0.8)]"></div>
                </div>

                <div className="absolute top-[60%] left-1/2 [perspective:4400px] [transform-style:preserve-3d]">
                    {scenes.map((scene, index) => {
                        const offset = resolveOffset(index, activeSceneIndex, sceneCount);
                        const isActive = offset === 0;

                        return (
                            <OrbitalCard
                                key={scene.key}
                                scene={scene}
                                isActive={isActive}
                                isIntro={scene.key === 'intro'}
                                offset={offset}
                                onSelect={jumpTo}
                                onAction={handleActionTrigger}
                                isPageMotionEnabled={isPageMotionEnabled}
                                primaryAction={applyNowAction}
                                secondaryAction={viewPolicyAction}
                            />
                        );
                    })}
                </div>

                <div className="route-reveal absolute inset-x-4 bottom-5 z-[15] hidden md:inset-x-10 md:flex md:flex-row md:items-end md:justify-between">
                    <div className="hidden md:flex md:flex-wrap md:gap-2">
                        {scenes.map((scene, index) => {
                            const isActive = index === activeSceneIndex;

                            return (
                                <button
                                    key={scene.key}
                                    type="button"
                                    onClick={() => jumpTo(index)}
                                    className={`rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.22em] backdrop-blur-xl transition-colors ${isActive ? 'border-black/16 bg-white/84 text-black/88' : 'border-black/10 bg-white/44 text-black/54 hover:border-black/22 hover:text-black/82'}`}
                                >
                                    {scene.navLabel}
                                </button>
                            );
                        })}
                    </div>

                    <SceneCounter activeIndex={activeSceneIndex} total={sceneCount} />
                </div>
            </div>

            {isFormOpen ? (
                <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-[rgba(12,12,12,0.58)] px-4 py-4 backdrop-blur-md md:py-6" onClick={() => setIsFormOpen(false)}>
                    <div
                        className="relative max-h-[95dvh] w-full max-w-[980px] overflow-hidden rounded-[2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(247,243,238,0.96)_0%,rgba(239,234,227,0.98)_100%)] shadow-[0_40px_140px_rgba(0,0,0,0.28)]"
                        onClick={(event) => event.stopPropagation()}
                        onWheel={(event) => event.stopPropagation()}
                        onTouchMove={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-black/8 px-5 py-4 md:px-6">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.34em] text-black/40">{CREATOR_PROGRAM_BRAND_NAME}</p>
                                <p className="mt-2 font-sans text-sm uppercase tracking-[0.18em] text-black/70">{localize('Apply for THE VA STORE Partnership', 'Кандидатствай за партньорство с THE VA STORE')}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link href={policyHref} className="hidden rounded-full border border-black/12 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-black/60 transition-colors hover:border-black/26 hover:text-black/84 md:inline-flex">
                                    {localize('Policy', 'Политика')}
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/12 bg-white/70 text-lg text-black/62 transition-colors hover:border-black/24 hover:text-black/88"
                                    aria-label={localize('Close application', 'Затвори кандидатурата')}
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[calc(95dvh-7.25rem)] overflow-y-auto overscroll-contain p-4 md:max-h-[calc(95dvh-8rem)] md:p-6">
                            <CreatorProgramForm initialValues={initialValues} initialLanguage={currentLanguage} compact />
                        </div>
                    </div>
                </div>
            ) : null}

            {isAuthPromptOpen ? (
                <div className="fixed inset-0 z-[170] flex items-center justify-center overflow-y-auto bg-[rgba(10,10,10,0.62)] px-4 py-4 backdrop-blur-md md:py-6" onClick={() => setIsAuthPromptOpen(false)}>
                    <div className="w-full max-w-[34rem] rounded-[1.9rem] border border-white/12 bg-[linear-gradient(180deg,rgba(247,243,238,0.97)_0%,rgba(238,231,222,0.98)_100%)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.3)] md:p-7" onClick={(event) => event.stopPropagation()}>
                        <p className="text-[10px] uppercase tracking-[0.32em] text-black/46">{CREATOR_PROGRAM_BRAND_NAME}</p>
                        <h3 className="mt-4 font-serif text-[2rem] font-light uppercase tracking-[0.08em] leading-tight text-black/82 md:text-[2.4rem]">
                            {localize('Create Account To Apply', 'Създай профил, за да кандидатстваш')}
                        </h3>
                        <p className="mt-4 text-sm leading-relaxed text-black/66">
                            {localize(
                                'Applications are linked to a verified website account. Register or sign in first, then return here to submit your collaboration details.',
                                'Кандидатурите се свързват с потвърден профил в сайта. Първо влезте или се регистрирайте, след това се върнете тук, за да изпратите детайлите си.'
                            )}
                        </p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link href="/account" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-black px-5 text-[10px] uppercase tracking-[0.24em] text-[#F7F1EA] transition-opacity hover:opacity-90">
                                {localize('Register Or Sign In', 'Регистрация или вход')}
                            </Link>
                            <button
                                type="button"
                                onClick={() => setIsAuthPromptOpen(false)}
                                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-black/14 bg-white/72 px-5 text-[10px] uppercase tracking-[0.24em] text-black/66 transition-colors hover:border-black/24 hover:text-black/86"
                            >
                                {localize('Stay On This Page', 'Остани на тази страница')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}