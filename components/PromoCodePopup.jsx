"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { PAGE_REVEAL_COMPLETE_EVENT } from '../utils/page-motion';
import { formatPromotionCurrency, normalizePromotionCode } from '../utils/promotions';

const FEATURED_PROMO_CODE_KEY = 'promo_popup.featured_code';
const SESSION_DISMISS_KEY = 'lumina-featured-promo-dismissed-code';
const SESSION_PRESENTED_KEY = 'lumina-featured-promo-presented';
const SESSION_PAGE_COUNT_KEY = 'lumina-featured-promo-page-count';
const SESSION_LAST_PATH_KEY = 'lumina-featured-promo-last-path';
const VISITOR_DWELL_DELAY_MS = 10000;
const VISITOR_PAGE_VIEW_THRESHOLD = 2;

function parseStoredPageCount(value) {
    const parsedValue = Number.parseInt(String(value || ''), 10);

    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
        return 0;
    }

    return parsedValue;
}

function formatDeadline(value) {
    if (!value) {
        return 'Open schedule';
    }

    const parsedValue = new Date(value);

    if (Number.isNaN(parsedValue.getTime())) {
        return 'Open schedule';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(parsedValue);
}

function buildCountdown(endAt, nowTimestamp = Date.now()) {
    if (!endAt) {
        return {
            hasDeadline: false,
            isExpired: false,
            segments: [],
            compactLabel: 'Open schedule',
        };
    }

    const targetTimestamp = new Date(endAt).getTime();

    if (!Number.isFinite(targetTimestamp)) {
        return {
            hasDeadline: false,
            isExpired: false,
            segments: [],
            compactLabel: 'Open schedule',
        };
    }

    const remainingMs = Math.max(targetTimestamp - nowTimestamp, 0);
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        hasDeadline: true,
        isExpired: remainingMs <= 0,
        segments: [
            { label: 'Days', value: String(days).padStart(2, '0') },
            { label: 'Hours', value: String(hours).padStart(2, '0') },
            { label: 'Minutes', value: String(minutes).padStart(2, '0') },
            { label: 'Seconds', value: String(seconds).padStart(2, '0') },
        ],
        compactLabel: remainingMs <= 0
            ? 'Closed'
            : `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`,
    };
}

function copyInputValue(input) {
    if (!input || typeof document === 'undefined') {
        return false;
    }

    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);

    try {
        return document.execCommand('copy');
    } catch {
        return false;
    }
}

function copyTextValue(value) {
    if (!value || typeof document === 'undefined') {
        return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.transform = 'translateY(-200%)';

    document.body.appendChild(textarea);

    try {
        textarea.focus({ preventScroll: true });
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
}

async function copyPromoCodeValue(value, input) {
    if (!value) {
        return false;
    }

    if (typeof window !== 'undefined' && window.isSecureContext && navigator?.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            // Fall through to legacy clipboard strategies.
        }
    }

    if (copyTextValue(value)) {
        return true;
    }

    return copyInputValue(input);
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <path d="M6 6l12 12"></path>
            <path d="M18 6 6 18"></path>
        </svg>
    );
}

export default function PromoCodePopup({ pathname = '/', onOpenChange }) {
    const siteCopy = useSiteCopy();
    const isAdmin = Boolean(siteCopy?.isAdmin);
    const isAdminEditing = Boolean(siteCopy?.isAdmin && siteCopy?.isEditMode);
    const canManagePromoCode = isAdmin;
    const configuredCode = normalizePromotionCode(siteCopy?.resolveText?.(FEATURED_PROMO_CODE_KEY, '') || '');
    const [savedCode, setSavedCode] = useState(configuredCode);
    const [codeDraft, setCodeDraft] = useState(configuredCode);
    const [isCodeDirty, setIsCodeDirty] = useState(false);
    const [isSavingCode, setIsSavingCode] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState({ type: 'idle', message: '' });
    const [copyFeedback, setCopyFeedback] = useState('idle');
    const [promoState, setPromoState] = useState({ status: 'idle', data: null, error: '' });
    const [isRevealReady, setIsRevealReady] = useState(false);
    const [pageViewCount, setPageViewCount] = useState(0);
    const [hasDwellTriggerElapsed, setHasDwellTriggerElapsed] = useState(false);
    const [isSessionDismissed, setIsSessionDismissed] = useState(false);
    const [isSessionPresented, setIsSessionPresented] = useState(false);
    const [isLocallyDismissed, setIsLocallyDismissed] = useState(false);
    const [hasVisitorPresentationLock, setHasVisitorPresentationLock] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
    const codeInputRef = useRef(null);
    const lastTrackedPathRef = useRef('');
    const copyFeedbackTimeoutRef = useRef(null);

    useEffect(() => {
        setSavedCode(configuredCode);

        if (!isCodeDirty) {
            setCodeDraft(configuredCode);
        }
    }, [configuredCode, isCodeDirty]);

    useEffect(() => {
        setIsLocallyDismissed(false);
        setHasVisitorPresentationLock(false);
    }, [pathname, isAdminEditing, savedCode]);

    useEffect(() => {
        setHasDwellTriggerElapsed(false);
    }, [pathname]);

    useEffect(() => {
        if (typeof window === 'undefined' || !savedCode) {
            setIsSessionDismissed(false);
            return;
        }

        try {
            setIsSessionDismissed(window.sessionStorage.getItem(SESSION_DISMISS_KEY) === savedCode);
        } catch {
            setIsSessionDismissed(false);
        }
    }, [savedCode]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsSessionPresented(false);
            return;
        }

        try {
            setIsSessionPresented(window.sessionStorage.getItem(SESSION_PRESENTED_KEY) === '1');
        } catch {
            setIsSessionPresented(false);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        setIsRevealReady(window.__luminaLastRevealPathname === pathname);

        const handleReveal = (event) => {
            if (event?.detail?.pathname === pathname) {
                setIsRevealReady(true);
            }
        };

        window.addEventListener(PAGE_REVEAL_COMPLETE_EVENT, handleReveal);

        return () => window.removeEventListener(PAGE_REVEAL_COMPLETE_EVENT, handleReveal);
    }, [pathname]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const storedCount = parseStoredPageCount(window.sessionStorage.getItem(SESSION_PAGE_COUNT_KEY));
            const storedPath = window.sessionStorage.getItem(SESSION_LAST_PATH_KEY) || '';

            if (storedPath === pathname) {
                const stableCount = storedCount > 0 ? storedCount : 1;

                if (storedCount <= 0) {
                    window.sessionStorage.setItem(SESSION_PAGE_COUNT_KEY, String(stableCount));
                    window.sessionStorage.setItem(SESSION_LAST_PATH_KEY, pathname);
                }

                setPageViewCount(stableCount);
            } else {
                const nextCount = Math.max(storedCount, 0) + 1;

                window.sessionStorage.setItem(SESSION_PAGE_COUNT_KEY, String(nextCount));
                window.sessionStorage.setItem(SESSION_LAST_PATH_KEY, pathname);
                setPageViewCount(nextCount);
            }

            lastTrackedPathRef.current = pathname;
        } catch {
            if (lastTrackedPathRef.current === pathname) {
                setPageViewCount((currentValue) => (currentValue > 0 ? currentValue : 1));
                return;
            }

            lastTrackedPathRef.current = pathname;
            setPageViewCount((currentValue) => currentValue + 1);
        }
    }, [pathname]);

    useEffect(() => {
        let isActive = true;
        const abortController = new AbortController();

        if (!savedCode) {
            setPromoState({ status: 'idle', data: null, error: '' });
            return () => abortController.abort();
        }

        setPromoState((currentState) => ({
            ...currentState,
            status: 'loading',
            error: '',
        }));

        fetch(`/api/promotions/featured?code=${encodeURIComponent(savedCode)}`, {
            cache: 'no-store',
            signal: abortController.signal,
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(payload.error || 'Unable to load featured promo details.');
                }

                return payload;
            })
            .then((payload) => {
                if (!isActive) {
                    return;
                }

                setPromoState({
                    status: 'resolved',
                    data: payload.promo || null,
                    error: '',
                });
            })
            .catch((error) => {
                if (!isActive || abortController.signal.aborted) {
                    return;
                }

                setPromoState({
                    status: 'error',
                    data: null,
                    error: error.message || 'Unable to load featured promo details.',
                });
            });

        return () => {
            isActive = false;
            abortController.abort();
        };
    }, [savedCode]);

    useEffect(() => {
        if (!promoState.data?.endsAt || !isMounted) {
            return undefined;
        }

        setNowTimestamp(Date.now());

        const intervalId = window.setInterval(() => {
            setNowTimestamp(Date.now());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [isMounted, promoState.data?.endsAt]);

    useEffect(() => {
        if (typeof window === 'undefined' || !isRevealReady || isAdminEditing) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setHasDwellTriggerElapsed(true);
        }, VISITOR_DWELL_DELAY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [isAdminEditing, isRevealReady, pathname]);

    useEffect(() => {
        let openTimeoutId;
        let closeTimeoutId;
        const isVisitorTriggerReady = hasDwellTriggerElapsed || pageViewCount >= VISITOR_PAGE_VIEW_THRESHOLD;
        const shouldShowAdminManager = isAdmin && (!savedCode || !promoState.data || isAdminEditing);
        const shouldAutoPresentVisitor = Boolean(savedCode)
            && Boolean(promoState.data)
            && !isSessionDismissed
            && !isSessionPresented
            && isVisitorTriggerReady;
        const shouldKeepVisitorPopupOpen = hasVisitorPresentationLock
            && !isAdmin
            && Boolean(savedCode)
            && Boolean(promoState.data);
        const shouldPresent = isRevealReady
            && !isLocallyDismissed
            && (shouldShowAdminManager || shouldAutoPresentVisitor || shouldKeepVisitorPopupOpen);

        if (shouldAutoPresentVisitor && !hasVisitorPresentationLock) {
            setHasVisitorPresentationLock(true);

            if (typeof window !== 'undefined') {
                try {
                    window.sessionStorage.setItem(SESSION_PRESENTED_KEY, '1');
                } catch {
                    // Ignore storage errors and still keep the current render cycle open.
                }
            }

            setIsSessionPresented(true);
        }

        if (shouldPresent) {
            setIsMounted(true);
            openTimeoutId = window.setTimeout(() => {
                setIsOpen(true);
            }, 40);
        } else {
            setIsOpen(false);
            closeTimeoutId = window.setTimeout(() => {
                setIsMounted(false);
            }, 260);
        }

        return () => {
            window.clearTimeout(openTimeoutId);
            window.clearTimeout(closeTimeoutId);
        };
    }, [hasDwellTriggerElapsed, hasVisitorPresentationLock, isAdmin, isAdminEditing, isLocallyDismissed, isRevealReady, isSessionDismissed, isSessionPresented, pageViewCount, pathname, promoState.data, savedCode]);

    useEffect(() => {
        onOpenChange?.(Boolean(isMounted && isOpen));
    }, [isMounted, isOpen, onOpenChange]);

    useEffect(() => {
        return () => {
            if (copyFeedbackTimeoutRef.current) {
                window.clearTimeout(copyFeedbackTimeoutRef.current);
            }
        };
    }, []);

    const promo = promoState.data;
    const countdown = useMemo(() => buildCountdown(promo?.endsAt, nowTimestamp), [nowTimestamp, promo?.endsAt]);
    const hasMinimumSubtotal = Number(promo?.minimumSubtotal ?? 0) > 0;
    const infoGridClassName = hasMinimumSubtotal ? 'grid-cols-1 min-[430px]:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 min-[430px]:grid-cols-2 xl:grid-cols-2';

    const handleDismiss = () => {
        setIsLocallyDismissed(true);
        setHasVisitorPresentationLock(false);

        if (!isAdmin && savedCode && typeof window !== 'undefined') {
            try {
                window.sessionStorage.setItem(SESSION_DISMISS_KEY, savedCode);
            } catch {
                // Ignore storage errors and still dismiss for this render cycle.
            }

            setIsSessionDismissed(true);
        }
    };

    const handleCopyCode = async () => {
        if (!savedCode) {
            return;
        }

        try {
            const didCopy = await copyPromoCodeValue(savedCode, codeInputRef.current);

            if (!didCopy) {
                throw new Error('Clipboard is unavailable.');
            }

            setCopyFeedback('success');
        } catch {
            setCopyFeedback('error');
        }

        if (typeof window !== 'undefined') {
            if (copyFeedbackTimeoutRef.current) {
                window.clearTimeout(copyFeedbackTimeoutRef.current);
            }

            copyFeedbackTimeoutRef.current = window.setTimeout(() => {
                setCopyFeedback('idle');
            }, 1000);
        }
    };

    const saveFeaturedCode = async () => {
        if (!canManagePromoCode || isSavingCode) {
            return;
        }

        const normalizedCode = normalizePromotionCode(codeDraft);

        setIsSavingCode(true);
        setSaveFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/admin/site-copy', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    key: FEATURED_PROMO_CODE_KEY,
                    value: normalizedCode,
                }),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.error || 'Unable to save the featured promo code.');
            }

            setSavedCode(normalizedCode);
            setCodeDraft(normalizedCode);
            setIsCodeDirty(false);
            setSaveFeedback({
                type: 'success',
                message: normalizedCode ? 'Featured promo code updated.' : 'Featured promo popup disabled for visitors.',
            });
        } catch (error) {
            setSaveFeedback({
                type: 'error',
                message: error.message || 'Unable to save the featured promo code.',
            });
        } finally {
            setIsSavingCode(false);
        }
    };

    if (!isMounted) {
        return null;
    }

    return (
        <div className={`fixed inset-0 z-[245] flex items-start justify-center overflow-y-auto p-2 sm:items-center sm:p-4 md:p-8 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(237,212,180,0.18),transparent_36%),linear-gradient(180deg,rgba(8,8,10,0.22),rgba(8,8,10,0.72))] backdrop-blur-[10px]" onClick={handleDismiss}></div>

            <section
                data-lenis-prevent-wheel
                aria-label="Featured promotion"
                className={`relative my-2 w-full max-w-[64rem] overflow-hidden rounded-[1.5rem] border border-[#F3E5D5]/14 bg-[linear-gradient(135deg,rgba(14,14,18,0.96),rgba(28,24,22,0.95)_52%,rgba(104,78,49,0.92))] text-[#F7EFE6] shadow-[0_36px_120px_rgba(0,0,0,0.42)] transition-all duration-500 sm:my-0 sm:rounded-[1.9rem] ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-6 scale-[0.985]'} max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-1.5rem)] overflow-y-auto`}
            >
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-16 top-10 h-44 w-44 rounded-full bg-[#E6C39A]/18 blur-3xl"></div>
                    <div className="absolute right-[-4rem] top-[-2rem] h-48 w-48 rounded-full bg-[#F7EEE2]/10 blur-3xl"></div>
                    <div className="absolute bottom-[-4rem] left-[40%] h-52 w-52 rounded-full bg-[#C89A5C]/14 blur-3xl"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(125deg,transparent_0%,transparent_48%,rgba(255,255,255,0.05)_50%,transparent_52%,transparent_100%)] opacity-60"></div>
                </div>

                <div className="relative grid gap-0 xl:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="border-b border-white/10 p-4 pb-5 sm:p-6 md:p-8 xl:border-b-0 xl:border-r xl:border-white/10 xl:p-10">
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.34em] text-[#F5D5B4]/72">
                                    <EditableText contentKey="promo_popup.eyebrow" fallback="Private atelier offer" editorLabel="Promo popup eyebrow" />
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.24em] text-[#F7EFE6]/64 sm:mt-4">
                                    {promo?.label && <span className="rounded-full border border-white/12 bg-white/5 px-3 py-2">{promo.label}</span>}
                                    {promo?.discountSummary && <span className="rounded-full border border-[#F5D5B4]/20 bg-[#F5D5B4]/10 px-3 py-2 text-[#F5D5B4]">{promo.discountSummary}</span>}
                                    {promo?.minimumSubtotal > 0 && <span className="rounded-full border border-white/12 bg-white/5 px-3 py-2">Min {promo.minimumSubtotalDisplay}</span>}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="hover-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/72 transition-colors hover:bg-white/12 hover:text-white sm:h-11 sm:w-11"
                                aria-label="Dismiss promotion"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="mt-5 max-w-[35rem] sm:mt-10">
                            <h2 className="font-serif text-[1.78rem] font-light uppercase leading-[0.95] tracking-[0.08em] text-[#FFF7F0] min-[420px]:text-[2.05rem] sm:text-[3.4rem] md:text-[4.5rem]">
                                <EditableText contentKey="promo_popup.headline" fallback="A measured welcome, with a code worth keeping." editorLabel="Promo popup headline" />
                            </h2>
                            <p className="mt-2.5 max-w-[31rem] text-[12px] leading-relaxed text-[#F7EFE6]/76 sm:mt-4 sm:text-sm md:mt-5 md:text-[15px]">
                                <EditableText contentKey="promo_popup.body" fallback="Claim the featured studio code at checkout while the window is still open. The popup stays elegant, but the value is immediate." editorLabel="Promo popup body" />
                            </p>
                            <p className="mt-2.5 max-w-[32rem] text-[11px] leading-relaxed text-[#F7EFE6]/60 sm:mt-4 sm:text-sm">
                                <EditableText contentKey="promo_popup.checkout_note" fallback="Paste the code exactly as shown at checkout. If a minimum subtotal applies, the discount resolves automatically once the cart qualifies." editorLabel="Promo popup checkout note" />
                            </p>
                        </div>

                        <div className="mt-4 rounded-[1.25rem] border border-white/12 bg-[rgba(255,255,255,0.05)] p-3 sm:mt-6 sm:rounded-[1.5rem] sm:p-5">
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                <input
                                    ref={codeInputRef}
                                    type="text"
                                    value={codeDraft}
                                    readOnly={!canManagePromoCode}
                                    onChange={(event) => {
                                        const nextCode = normalizePromotionCode(event.target.value);
                                        setCodeDraft(nextCode);
                                        setIsCodeDirty(nextCode !== savedCode);
                                        setSaveFeedback({ type: 'idle', message: '' });
                                    }}
                                    onFocus={(event) => {
                                        if (!canManagePromoCode) {
                                            event.target.select();
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (canManagePromoCode && event.key === 'Enter') {
                                            event.preventDefault();
                                            saveFeaturedCode();
                                        }
                                    }}
                                    placeholder="PROMO"
                                    className={`h-11 rounded-[1rem] border px-4 text-sm uppercase tracking-[0.24em] outline-none transition-colors sm:h-16 sm:rounded-[1.15rem] sm:px-5 sm:text-lg sm:tracking-[0.34em] ${canManagePromoCode ? 'border-[#F5D5B4]/28 bg-[rgba(255,247,240,0.08)] text-[#FFF7F0] focus:border-[#F5D5B4]/68' : 'border-white/12 bg-[rgba(10,10,14,0.42)] text-[#FFF7F0]'}`}
                                />

                                {canManagePromoCode ? (
                                    <button
                                        type="button"
                                        onClick={saveFeaturedCode}
                                        disabled={!isCodeDirty || isSavingCode}
                                        className={`hover-target inline-flex h-11 w-full min-w-[8rem] items-center justify-center rounded-[1rem] px-5 text-[11px] uppercase tracking-[0.2em] transition-colors sm:h-16 sm:min-w-[9rem] sm:w-auto sm:rounded-[1.15rem] ${!isCodeDirty || isSavingCode ? 'border border-white/10 bg-white/5 text-white/35' : 'bg-[#F5D5B4] text-[#141416] hover:bg-[#FFF7F0]'}`}
                                    >
                                        {isSavingCode ? 'Saving' : isCodeDirty ? 'Save Code' : 'Saved'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleCopyCode}
                                        className="hover-target inline-flex h-11 w-full min-w-[8rem] items-center justify-center rounded-[1rem] bg-[#F5D5B4] px-5 text-[11px] uppercase tracking-[0.2em] text-[#141416] transition-colors hover:bg-[#FFF7F0] sm:h-16 sm:min-w-[9rem] sm:w-auto sm:rounded-[1.15rem]"
                                    >
                                        {copyFeedback === 'success' ? 'Copied' : copyFeedback === 'error' ? 'Copy Failed' : 'Copy Code'}
                                    </button>
                                )}
                            </div>

                            {canManagePromoCode && saveFeedback.message && (
                                <p className={`mt-3 text-[10px] uppercase tracking-[0.22em] ${saveFeedback.type === 'error' ? 'text-red-300' : 'text-emerald-200'}`}>
                                    {saveFeedback.message}
                                </p>
                            )}
                        </div>

                        <div className={`mt-5 grid gap-3 sm:mt-6 ${infoGridClassName}`}>
                            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-3 sm:rounded-[1.45rem] sm:p-4">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Discount</p>
                                <p className="mt-2.5 font-serif text-[1.8rem] font-light uppercase tracking-[0.08em] text-[#FFF7F0] sm:mt-3 sm:text-3xl">{promo?.discountSummary || 'Live promo'}</p>
                            </div>

                            <div className="hidden rounded-[1.45rem] border border-white/10 bg-white/[0.04] p-4 sm:block">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Deadline</p>
                                <p className="mt-3 text-sm leading-tight text-[#FFF7F0] sm:text-base">{countdown.hasDeadline ? formatDeadline(promo?.endsAt) : 'Open schedule'}</p>
                            </div>

                            {hasMinimumSubtotal && (
                                <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-3 sm:rounded-[1.45rem] sm:p-4">
                                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Minimum subtotal</p>
                                    <p className="mt-2.5 font-serif text-[1.8rem] font-light uppercase tracking-[0.08em] text-[#FFF7F0] sm:mt-3 sm:text-3xl">{promo.minimumSubtotalDisplay}</p>
                                </div>
                            )}
                        </div>

                        {isAdmin && !promo && (
                            <div className="mt-5 rounded-[1.25rem] border border-amber-200/16 bg-amber-100/8 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-amber-50/86">
                                {savedCode
                                    ? `The code ${savedCode} is not currently available to visitors. Activate it in the admin discounts panel or confirm its schedule and usage limit.`
                                    : 'Save a live discount code to activate the visitor-facing popup. Once the code resolves, visitors can see it on any page after about 10 seconds or after 2 page views.'}
                            </div>
                        )}

                        {!isAdmin && promoState.status === 'error' && (
                            <p className="mt-6 text-sm leading-relaxed text-red-200/82">{promoState.error}</p>
                        )}
                    </div>

                    <aside className="px-4 pb-4 pt-0 sm:p-6 md:p-8 xl:p-10">
                        <div className="flex h-full flex-col justify-between rounded-[1.35rem] border border-white/12 bg-[rgba(255,255,255,0.06)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:rounded-[1.75rem] sm:p-5 xl:min-h-[100%]">
                            <div>
                                <p className="font-serif text-[1.68rem] font-light uppercase tracking-[0.1em] text-[#FFF7F0] sm:text-2xl md:text-[2.15rem]">Time left</p>
                                {countdown.hasDeadline && (
                                    <p className="mt-1.5 text-[9px] uppercase tracking-[0.2em] text-[#F7EFE6]/42 sm:mt-3 sm:text-[11px] sm:tracking-[0.24em]">Closes {formatDeadline(promo?.endsAt)}</p>
                                )}
                            </div>

                            {countdown.hasDeadline ? (
                                <div className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-3 xl:my-auto xl:mt-6 xl:grid-cols-2">
                                    {countdown.segments.map((segment) => (
                                        <div key={segment.label} className="rounded-[0.9rem] border border-white/10 bg-[#0F1013]/45 px-1.5 py-2.5 text-center sm:rounded-[1.2rem] sm:px-3 sm:py-4">
                                            <p className="font-serif text-[1.45rem] font-light leading-none tracking-[0.08em] text-[#FFF7F0] sm:text-4xl">{segment.value}</p>
                                            <p className="mt-1.5 text-[8px] uppercase tracking-[0.2em] text-white/38 sm:mt-3 sm:text-[10px] sm:tracking-[0.28em]">{segment.label}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-[1rem] border border-white/10 bg-[#0F1013]/45 px-4 py-3.5 xl:my-auto xl:mt-6 xl:rounded-[1.2rem] xl:py-5">
                                    <p className="font-serif text-[1.95rem] font-light uppercase tracking-[0.08em] text-[#FFF7F0] sm:text-4xl">Open</p>
                                    <p className="mt-1.5 text-[9px] uppercase tracking-[0.22em] text-white/38 sm:mt-3 sm:text-[10px] sm:tracking-[0.28em]">No deadline set</p>
                                </div>
                            )}
                            <div className="mt-4 hidden flex-wrap gap-2 text-[10px] uppercase tracking-[0.24em] text-white/54 sm:flex sm:mt-6 xl:mt-8">
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">{countdown.compactLabel}</span>
                                {promo?.minimumSubtotal > 0 && <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">Min {formatPromotionCurrency(promo.minimumSubtotal)}</span>}
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
}