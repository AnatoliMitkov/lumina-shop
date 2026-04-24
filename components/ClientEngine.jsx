"use client";

import '../i18n';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import { useCart } from './CartProvider';
import PromoCodePopup from './PromoCodePopup';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { formatCustomMeasurementSummary } from '../utils/cart';
import {
    applyPreferredLanguage,
    changeSiteLanguage,
    DEFAULT_LANGUAGE,
    normalizeLanguage,
    syncDocumentLanguage,
} from '../i18n';
import {
    PAGE_MOTION_STORAGE_KEY,
    PAGE_REVEAL_COMPLETE_EVENT,
    REDUCED_MOTION_QUERY,
    dispatchPageMotionChange,
    dispatchPageRevealComplete,
    resolvePageMotionEnabled,
} from '../utils/page-motion';
import { buildCollectionsHref, PRODUCT_CATEGORY_OPTIONS } from '../utils/products';
import { LEGACY_SPOTLIGHT_PATH, SPOTLIGHT_PATH, isSpotlightPath } from '../utils/site-routes';
import { createClient as createBrowserSupabaseClient, isSupabaseConfigured } from '../utils/supabase/client';
import { createLocalizedValue as localizedFallback, resolveLocalizedValue } from '../utils/language';

gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

const baseCursorClassName = 'hidden md:flex fixed top-0 left-0 relative rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 justify-center items-center text-white text-[10px] uppercase font-medium text-opacity-0 select-none';

function syncPageMotionAttribute(isEnabled) {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.dataset.pageMotion = isEnabled ? 'on' : 'off';
}

function normalizeCategoryValue(value) {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (value == null) {
        return '';
    }

    return String(value).trim();
}

function buildCategoryMenuItems(values = []) {
    const normalizedValues = [...new Set(values.map((value) => normalizeCategoryValue(value)).filter(Boolean))];

    if (normalizedValues.length === 0) {
        return PRODUCT_CATEGORY_OPTIONS;
    }

    const seedOptionSet = new Set(PRODUCT_CATEGORY_OPTIONS.map((option) => option.toLowerCase()));
    const seededMatches = PRODUCT_CATEGORY_OPTIONS.filter((option) => normalizedValues.some((value) => value.toLowerCase() === option.toLowerCase()));
    const customMatches = normalizedValues
        .filter((option) => !seedOptionSet.has(option.toLowerCase()))
        .sort((leftOption, rightOption) => leftOption.localeCompare(rightOption));

    return [...seededMatches, ...customMatches];
}

function GlobeIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <circle cx="12" cy="12" r="8.25"></circle>
            <path d="M4.7 9.25h14.6"></path>
            <path d="M4.7 14.75h14.6"></path>
            <path d="M12 3.75c2.55 2.25 4 5.12 4 8.25s-1.45 6-4 8.25c-2.55-2.25-4-5.12-4-8.25s1.45-6 4-8.25Z"></path>
        </svg>
    );
}

function ChevronIcon({ isOpen = false }) {
    return (
        <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-3 w-3 fill-none stroke-current stroke-[1.8] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <path d="M4.5 7.5 10 13l5.5-5.5"></path>
        </svg>
    );
}

function getLoaderCopyConfig(pathname) {
    if (pathname === '/collections') {
        return {
            title: {
                key: 'shell.intro.collections.title',
                fallback: localizedFallback('Collections', 'Колекции'),
                editorLabel: 'Collections intro title',
            },
            subtitle: null,
        };
    }

    if (pathname === '/bespoke') {
        return {
            title: {
                key: 'shell.intro.bespoke.title',
                fallback: '5th Avenue',
                editorLabel: 'Bespoke intro title',
            },
            subtitle: {
                key: 'shell.intro.bespoke.subtitle',
                fallback: localizedFallback('Editorial Redirect', 'Редакционен преход'),
                editorLabel: 'Bespoke intro subtitle',
            },
        };
    }

    if (isSpotlightPath(pathname)) {
        return {
            title: {
                key: 'shell.intro.spotlight.title',
                fallback: '5th Avenue',
                editorLabel: 'Spotlight intro title',
            },
            subtitle: {
                key: 'shell.intro.spotlight.subtitle',
                fallback: localizedFallback('Editorial Feature', 'Редакционен акцент'),
                editorLabel: 'Spotlight intro subtitle',
            },
        };
    }

    if (pathname === '/account') {
        return {
            title: {
                key: 'shell.intro.account.title',
                fallback: localizedFallback('Account', 'Профил'),
                editorLabel: 'Account intro title',
            },
            subtitle: {
                key: 'shell.intro.account.subtitle',
                fallback: localizedFallback('Private Client Access', 'Достъп за частни клиенти'),
                editorLabel: 'Account intro subtitle',
            },
        };
    }

    if (pathname === '/contact') {
        return {
            title: {
                key: 'shell.intro.contact.title',
                fallback: localizedFallback('Contact', 'Контакт'),
                editorLabel: 'Contact intro title',
            },
            subtitle: {
                key: 'shell.intro.contact.subtitle',
                fallback: localizedFallback('Atelier Correspondence', 'Кореспонденция с ателието'),
                editorLabel: 'Contact intro subtitle',
            },
        };
    }

    if (pathname === '/cart') {
        return {
            title: {
                key: 'shell.intro.cart.title',
                fallback: localizedFallback('Cart', 'Количка'),
                editorLabel: 'Cart intro title',
            },
            subtitle: {
                key: 'shell.intro.cart.subtitle',
                fallback: localizedFallback('Selection Review', 'Преглед на селекцията'),
                editorLabel: 'Cart intro subtitle',
            },
        };
    }

    if (pathname === '/admin') {
        return {
            title: {
                key: 'shell.intro.admin.title',
                fallback: localizedFallback('Admin', 'Админ'),
                editorLabel: 'Admin intro title',
            },
            subtitle: {
                key: 'shell.intro.admin.subtitle',
                fallback: localizedFallback('Catalog Control', 'Управление на каталога'),
                editorLabel: 'Admin intro subtitle',
            },
        };
    }

    return {
        title: {
            key: 'shell.intro.default.title',
            fallback: 'The VA Store',
            editorLabel: 'Default intro title',
        },
        subtitle: {
            key: 'shell.intro.default.subtitle',
            fallback: localizedFallback('Editorial Macramé • Victoria', 'Редакционно макраме • Victoria'),
            editorLabel: 'Default intro subtitle',
        },
    };
}

export default function ClientEngine({ children, initialLanguage }) {
    const { i18n } = useTranslation();
    const siteCopy = useSiteCopy();
    const pathname = usePathname();
    const router = useRouter();
    const { cartItems, removeFromCart, cartTotal, isCartOpen, setIsCartOpen, cartPersistenceMode } = useCart();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileLanguageMenuOpen, setIsMobileLanguageMenuOpen] = useState(false);
    const [isCollectionsSubmenuOpen, setIsCollectionsSubmenuOpen] = useState(false);
    const [isDesktopCollectionsMenuOpen, setIsDesktopCollectionsMenuOpen] = useState(false);
    const [isDesktopCollectionsMenuMounted, setIsDesktopCollectionsMenuMounted] = useState(false);
    const [desktopCollectionsMenuPosition, setDesktopCollectionsMenuPosition] = useState({ top: 0, left: 0 });
    const [hasMounted, setHasMounted] = useState(false);
    const [isPageMotionEnabled, setIsPageMotionEnabled] = useState(() => resolvePageMotionEnabled());
    const [categoryMenuItems, setCategoryMenuItems] = useState(() => PRODUCT_CATEGORY_OPTIONS.filter(Boolean));
    const [isPromoPopupOpen, setIsPromoPopupOpen] = useState(false);
    const normalizedInitialLanguage = normalizeLanguage(initialLanguage) || DEFAULT_LANGUAGE;
    const [activeLanguage, setActiveLanguage] = useState(normalizedInitialLanguage);
    const loaderCopy = getLoaderCopyConfig(pathname);
    const isUtilityRoute = pathname === '/admin' || pathname === '/account' || pathname === '/cart';
    const isImmersiveRoute = isSpotlightPath(pathname);
    const isMobileOverlayOpen = isMobileMenuOpen || isMobileLanguageMenuOpen;
    const localize = (fallback) => resolveLocalizedValue(fallback, activeLanguage);
    const drawerNote = cartPersistenceMode === 'supabase'
        ? localizedFallback('Account sync is active, and the full selection can be archived from the cart page.', 'Профилът е синхронизиран и пълната селекция може да се запази от страницата на количката.')
        : localizedFallback('This selection is being held in this browser while the full atelier archive comes online.', 'Тази селекция се пази в този браузър, докато пълният архив на ателието стане активен.');
    const drawerPrimaryHref = cartItems.length === 0 ? '/collections' : '/cart';
    const drawerPrimaryLabel = cartItems.length === 0
        ? localizedFallback('Explore Pieces', 'Разгледай модели')
        : localizedFallback('View Cart', 'Виж количката');
    
    const cursorRef = useRef(null);
    const cursorLabelRef = useRef(null);
    const preloaderRef = useRef(null);
    const hoverTargetRef = useRef(null);
    const mobileLanguageMenuRef = useRef(null);
    const hasPlayedInitialLoadRef = useRef(false);
    const lenisRef = useRef(null);
    const desktopCollectionsTriggerRef = useRef(null);
    const desktopCollectionsMenuRef = useRef(null);
    const desktopCollectionsCloseTimeoutRef = useRef(null);
    const desktopCollectionsUnmountTimeoutRef = useRef(null);

    useEffect(() => {
        setActiveLanguage(normalizedInitialLanguage);
        syncDocumentLanguage(normalizedInitialLanguage);
    }, [normalizedInitialLanguage]);

    useEffect(() => {
        applyPreferredLanguage();
    }, []);

    useEffect(() => {
        const handleLanguageChanged = (language) => {
            const resolvedLanguage = normalizeLanguage(language) || normalizedInitialLanguage;

            setActiveLanguage(resolvedLanguage);
            syncDocumentLanguage(resolvedLanguage);
        };

        i18n.on('languageChanged', handleLanguageChanged);

        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n, normalizedInitialLanguage]);

    useEffect(() => {
        const lenis = new Lenis({
            lerp: 0.08,
            smoothWheel: true,
            syncTouch: false,
            wheelMultiplier: 0.95,
            touchMultiplier: 0.9,
            overscroll: false,
        });
        const handleTicker = (time) => {
            lenis.raf(time * 1000);
        };

        lenisRef.current = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(handleTicker);
        gsap.ticker.lagSmoothing(0);

        return () => {
            gsap.ticker.remove(handleTicker);
            lenis.off('scroll', ScrollTrigger.update);
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);

    useEffect(() => {
        lenisRef.current?.scrollTo(0, { immediate: true });
    }, [pathname]);

    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsMobileLanguageMenuOpen(false);
        setIsCollectionsSubmenuOpen(false);
        setIsDesktopCollectionsMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isPromoPopupOpen) {
            return;
        }

        setIsMobileMenuOpen(false);
        setIsMobileLanguageMenuOpen(false);
        setIsCollectionsSubmenuOpen(false);
        setIsDesktopCollectionsMenuOpen(false);
    }, [isPromoPopupOpen]);

    useEffect(() => {
        if (!isMobileLanguageMenuOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            if (!mobileLanguageMenuRef.current?.contains(event.target)) {
                setIsMobileLanguageMenuOpen(false);
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);

        return () => window.removeEventListener('pointerdown', handlePointerDown);
    }, [isMobileLanguageMenuOpen]);

    useEffect(() => {
        return () => {
            if (desktopCollectionsCloseTimeoutRef.current != null) {
                window.clearTimeout(desktopCollectionsCloseTimeoutRef.current);
            }

            if (desktopCollectionsUnmountTimeoutRef.current != null) {
                window.clearTimeout(desktopCollectionsUnmountTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isDesktopCollectionsMenuOpen) {
            if (desktopCollectionsUnmountTimeoutRef.current != null) {
                window.clearTimeout(desktopCollectionsUnmountTimeoutRef.current);
                desktopCollectionsUnmountTimeoutRef.current = null;
            }

            setIsDesktopCollectionsMenuMounted(true);
        }
    }, [isDesktopCollectionsMenuOpen]);

    useEffect(() => {
        if (!isDesktopCollectionsMenuOpen) {
            return undefined;
        }

        const updateDesktopCollectionsMenuPosition = () => {
            const trigger = desktopCollectionsTriggerRef.current;

            if (!trigger) {
                return;
            }

            const bounds = trigger.getBoundingClientRect();
            const menuWidth = 304;
            const viewportPadding = 20;
            const maxLeft = Math.max(window.innerWidth - menuWidth - viewportPadding, viewportPadding);

            setDesktopCollectionsMenuPosition({
                top: bounds.bottom + 20,
                left: Math.min(Math.max(bounds.left, viewportPadding), maxLeft),
            });
        };

        updateDesktopCollectionsMenuPosition();
        window.addEventListener('resize', updateDesktopCollectionsMenuPosition);

        return () => window.removeEventListener('resize', updateDesktopCollectionsMenuPosition);
    }, [isDesktopCollectionsMenuOpen]);

    useEffect(() => {
        if (!isDesktopCollectionsMenuMounted) {
            return undefined;
        }

        const menu = desktopCollectionsMenuRef.current;

        if (!menu) {
            return undefined;
        }

        const enterDuration = isPageMotionEnabled ? 0.22 : 0.01;
        const exitDuration = isPageMotionEnabled ? 0.18 : 0.01;

        gsap.killTweensOf(menu);
        gsap.set(menu, { transformOrigin: 'top left' });

        if (isDesktopCollectionsMenuOpen) {
            gsap.fromTo(
                menu,
                { autoAlpha: 0, y: -10, scale: 0.985 },
                { autoAlpha: 1, y: 0, scale: 1, duration: enterDuration, ease: 'power2.out', overwrite: 'auto' }
            );

            return () => gsap.killTweensOf(menu);
        }

        gsap.to(menu, {
            autoAlpha: 0,
            y: -8,
            scale: 0.985,
            duration: exitDuration,
            ease: 'power2.in',
            overwrite: 'auto',
            onComplete: () => {
                setIsDesktopCollectionsMenuMounted(false);
            },
        });

        return () => gsap.killTweensOf(menu);
    }, [isDesktopCollectionsMenuMounted, isDesktopCollectionsMenuOpen, isPageMotionEnabled]);

    useEffect(() => {
        const nextMotionEnabled = resolvePageMotionEnabled();

        setHasMounted(true);
        setIsPageMotionEnabled(nextMotionEnabled);
        syncPageMotionAttribute(nextMotionEnabled);
        dispatchPageMotionChange(nextMotionEnabled);
    }, []);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setCategoryMenuItems(PRODUCT_CATEGORY_OPTIONS.filter(Boolean));
            return undefined;
        }

        const supabase = createBrowserSupabaseClient();
        let isCancelled = false;
        let categoryChannel;

        const loadCategoryMenuItems = async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('category')
                    .eq('status', 'active');

                if (error) {
                    throw error;
                }

                if (!isCancelled) {
                    setCategoryMenuItems(buildCategoryMenuItems((data || []).map((entry) => entry.category)));
                }
            } catch {
                if (!isCancelled) {
                    setCategoryMenuItems(PRODUCT_CATEGORY_OPTIONS.filter(Boolean));
                }
            }
        };

        const handleWindowFocus = () => {
            void loadCategoryMenuItems();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void loadCategoryMenuItems();
            }
        };

        void loadCategoryMenuItems();
        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        try {
            categoryChannel = supabase
                .channel('lumina:menu-categories')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'products',
                    },
                    () => {
                        void loadCategoryMenuItems();
                    }
                )
                .subscribe();
        } catch {
            categoryChannel = null;
        }

        return () => {
            isCancelled = true;
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            if (categoryChannel) {
                supabase.removeChannel(categoryChannel);
            }
        };
    }, []);

    useEffect(() => {
        if (!hasMounted) {
            return;
        }

        syncPageMotionAttribute(isPageMotionEnabled);
    }, [hasMounted, isPageMotionEnabled]);

    useEffect(() => {
        if (!isMobileMenuOpen && !isMobileLanguageMenuOpen) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMobileMenuOpen(false);
                setIsMobileLanguageMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileLanguageMenuOpen, isMobileMenuOpen]);

    const toggleMobileMenu = () => {
        if (!isMobileMenuOpen) {
            setIsCartOpen(false);
        }

        setIsMobileLanguageMenuOpen(false);

        if (isMobileMenuOpen) {
            setIsCollectionsSubmenuOpen(false);
        }

        setIsMobileMenuOpen((currentValue) => !currentValue);
    };

    const handleMobileNavClose = () => {
        setIsCollectionsSubmenuOpen(false);
        setIsMobileMenuOpen(false);
    };

    const handleMobileLanguageChange = (nextLanguage) => {
        setIsMobileLanguageMenuOpen(false);
        void changeSiteLanguage(nextLanguage);
    };

    const openIntroCopyEditor = (entryConfig) => {
        if (!entryConfig || !siteCopy?.openEditor) {
            return;
        }

        siteCopy.openEditor({
            key: entryConfig.key,
            label: entryConfig.editorLabel,
            fallback: entryConfig.fallback,
            entryType: 'text',
            multiline: false,
        });
    };

    const introEditorDock = siteCopy?.isAdmin && siteCopy?.isEditMode ? (
        <div className="fixed bottom-24 right-5 z-[239] flex flex-col gap-2">
            <button
                type="button"
                onClick={() => openIntroCopyEditor(loaderCopy.title)}
                className="hover-target rounded-full border border-[#1C1C1C]/12 bg-[rgba(239,236,232,0.94)] px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C] shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-md transition-colors hover:bg-white"
            >
                {localize(localizedFallback('Edit Intro Title', 'Редактирай уводното заглавие'))}
            </button>
            {loaderCopy.subtitle && (
                <button
                    type="button"
                    onClick={() => openIntroCopyEditor(loaderCopy.subtitle)}
                    className="hover-target rounded-full border border-[#1C1C1C]/12 bg-[rgba(239,236,232,0.94)] px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C] shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-md transition-colors hover:bg-white"
                >
                    {localize(localizedFallback('Edit Intro Subtitle', 'Редактирай уводния подзаглавен ред'))}
                </button>
            )}
        </div>
    ) : null;

    const loaderIntro = (
        <div className="flex w-full max-w-[26rem] flex-col items-center px-6 text-center">
            <div className="w-full overflow-hidden">
                <h1 className="loader-text mx-auto w-[calc(100vw-2rem)] max-w-[22rem] whitespace-normal text-center font-serif text-[2.4rem] font-light uppercase leading-[0.94] tracking-[0.06em] translate-y-full sm:text-[2.85rem] sm:tracking-[0.1em] md:w-auto md:max-w-none md:text-7xl md:tracking-widest">
                    <EditableText contentKey={loaderCopy.title.key} fallback={loaderCopy.title.fallback} editorLabel={loaderCopy.title.editorLabel} multiline={false} />
                </h1>
            </div>
            {loaderCopy.subtitle && (
                <div className="mt-5 w-full overflow-hidden md:mt-6">
                    <p className="loader-text mx-auto w-[calc(100vw-3rem)] max-w-[20rem] text-center font-sans text-[10px] uppercase leading-[1.45] tracking-[0.22em] opacity-0 sm:text-[11px] sm:tracking-[0.26em] md:w-auto md:max-w-none md:text-sm md:tracking-[0.3em]">
                        <EditableText contentKey={loaderCopy.subtitle.key} fallback={loaderCopy.subtitle.fallback} editorLabel={loaderCopy.subtitle.editorLabel} multiline={false} />
                    </p>
                </div>
            )}
        </div>
    );

    const clearDesktopCollectionsCloseTimer = () => {
        if (desktopCollectionsCloseTimeoutRef.current != null) {
            window.clearTimeout(desktopCollectionsCloseTimeoutRef.current);
            desktopCollectionsCloseTimeoutRef.current = null;
        }
    };

    const openDesktopCollectionsMenu = () => {
        clearDesktopCollectionsCloseTimer();

        const trigger = desktopCollectionsTriggerRef.current;

        if (trigger) {
            const bounds = trigger.getBoundingClientRect();
            const menuWidth = 304;
            const viewportPadding = 20;
            const maxLeft = Math.max(window.innerWidth - menuWidth - viewportPadding, viewportPadding);

            setDesktopCollectionsMenuPosition({
                top: bounds.bottom + 20,
                left: Math.min(Math.max(bounds.left, viewportPadding), maxLeft),
            });
        }

        setIsDesktopCollectionsMenuOpen(true);
    };

    const scheduleDesktopCollectionsMenuClose = () => {
        clearDesktopCollectionsCloseTimer();

        desktopCollectionsCloseTimeoutRef.current = window.setTimeout(() => {
            setIsDesktopCollectionsMenuOpen(false);
            desktopCollectionsCloseTimeoutRef.current = null;
        }, 120);
    };

    const handleDesktopCollectionsBlur = (event) => {
        const nextTarget = event.relatedTarget;

        if (
            (desktopCollectionsTriggerRef.current && desktopCollectionsTriggerRef.current.contains(nextTarget))
            || (desktopCollectionsMenuRef.current && desktopCollectionsMenuRef.current.contains(nextTarget))
        ) {
            return;
        }

        scheduleDesktopCollectionsMenuClose();
    };

    const togglePageMotion = () => {
        const nextMotionEnabled = !isPageMotionEnabled;

        setIsPageMotionEnabled(nextMotionEnabled);
        syncPageMotionAttribute(nextMotionEnabled);
        dispatchPageMotionChange(nextMotionEnabled);

        try {
            window.localStorage.setItem(PAGE_MOTION_STORAGE_KEY, nextMotionEnabled ? 'on' : 'off');
        } catch {
            // Ignore storage failures and keep the live preference applied for this visit.
        }

        if (!nextMotionEnabled && typeof window !== 'undefined') {
            dispatchPageRevealComplete(pathname);
        }
    };

    useGSAP(() => {
        // --- 1. Advanced Custom Cursor ---
        const cursor = cursorRef.current;
        const root = typeof document !== 'undefined' ? document.documentElement : null;

        if (!cursor || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            hoverTargetRef.current = null;
            root?.classList.remove('lumina-custom-cursor-ready');
            return undefined;
        }

        root?.classList.add('lumina-custom-cursor-ready');

        const setCursorX = gsap.quickTo(cursor, 'x', { duration: 0.2, ease: 'power2.out' });
        const setCursorY = gsap.quickTo(cursor, 'y', { duration: 0.2, ease: 'power2.out' });

        const animateCursor = (config) => {
            gsap.to(cursor, {
                duration: 0.24,
                ease: 'power2.out',
                overwrite: 'auto',
                ...config,
            });
        };

        const setCursorLabel = (label = '') => {
            if (cursorLabelRef.current) {
                cursorLabelRef.current.textContent = label;
            }
        };

        const getViewModeWidth = (label) => {
            const trimmedLabel = String(label || '').trim();
            return Math.max(96, Math.min(220, Math.round((trimmedLabel.length * 8.4) + 42)));
        };

        const resetCursor = () => {
            cursor.className = baseCursorClassName;
            setCursorLabel('');
            hoverTargetRef.current = null;
            animateCursor({
                width: 14,
                height: 14,
                '--tw-text-opacity': 0,
            });
        };

        const onMouseMove = (e) => {
            const activeTarget = hoverTargetRef.current;
            let targetX = e.clientX;
            let targetY = e.clientY;

            if (activeTarget && document.body.contains(activeTarget)) {
                const bounds = activeTarget.getBoundingClientRect();
                const centerX = bounds.left + (bounds.width / 2);
                const centerY = bounds.top + (bounds.height / 2);
                const cursorAttract = Number.parseFloat(activeTarget.getAttribute('data-cursor-attract') || '');
                const attraction = Number.isFinite(cursorAttract)
                    ? cursorAttract
                    : activeTarget.classList.contains('view-img')
                        ? 0.04
                        : 0.12;

                targetX += (centerX - e.clientX) * attraction;
                targetY += (centerY - e.clientY) * attraction;
            }

            setCursorX(targetX);
            setCursorY(targetY);
        };
        window.addEventListener('mousemove', onMouseMove);

        // Event delegation for hover states
        const onMouseOver = (e) => {
            const target = e.target.closest('.hover-target');
            if (target) {
                hoverTargetRef.current = target;

                const shouldUseLabelCursor = target.classList.contains('view-img') || target.getAttribute('data-cursor-mode') === 'label';

                if (shouldUseLabelCursor) {
                    const cursorText = target.getAttribute('data-cursor-text') || 'View';
                    cursor.classList.remove('hovered');
                    cursor.classList.add('view-mode');
                    setCursorLabel(cursorText);
                    animateCursor({
                        width: getViewModeWidth(cursorText),
                        height: 42,
                        '--tw-text-opacity': 1,
                    });
                } else {
                    cursor.classList.remove('view-mode');
                    setCursorLabel('');
                    cursor.classList.add('hovered');
                    animateCursor({
                        width: 34,
                        height: 34,
                        '--tw-text-opacity': 0,
                    });
                }
            }
        };
        const onMouseOut = (e) => {
            const target = e.target.closest('.hover-target');
            const relatedTarget = e.relatedTarget;
            if (target && (!relatedTarget || !target.contains(relatedTarget))) {
                resetCursor();
            }
        };

        document.addEventListener('mouseover', onMouseOver);
        document.addEventListener('mouseout', onMouseOut);

        return () => {
            root?.classList.remove('lumina-custom-cursor-ready');
            window.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseover', onMouseOver);
            document.removeEventListener('mouseout', onMouseOut);
            resetCursor();
        };
    });

    // --- 3. Page Load & Scroll Animations (Triggers on Route Change) ---
    useGSAP(() => {
        if (isPageMotionEnabled) {
            const isInitialLoad = !hasPlayedInitialLoadRef.current;
            const transitionTimings = isInitialLoad
                ? {
                    loaderInDuration: 0.9,
                    loaderInStagger: 0.12,
                    loaderInDelay: 0.08,
                    loaderOutDuration: 0.62,
                    loaderOutStagger: 0.06,
                    loaderOutDelay: 0.28,
                    preloaderLiftDuration: 0.82,
                    heroDuration: 1.5,
                    heroTitleDuration: 1.05,
                    heroTitleStagger: 0.08,
                    heroSubDuration: 0.9,
                    navDuration: 0.9,
                }
                : {
                    loaderInDuration: 0.56,
                    loaderInStagger: 0.07,
                    loaderInDelay: 0.03,
                    loaderOutDuration: 0.44,
                    loaderOutStagger: 0.04,
                    loaderOutDelay: 0.14,
                    preloaderLiftDuration: 0.76,
                    heroDuration: 1.1,
                    heroTitleDuration: 0.88,
                    heroTitleStagger: 0.06,
                    heroSubDuration: 0.7,
                    navDuration: 0.68,
                };

            const tl = gsap.timeline();
            tl.to('.loader-text', {
                y: '0%',
                opacity: 1,
                duration: transitionTimings.loaderInDuration,
                stagger: transitionTimings.loaderInStagger,
                ease: "power4.out",
                delay: transitionTimings.loaderInDelay,
            })
              .to('.loader-text', {
                  y: '-100%',
                  opacity: 0,
                  duration: transitionTimings.loaderOutDuration,
                  stagger: transitionTimings.loaderOutStagger,
                  ease: "power4.in",
                  delay: transitionTimings.loaderOutDelay,
              })
              .to(preloaderRef.current, { yPercent: -100, duration: transitionTimings.preloaderLiftDuration, ease: "power4.inOut" })
              .to('.hero-img', { opacity: 1, scale: 1, duration: transitionTimings.heroDuration, ease: "power3.out" }, "-=0.45")
              .to('.hero-title', { y: '0%', duration: transitionTimings.heroTitleDuration, stagger: transitionTimings.heroTitleStagger, ease: "power4.out" }, "-=0.72")
              .to('.hero-sub', { opacity: 1, duration: transitionTimings.heroSubDuration, stagger: 0.1, ease: "power3.out" }, "-=0.52");

            if (isImmersiveRoute) {
                tl.call(() => {
                    dispatchPageRevealComplete(pathname);
                }, null, "-=0.2");
            } else {
                tl.to(
                    '#nav',
                    {
                        opacity: 1,
                        duration: transitionTimings.navDuration,
                        onComplete: () => {
                            dispatchPageRevealComplete(pathname);
                        },
                    },
                    "-=0.5"
                );
            }
        } else {
            gsap.set(preloaderRef.current, { yPercent: -100 });
            gsap.set('.loader-text', { y: '0%', opacity: 0 });
            gsap.set('.hero-img', { opacity: 1, scale: 1 });
            gsap.set('.hero-title', { y: '0%' });
            gsap.set('.hero-sub', { opacity: 1 });
            gsap.set('#nav', { opacity: 1 });

            dispatchPageRevealComplete(pathname);
        }

        hasPlayedInitialLoadRef.current = true;

        // Refresh ScrollTriggers for new page content
        ScrollTrigger.refresh();
        
        gsap.utils.toArray('.view-img img').forEach(img => {
            gsap.fromTo(img,
                { yPercent: -8 },
                { yPercent: 8, ease: "none",
                  scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true }
                }
            );
        });

        gsap.utils.toArray('.reveal-text').forEach(text => {
            gsap.to(text, {
                y: 0, opacity: 1, duration: 1.2, ease: "power3.out",
                scrollTrigger: { trigger: text, start: "top 90%" }
            });
        });

        // --- 6. Interactive Accordions ---
        document.querySelectorAll('.accordion-item').forEach(item => {
            const header = item.querySelector('.accordion-header');
            const content = item.querySelector('.accordion-content');
            const icon = item.querySelector('.accordion-icon');
            let isOpen = false;

            // Replace node to clean up any duplicate event listeners from previous renders
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);

            newHeader.addEventListener('click', () => {
                isOpen = !isOpen;
                if (isOpen) {
                    gsap.to(content, { height: 'auto', opacity: 1, duration: 0.4, ease: "power3.out" });
                    gsap.to(icon, { rotate: 45, duration: 0.3, ease: "power2.out" });
                } else {
                    gsap.to(content, { height: 0, opacity: 0, duration: 0.4, ease: "power3.out" });
                    gsap.to(icon, { rotate: 0, duration: 0.3, ease: "power2.out" });
                }
            });
        });
    }, { dependencies: [pathname] });

    // --- 3b. Reveal Safety Net ---
    // After router.refresh() (e.g. login, cart updates) the pathname does not change,
    // so the GSAP timeline above does not re-run. New DOM nodes that ship with
    // .hero-title (translate-y-full), .hero-sub (opacity-0), or .reveal-text
    // (opacity-0 translate-y-8) would otherwise stay invisible until a hard refresh.
    // Watch for newly-mounted ones and animate them in.
    useEffect(() => {
        const REVEALED_ATTR = 'data-lumina-revealed';

        const revealHeroTitle = (element) => {
            if (element.getAttribute(REVEALED_ATTR)) return;
            element.setAttribute(REVEALED_ATTR, 'true');
            gsap.to(element, { y: '0%', duration: 1.2, ease: 'power4.out' });
        };

        const revealHeroSub = (element) => {
            if (element.getAttribute(REVEALED_ATTR)) return;
            element.setAttribute(REVEALED_ATTR, 'true');
            gsap.to(element, { opacity: 1, duration: 1.2, ease: 'power3.out' });
        };

        const revealOnScroll = (element) => {
            if (element.getAttribute(REVEALED_ATTR)) return;
            element.setAttribute(REVEALED_ATTR, 'true');
            gsap.to(element, {
                y: 0,
                opacity: 1,
                duration: 1.2,
                ease: 'power3.out',
                scrollTrigger: { trigger: element, start: 'top 90%' },
            });
        };

        const sweep = (root) => {
            if (!root || typeof root.querySelectorAll !== 'function') return;
            root.querySelectorAll(`.hero-title:not([${REVEALED_ATTR}])`).forEach(revealHeroTitle);
            root.querySelectorAll(`.hero-sub:not([${REVEALED_ATTR}])`).forEach(revealHeroSub);
            root.querySelectorAll(`.reveal-text:not([${REVEALED_ATTR}])`).forEach(revealOnScroll);
        };

        // The original useGSAP timeline above handles the initial DOM (rendered on mount).
        // The MutationObserver below handles elements added AFTER the initial render —
        // for example, the account dashboard appearing after login, or cart items added later.
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.classList?.contains('hero-title')) revealHeroTitle(node);
                    if (node.classList?.contains('hero-sub')) revealHeroSub(node);
                    if (node.classList?.contains('reveal-text')) revealOnScroll(node);
                    sweep(node);
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, []);

    // --- 4. Page Transition Interceptor ---
    useEffect(() => {
        const handleLinkClick = (event) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            const link = event.target.closest('.transition-link');

            if (!(link instanceof HTMLAnchorElement)) {
                return;
            }

            const url = link.getAttribute('href');

            if (!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || link.target === '_blank' || link.hasAttribute('download')) {
                return;
            }

            let nextUrl;

            try {
                nextUrl = new URL(url, window.location.href);
            } catch {
                return;
            }

            if (nextUrl.origin !== window.location.origin) {
                return;
            }

            const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
            const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

            if (nextHref === currentHref) {
                return;
            }

            event.preventDefault();

            if (!isPageMotionEnabled) {
                router.push(nextHref);
                return;
            }

            gsap.set('.loader-text', { opacity: 0 });
            gsap.to(preloaderRef.current, {
                yPercent: 0,
                duration: 0.78,
                ease: "power4.inOut",
                onComplete: () => router.push(nextHref),
            });
        };
        document.addEventListener('click', handleLinkClick);
        return () => document.removeEventListener('click', handleLinkClick);
    }, [isPageMotionEnabled, router]);

    // --- 5. Cart Toggle Animation ---
    useEffect(() => {
        if (isCartOpen) {
            gsap.to('#cart-container', { autoAlpha: 1, duration: 0.01 });
            gsap.to('.cart-overlay', { opacity: 1, duration: 0.4, ease: "power2.out" });
            gsap.to('.cart-panel', { x: '0%', duration: 0.6, ease: "power3.inOut" });
        } else {
            gsap.to('.cart-panel', { x: '100%', duration: 0.5, ease: "power3.in" });
            gsap.to('.cart-overlay', { opacity: 0, duration: 0.4, ease: "power2.in" });
            gsap.to('#cart-container', { autoAlpha: 0, duration: 0.01, delay: 0.5 });
        }

        if (isCartOpen || isMobileMenuOpen) {
            lenisRef.current?.stop();
        } else {
            lenisRef.current?.start();
        }
    }, [isCartOpen, isMobileMenuOpen]);

    if (isImmersiveRoute) {
        return (
            <>
                <div ref={cursorRef} id="cursor" aria-hidden="true" className={baseCursorClassName}>
                    <span className="cursor-shell"></span>
                    <span className="cursor-core"></span>
                    <span ref={cursorLabelRef} className="cursor-label"></span>
                </div>

                <div ref={preloaderRef} id="preloader" className="fixed inset-0 z-[100] bg-[#1C1C1C] text-[#EFECE8] flex flex-col justify-center items-center">
                    {loaderIntro}
                </div>

                <PromoCodePopup pathname={pathname} onOpenChange={setIsPromoPopupOpen} />
                {introEditorDock}

                <div id="smooth-wrapper" className="relative z-10 h-screen w-screen overflow-hidden bg-[#EFECE8]">
                    <div id="smooth-content" className="h-full w-full">
                        {children}
                    </div>
                </div>
            </>
        );
    }

    // v2 routes use their own layout (Nav, Footer) defined in app/v2/layout.jsx.
    // Skip the v1 shell entirely so there is no overlap.
    if (pathname.startsWith('/v2')) {
        return <>{children}</>;
    }

    return (
        <>
            <div ref={cursorRef} id="cursor" aria-hidden="true" className={baseCursorClassName}>
                <span className="cursor-shell"></span>
                <span className="cursor-core"></span>
                <span ref={cursorLabelRef} className="cursor-label"></span>
            </div>

            <div ref={preloaderRef} id="preloader" className="fixed inset-0 z-[100] bg-[#1C1C1C] text-[#EFECE8] flex flex-col justify-center items-center">
                {loaderIntro}
            </div>

            <PromoCodePopup pathname={pathname} onOpenChange={setIsPromoPopupOpen} />
            {introEditorDock}

            <div className={`fixed inset-x-0 top-0 z-[55] border-b border-white/10 bg-[rgba(12,12,14,0.82)] text-[#EFECE8] backdrop-blur-xl ${isPromoPopupOpen ? 'pointer-events-none' : ''}`}>
                <div className="mx-auto flex min-h-[2.75rem] max-w-[1800px] items-center justify-center px-5 py-2 md:min-h-10 md:px-12">
                    <p className="text-center text-[10px] leading-[1.25] text-white/78 md:text-xs">
                        <EditableText
                            contentKey="shell.build_notice"
                            fallback={localizedFallback(
                                'Website still in active build. Payments and contact work. Some details may still look unfinished.',
                                'Сайтът все още се доизгражда. Плащанията и контактът работят. Някои детайли може още да не са завършени.'
                            )}
                            editorLabel="Global build notice"
                            multiline
                        />
                    </p>
                </div>
            </div>

            <nav id="nav" className={`fixed top-[2.75rem] md:top-10 w-full flex justify-between items-center px-5 md:px-12 py-5 md:py-8 ${isMobileOverlayOpen ? 'z-[130] mix-blend-normal' : 'z-50 mix-blend-difference'} text-white opacity-0 ${isPromoPopupOpen ? 'pointer-events-none' : ''}`}>
                <a href="/" className="hover-target transition-link font-serif text-xl sm:text-2xl md:text-3xl leading-none font-medium tracking-[0.16em] md:tracking-widest uppercase whitespace-nowrap"><EditableText contentKey="shell.brand.name" fallback="The VA Store" editorLabel="Shell brand name" /></a>
                <div className="relative z-[131] flex md:hidden items-center gap-3">
                    <div ref={mobileLanguageMenuRef} className="relative">
                        <button
                            type="button"
                            aria-expanded={isMobileLanguageMenuOpen}
                            aria-label={localize(localizedFallback('Open language menu', 'Отвори менюто за език'))}
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                setIsCollectionsSubmenuOpen(false);
                                setIsMobileLanguageMenuOpen((currentValue) => !currentValue);
                            }}
                            className="hover-target mix-blend-normal inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white backdrop-blur-xl transition-colors hover:bg-white/16"
                        >
                            <GlobeIcon />
                        </button>

                        <div className={`mix-blend-normal absolute right-0 top-[calc(100%+0.55rem)] w-[10rem] overflow-hidden rounded-[1.35rem] border border-white/12 bg-[rgba(17,17,17,0.88)] p-2 text-[#EFECE8] shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl transition-all duration-200 ${isMobileLanguageMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'}`}>
                            {['en', 'bg'].map((language) => (
                                <button
                                    key={language}
                                    type="button"
                                    onClick={() => handleMobileLanguageChange(language)}
                                    className={`hover-target flex w-full items-center justify-between rounded-[1rem] px-4 py-3 text-left text-[10px] uppercase tracking-[0.24em] transition-colors ${activeLanguage === language ? 'bg-[#EFE7DA] text-[#1C1C1C]' : 'bg-transparent text-white/72 hover:bg-white/[0.08] hover:text-white'}`}
                                >
                                    <span>{language === 'en' ? localize(localizedFallback('English', 'Английски')) : localize(localizedFallback('Bulgarian', 'Български'))}</span>
                                    {activeLanguage === language ? <span className="text-[11px]">●</span> : null}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-nav-panel"
                        aria-label={isMobileMenuOpen
                            ? localize(localizedFallback('Close navigation menu', 'Затвори навигацията'))
                            : localize(localizedFallback('Open navigation menu', 'Отвори навигацията'))}
                        onClick={toggleMobileMenu}
                        className={`hover-target relative inline-flex h-11 w-11 items-center justify-center rounded-full text-white backdrop-blur-xl transition-colors ${isMobileMenuOpen ? 'border border-white/12 bg-[rgba(17,17,17,0.88)] shadow-[0_24px_70px_rgba(0,0,0,0.32)]' : 'border border-white/18 bg-white/10 hover:bg-white/16'}`}
                    >
                        <span className={`absolute h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-[6px]'}`}></span>
                        <span className={`absolute h-[1.5px] w-5 rounded-full bg-current transition-all duration-200 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                        <span className={`absolute h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-[6px]'}`}></span>
                    </button>
                </div>
                <div className="hidden md:flex gap-10 text-sm md:text-base uppercase tracking-[0.2em] font-medium">
                    <div
                        ref={desktopCollectionsTriggerRef}
                        className="relative flex items-center"
                        onMouseEnter={openDesktopCollectionsMenu}
                        onMouseLeave={scheduleDesktopCollectionsMenuClose}
                        onFocusCapture={openDesktopCollectionsMenu}
                        onBlurCapture={handleDesktopCollectionsBlur}
                    >
                        <a href="/collections" className="hover-target transition-link inline-flex items-center gap-2">
                            <span><EditableText contentKey="shell.nav.collections" fallback={localizedFallback('Collections', 'Колекции')} editorLabel="Navigation Collections label" /></span>
                            <span className="text-white/30">+</span>
                        </a>
                    </div>
                    <a href={SPOTLIGHT_PATH} className="hover-target transition-link"><EditableText contentKey="shell.nav.spotlight" fallback={localizedFallback('Spotlight', 'Акцент')} editorLabel="Navigation Spotlight label" /></a>
                    <a href="/account" className="hover-target transition-link"><EditableText contentKey="shell.nav.account" fallback={localizedFallback('Account', 'Профил')} editorLabel="Navigation Account label" /></a>
                    <a href="/contact" className="hover-target transition-link"><EditableText contentKey="shell.nav.contact" fallback={localizedFallback('Contact', 'Контакт')} editorLabel="Navigation Contact label" /></a>
                    <a href="/cart" className="hover-target transition-link"><EditableText contentKey="shell.nav.cart" fallback={localizedFallback('Cart', 'Количка')} editorLabel="Navigation Cart label" /></a>
                </div>
            </nav>

            {isDesktopCollectionsMenuMounted && (
                <div
                    ref={desktopCollectionsMenuRef}
                    className={`fixed z-[60] hidden md:block ${isDesktopCollectionsMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
                    style={{ top: desktopCollectionsMenuPosition.top, left: desktopCollectionsMenuPosition.left }}
                    onMouseEnter={clearDesktopCollectionsCloseTimer}
                    onMouseLeave={scheduleDesktopCollectionsMenuClose}
                    onFocusCapture={openDesktopCollectionsMenu}
                    onBlurCapture={handleDesktopCollectionsBlur}
                >
                    <div className="min-w-[19rem] rounded-[1.75rem] border border-white/10 bg-[rgba(10,10,12,0.8)] p-5 text-[#F1F1F1] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                        <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.28em] text-[#F1F1F1]/45"><EditableText contentKey="shell.collections_menu.eyebrow" fallback={localizedFallback('Collections', 'Колекции')} editorLabel="Collections menu eyebrow" /></p>
                                <p className="mt-2 font-serif text-2xl font-light uppercase tracking-[0.08em] text-[#F1F1F1]"><EditableText contentKey="shell.collections_menu.title" fallback={localizedFallback('By Category', 'По категория')} editorLabel="Collections menu title" /></p>
                            </div>
                            <a href="/collections" className="hover-target transition-link text-[10px] uppercase tracking-[0.22em] text-[#F1F1F1]/62 transition-colors hover:text-[#F1F1F1]"><EditableText contentKey="shell.collections_menu.view_all" fallback={localizedFallback('View All', 'Виж всички')} editorLabel="Collections menu view all" /></a>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-[11px] uppercase tracking-[0.24em]">
                            {categoryMenuItems.map((category) => (
                                <a
                                    key={category}
                                    href={buildCollectionsHref({ category })}
                                    className="hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-[#F1F1F1] transition-colors hover:bg-white/[0.11]"
                                >
                                    <span>{category}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className={`fixed inset-0 z-[120] md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <div onClick={() => setIsMobileMenuOpen(false)} className={`absolute inset-0 bg-[#1C1C1C]/42 backdrop-blur-xl transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}></div>
                <div id="mobile-nav-panel" className={`absolute inset-x-4 bottom-4 top-[8.5rem] flex flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[rgba(17,17,17,0.78)] p-5 text-[#EFECE8] shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
                    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40"><EditableText contentKey="shell.mobile_menu.eyebrow" fallback={localizedFallback('Navigation', 'Навигация')} editorLabel="Mobile menu eyebrow" /></p>
                            <p className="mt-2 font-serif text-2xl font-light uppercase tracking-[0.08em]"><EditableText contentKey="shell.brand.name" fallback="The VA Store" editorLabel="Shell brand name" /></p>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/36"><EditableText contentKey="shell.mobile_menu.badge" fallback={localizedFallback('Mobile', 'Мобилно')} editorLabel="Mobile menu badge" /></p>
                    </div>

                    <div data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                        <div className="grid grid-cols-1 gap-3 text-[11px] uppercase tracking-[0.24em] font-medium">
                            <a href="/" onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '30ms' : '0ms' }}><span><EditableText contentKey="shell.nav.home" fallback={localizedFallback('Home', 'Начало')} editorLabel="Navigation Home label" /></span></a>

                            <div className={`transition-all duration-300 ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '80ms' : '0ms' }}>
                                <button
                                    type="button"
                                    aria-expanded={isCollectionsSubmenuOpen}
                                    onClick={() => setIsCollectionsSubmenuOpen((currentValue) => !currentValue)}
                                    className="hover-target flex w-full items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-left text-white/88 transition-colors hover:bg-white/[0.08]"
                                >
                                    <span><EditableText contentKey="shell.nav.collections" fallback={localizedFallback('Collections', 'Колекции')} editorLabel="Navigation Collections label" /></span>
                                    <span className={`text-white/26 transition-transform duration-300 ${isCollectionsSubmenuOpen ? 'rotate-45' : ''}`}>+</span>
                                </button>

                                <div className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ${isCollectionsSubmenuOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
                                    <div className="min-h-0 flex flex-col gap-2 pl-4">
                                        <a href="/collections" onClick={handleMobileNavClose} className="hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-[10px] text-white/72 transition-colors hover:bg-white/[0.08]"><span><EditableText contentKey="shell.mobile_menu.view_all_collections" fallback={localizedFallback('View All Collections', 'Всички колекции')} editorLabel="Mobile menu view all collections" /></span></a>
                                        {categoryMenuItems.map((category) => (
                                            <a
                                                key={category}
                                                href={buildCollectionsHref({ category })}
                                                onClick={handleMobileNavClose}
                                                className="hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-[10px] text-white/72 transition-colors hover:bg-white/[0.08]"
                                            >
                                                <span>{category}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <a href={SPOTLIGHT_PATH} onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '130ms' : '0ms' }}><span><EditableText contentKey="shell.nav.spotlight" fallback={localizedFallback('Spotlight', 'Акцент')} editorLabel="Navigation Spotlight label" /></span></a>
                            <a href="/account" onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '180ms' : '0ms' }}><span><EditableText contentKey="shell.nav.account" fallback={localizedFallback('Account', 'Профил')} editorLabel="Navigation Account label" /></span></a>
                            <a href="/contact" onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '230ms' : '0ms' }}><span><EditableText contentKey="shell.nav.contact" fallback={localizedFallback('Contact', 'Контакт')} editorLabel="Navigation Contact label" /></span></a>
                            <a href="/cart" onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '280ms' : '0ms' }}><span><EditableText contentKey="shell.nav.cart" fallback={localizedFallback('Cart', 'Количка')} editorLabel="Navigation Cart label" /></span></a>
                        </div>

                        <div className={`mt-5 rounded-[1.55rem] border border-white/10 bg-white/[0.04] p-4 transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '330ms' : '0ms' }}>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/38"><EditableText contentKey="shell.mobile_menu.details_title" fallback={localizedFallback('More From The Atelier', 'Още от ателието')} editorLabel="Mobile menu details title" /></p>
                            <p className="mt-3 text-xs leading-relaxed tracking-[0.08em] text-white/62 uppercase"><EditableText contentKey="shell.footer.brand_copy" fallback={localizedFallback('Elevating traditional craftsmanship into avant-garde fashion.', 'Превръщаме традиционната изработка в авангардна мода.')} editorLabel="Footer brand copy" /></p>
                            <p className="mt-3 text-sm leading-relaxed normal-case tracking-normal text-white/52"><EditableText contentKey="shell.footer.atelier_copy" fallback={localizedFallback('Editorial spotlight and personal support for signature pieces', 'Редакционен фокус и лично съдействие за отличителни модели')} editorLabel="Footer atelier copy" /></p>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.22em] text-white/72">
                                <a href="/privacy-policy" onClick={handleMobileNavClose} className="hover-target transition-link flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-center transition-colors hover:bg-white/[0.08]"><EditableText contentKey="shell.footer.privacy_policy" fallback={localizedFallback('Privacy Policy', 'Политика за поверителност')} editorLabel="Footer privacy policy label" /></a>
                                <a href="/cookie-policy" onClick={handleMobileNavClose} className="hover-target transition-link flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-center transition-colors hover:bg-white/[0.08]"><EditableText contentKey="shell.footer.cookie_policy" fallback={localizedFallback('Cookie Policy', 'Политика за бисквитки')} editorLabel="Footer cookie policy label" /></a>
                                <a href="https://www.instagram.com/va.storeofficial/" target="_blank" rel="noreferrer" className="hover-target transition-link flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-center transition-colors hover:bg-white/[0.08]"><EditableText contentKey="shell.footer.social.instagram" fallback="Instagram" editorLabel="Footer Instagram label" /></a>
                                <a href="https://www.facebook.com/profile.php?id=61584052437151" target="_blank" rel="noreferrer" className="hover-target transition-link flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-center transition-colors hover:bg-white/[0.08]"><EditableText contentKey="shell.footer.social.facebook" fallback="Facebook" editorLabel="Footer Facebook label" /></a>
                                <a href="https://www.tiktok.com/@2hotbyva" target="_blank" rel="noreferrer" className="hover-target transition-link col-span-2 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-center transition-colors hover:bg-white/[0.08]"><EditableText contentKey="shell.footer.social.tiktok" fallback="TikTok" editorLabel="Footer TikTok label" /></a>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 border-t border-white/8 pt-4 normal-case tracking-normal text-white/60">
                                <a href="mailto:sales@stylingbyva.com" className="hover-target transition-link text-sm text-white/78 hover:text-white">sales@stylingbyva.com</a>
                                <p className="text-sm"><EditableText contentKey="shell.footer.location" fallback={localizedFallback('Ruse, Bulgaria', 'Русе, България')} editorLabel="Footer location" /></p>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                                <span className="text-[10px] uppercase tracking-[0.24em] text-white/40"><EditableText contentKey="shell.footer.page_motion" fallback={localizedFallback('Page Motion', 'Анимации')} editorLabel="Footer page motion label" /></span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={hasMounted ? isPageMotionEnabled : true}
                                    aria-label={hasMounted && !isPageMotionEnabled
                                        ? localize(localizedFallback('Turn page motion on', 'Включи анимациите на страницата'))
                                        : localize(localizedFallback('Turn page motion off', 'Изключи анимациите на страницата'))}
                                    onClick={togglePageMotion}
                                    className="hover-target inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/72 transition-colors hover:bg-white/[0.08]"
                                >
                                    <span className={`flex h-5 w-10 items-center rounded-full border border-white/10 px-1 transition-colors ${hasMounted && isPageMotionEnabled ? 'justify-end bg-white/12' : 'justify-start bg-transparent'}`}>
                                        <span className={`h-3 w-3 rounded-full transition-colors ${hasMounted && isPageMotionEnabled ? 'bg-[#EFECE8]' : 'bg-white/42'}`}></span>
                                    </span>
                                    <span suppressHydrationWarning>{hasMounted && !isPageMotionEnabled ? localize(localizedFallback('Off', 'Изкл')) : localize(localizedFallback('On', 'Вкл'))}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="smooth-wrapper" className={`w-full min-h-screen relative z-10 bg-[#EFECE8] ${isUtilityRoute ? 'shadow-[0_16px_40px_rgba(0,0,0,0.18)]' : 'shadow-[0_20px_50px_rgba(0,0,0,0.3)]'}`}>
                <div id="smooth-content">
                    {children}
                </div>
            </div>

            <footer className="relative w-full z-10 bg-[#1C1C1C] text-[#EFECE8] px-5 md:px-8 xl:px-10 pt-10 md:pt-12 pb-10 md:pb-12">
                <div className="max-w-[1800px] mx-auto w-full flex flex-col gap-8 md:gap-10">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[11px] uppercase tracking-[0.15em] font-medium md:[grid-template-columns:minmax(0,1.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.05fr)] md:gap-x-12 md:gap-y-8 md:text-xs">
                        <div className="col-span-2 flex max-w-sm flex-col gap-3 md:col-span-1 md:max-w-none">
                            <h3 className="font-serif text-3xl md:text-5xl font-light uppercase tracking-[0.18em] md:tracking-widest"><EditableText contentKey="shell.brand.name" fallback="The VA Store" editorLabel="Shell brand name" /></h3>
                            <p className="text-[11px] md:text-sm tracking-[0.2em] md:tracking-[0.24em] font-light uppercase text-white/70"><EditableText contentKey="shell.footer.slogan" fallback={localizedFallback('Beautiful People Smile More', 'Красивите хора се усмихват повече')} editorLabel="Footer slogan" /></p>
                            <p className="text-[10px] leading-relaxed tracking-[0.16em] font-light uppercase text-white/50 md:text-sm md:tracking-[0.2em]"><EditableText contentKey="shell.footer.brand_copy" fallback={localizedFallback('Elevating traditional craftsmanship into avant-garde fashion.', 'Превръщаме традиционната изработка в авангардна мода.')} editorLabel="Footer brand copy" /></p>
                        </div>

                        <div className="flex flex-col">
                            <span className="mb-3 text-white/30"><EditableText contentKey="shell.footer.explore_title" fallback={localizedFallback('Explore', 'Разгледай')} editorLabel="Footer explore title" /></span>
                            <div className="flex flex-col gap-3">
                                <a href="/" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.home" fallback={localizedFallback('Home', 'Начало')} editorLabel="Footer Home label" /></a>
                                <a href="/collections" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.collections" fallback={localizedFallback('Collections', 'Колекции')} editorLabel="Navigation Collections label" /></a>
                                <a href={SPOTLIGHT_PATH} className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.spotlight" fallback={localizedFallback('Spotlight', 'Акцент')} editorLabel="Navigation Spotlight label" /></a>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="mb-3 text-white/30"><EditableText contentKey="shell.footer.client_title" fallback={localizedFallback('Client', 'Клиент')} editorLabel="Footer client title" /></span>
                            <div className="flex flex-col gap-3">
                                <a href="/account" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.account" fallback={localizedFallback('Account', 'Профил')} editorLabel="Navigation Account label" /></a>
                                <a href="/cart" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.cart" fallback={localizedFallback('Cart', 'Количка')} editorLabel="Navigation Cart label" /></a>
                                <a href="/contact" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.contact_form" fallback={localizedFallback('Contact Form', 'Форма за контакт')} editorLabel="Footer contact form label" /></a>
                                <a href="mailto:sales@stylingbyva.com" className="hover-target hover:text-white/70 transition-colors normal-case tracking-normal text-sm">sales@stylingbyva.com</a>
                            </div>
                        </div>

                        <div className="col-span-2 flex flex-col border-t border-white/10 pt-4 text-left md:col-span-1 md:border-t-0 md:border-l md:pl-6">
                            <span className="mb-3 text-white/30"><EditableText contentKey="shell.footer.atelier_title" fallback={localizedFallback('Atelier', 'Ателие')} editorLabel="Footer atelier title" /></span>
                            <div className="flex h-full flex-col gap-2.5 normal-case tracking-normal text-sm font-normal text-white/55 md:h-auto">
                                <p className="text-white/70"><EditableText contentKey="shell.footer.location" fallback={localizedFallback('Ruse, Bulgaria', 'Русе, България')} editorLabel="Footer location" /></p>
                                <p><EditableText contentKey="shell.footer.atelier_name" fallback={localizedFallback('Styling by VA Atelier', 'Ателие Styling by VA')} editorLabel="Footer atelier name" /></p>
                                <p><EditableText contentKey="shell.footer.atelier_copy" fallback={localizedFallback('Editorial spotlight and personal support for signature pieces', 'Редакционен фокус и лично съдействие за отличителни модели')} editorLabel="Footer atelier copy" /></p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 border-t border-white/10 pt-4 text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/40 md:flex md:items-center md:justify-between">
                        <p className="text-center md:text-left"><EditableText contentKey="shell.footer.copyright" fallback="© 2026 The VA Store." editorLabel="Footer copyright" /></p>
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center md:justify-start">
                                <a href="/privacy-policy" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.privacy_policy" fallback={localizedFallback('Privacy Policy', 'Политика за поверителност')} editorLabel="Footer privacy policy label" /></a>
                                <a href="/cookie-policy" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.cookie_policy" fallback={localizedFallback('Cookie Policy', 'Политика за бисквитки')} editorLabel="Footer cookie policy label" /></a>
                                <a href="https://www.instagram.com/va.storeofficial/" target="_blank" rel="noreferrer" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.social.instagram" fallback="Instagram" editorLabel="Footer Instagram label" /></a>
                                <a href="https://www.facebook.com/profile.php?id=61584052437151" target="_blank" rel="noreferrer" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.social.facebook" fallback="Facebook" editorLabel="Footer Facebook label" /></a>
                                <a href="https://www.tiktok.com/@2hotbyva" target="_blank" rel="noreferrer" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.social.tiktok" fallback="TikTok" editorLabel="Footer TikTok label" /></a>
                        </div>
                        <div className="mx-auto flex flex-col items-center justify-center gap-3 md:mx-0 md:flex-row">
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-white/34"><EditableText contentKey="shell.footer.language" fallback={localizedFallback('Language', 'Език')} editorLabel="Footer language label" /></span>
                                <div className="inline-flex rounded-full border border-white/12 bg-white/[0.04] p-1">
                                    {['en', 'bg'].map((language) => (
                                        <button
                                            key={language}
                                            type="button"
                                            aria-label={language === 'en'
                                                ? localize(localizedFallback('Switch to English', 'Смени на английски'))
                                                : localize(localizedFallback('Switch to Bulgarian', 'Смени на български'))}
                                            onClick={() => void changeSiteLanguage(language)}
                                            className={`hover-target rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors ${activeLanguage === language ? 'bg-[#EFE7DA] text-[#1C1C1C]' : 'text-white/70 hover:text-white'}`}
                                        >
                                            {language.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <p className="hover-target text-center md:text-right"><EditableText contentKey="shell.footer.credits" fallback={localizedFallback('Crafted by Victoria', 'Създадено от Victoria')} editorLabel="Footer credits" /></p>
                    </div>
                </div>
            </footer>

            <div id="cart-container" className="fixed inset-0 z-[200] invisible flex justify-end overflow-hidden">
            <div onClick={() => setIsCartOpen(false)} className="cart-overlay absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-md opacity-0 cursor-pointer"></div>
                <div className="cart-panel relative w-full md:w-[30vw] h-full bg-[#EFECE8] translate-x-full flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-8 md:p-12 border-b border-[#1C1C1C]/10"><h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest"><EditableText contentKey="shell.cart_drawer.title" fallback={localizedFallback('Cart', 'Количка')} editorLabel="Cart drawer title" /></h2><button onClick={() => setIsCartOpen(false)} className="hover-target text-xs uppercase tracking-widest font-medium"><EditableText contentKey="shell.cart_drawer.close" fallback={localizedFallback('Close', 'Затвори')} editorLabel="Cart drawer close" /></button></div>
                <div data-lenis-prevent-wheel className="flex-1 p-8 md:p-12 flex flex-col gap-8 overflow-y-auto overscroll-contain">
                    {cartItems.length === 0 ? (
                        <p className="text-sm uppercase tracking-widest text-gray-500"><EditableText contentKey="shell.cart_drawer.empty" fallback={localizedFallback('Your cart is empty.', 'Количката е празна.')} editorLabel="Cart drawer empty state" /></p>
                    ) : (
                        cartItems.map((item, i) => {
                            const customMeasurementSummary = formatCustomMeasurementSummary(item);

                            return (
                            <div key={i} className="flex gap-6 items-center group">
                                <img src={item.image_main} className="w-20 h-28 object-cover rounded-sm" alt={item.name} />
                                <div className="flex flex-col flex-1 gap-2">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-sans text-xs uppercase tracking-widest font-medium">{item.name}</h3>
                                        <button onClick={() => removeFromCart(i)} className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-[#1C1C1C] transition-colors">{localize(localizedFallback('Remove', 'Премахни'))}</button>
                                    </div>
                                    <p className="font-sans text-sm font-medium">€{Number(item.price).toFixed(2)}</p>
                                    {(item.selected_size || item.selected_tone) && (
                                        <div className="flex flex-wrap gap-2 pt-1 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/48">
                                            {item.selected_size && <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{localize(localizedFallback('Size', 'Размер'))} {item.selected_size}</span>}
                                            {item.selected_tone && <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{localize(localizedFallback('Tone', 'Нюанс'))} {item.selected_tone}</span>}
                                        </div>
                                    )}
                                    {customMeasurementSummary && (
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">{localize(localizedFallback('Custom', 'По мярка'))} {customMeasurementSummary}</p>
                                    )}
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>
                <div className="p-8 md:p-12 border-t border-[#1C1C1C]/10 bg-[#EFECE8]">
                    <div className="flex justify-between items-center mb-8 font-medium uppercase tracking-widest text-xs"><span><EditableText contentKey="shell.cart_drawer.total" fallback={localizedFallback('Total', 'Общо')} editorLabel="Cart drawer total label" /></span><span className="text-sm">€{cartTotal.toFixed(2)}</span></div>
                    <p className="mb-6 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/50"><EditableText contentKey={cartPersistenceMode === 'supabase' ? 'shell.cart_drawer.note.synced' : 'shell.cart_drawer.note.local'} fallback={drawerNote} editorLabel="Cart drawer note" /></p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a href={drawerPrimaryHref} onClick={() => setIsCartOpen(false)} className="hover-target transition-link w-full py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center transition-colors hover:bg-black"><EditableText contentKey={cartItems.length === 0 ? 'shell.cart_drawer.primary.explore' : 'shell.cart_drawer.primary.view_cart'} fallback={drawerPrimaryLabel} editorLabel="Cart drawer primary button" /></a>
                        <button onClick={() => setIsCartOpen(false)} className="hover-target w-full py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium transition-colors hover:border-[#1C1C1C]/25 hover:bg-white/50"><EditableText contentKey="shell.cart_drawer.continue" fallback={localizedFallback('Continue Shopping', 'Продължи с разглеждането')} editorLabel="Cart drawer continue shopping" /></button>
                    </div>
                </div>
                </div>
            </div>
        </>
    );
}