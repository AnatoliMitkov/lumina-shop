"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import { useCart } from './CartProvider';
import EditableText from './site-copy/EditableText';
import { formatCustomMeasurementSummary } from '../utils/cart';
import { buildCollectionsHref, PRODUCT_CATEGORY_OPTIONS } from '../utils/products';
import { createClient as createBrowserSupabaseClient, isSupabaseConfigured } from '../utils/supabase/client';

gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

const baseCursorClassName = 'hidden md:flex fixed top-0 left-0 relative rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 justify-center items-center text-white text-[10px] uppercase font-medium text-opacity-0 select-none';
const PAGE_MOTION_STORAGE_KEY = 'lumina-page-motion';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function resolvePageMotionEnabled() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return true;
    }

    try {
        const storedPreference = window.localStorage.getItem(PAGE_MOTION_STORAGE_KEY);

        if (storedPreference === 'on') {
            return true;
        }

        if (storedPreference === 'off') {
            return false;
        }
    } catch {
        // Ignore storage failures and fall back to system preference.
    }

    return !window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

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

export default function ClientEngine({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { cartItems, removeFromCart, cartTotal, isCartOpen, setIsCartOpen, cartPersistenceMode } = useCart();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollectionsSubmenuOpen, setIsCollectionsSubmenuOpen] = useState(false);
    const [isDesktopCollectionsMenuOpen, setIsDesktopCollectionsMenuOpen] = useState(false);
    const [isDesktopCollectionsMenuMounted, setIsDesktopCollectionsMenuMounted] = useState(false);
    const [desktopCollectionsMenuPosition, setDesktopCollectionsMenuPosition] = useState({ top: 0, left: 0 });
    const [hasMounted, setHasMounted] = useState(false);
    const [isPageMotionEnabled, setIsPageMotionEnabled] = useState(() => resolvePageMotionEnabled());
    const [categoryMenuItems, setCategoryMenuItems] = useState(() => PRODUCT_CATEGORY_OPTIONS.filter(Boolean));
    const isUtilityRoute = pathname === '/admin' || pathname === '/account' || pathname === '/cart';
    const drawerNote = cartPersistenceMode === 'supabase'
        ? 'Account sync is active, and the full selection can be archived from the cart page.'
        : 'This selection is being held in this browser while the full atelier archive comes online.';
    const drawerPrimaryHref = cartItems.length === 0 ? '/collections' : '/cart';
    const drawerPrimaryLabel = cartItems.length === 0 ? 'Explore Pieces' : 'View Cart';
    
    // Dynamically set cinematic loader text based on the route
    let loaderTitle = "The VA Store";
    let loaderSub = "Editorial Macramé • Victoria";
    if (pathname === '/collections') {
        loaderTitle = "Collections";
        loaderSub = null;
    } else if (pathname === '/bespoke') {
        loaderTitle = "Spotlight";
        loaderSub = "Editorial Redirect";
    } else if (pathname === '/spotlight') {
        loaderTitle = "Spotlight";
        loaderSub = "Editorial Feature";
    } else if (pathname === '/account') {
        loaderTitle = "Account";
        loaderSub = "Private Client Access";
    } else if (pathname === '/contact') {
        loaderTitle = "Contact";
        loaderSub = "Atelier Correspondence";
    } else if (pathname === '/cart') {
        loaderTitle = "Cart";
        loaderSub = "Selection Review";
    } else if (pathname === '/admin') {
        loaderTitle = "Admin";
        loaderSub = "Catalog Control";
    }

    const cursorRef = useRef(null);
    const cursorLabelRef = useRef(null);
    const preloaderRef = useRef(null);
    const hoverTargetRef = useRef(null);
    const hasPlayedInitialLoadRef = useRef(false);
    const lenisRef = useRef(null);
    const desktopCollectionsTriggerRef = useRef(null);
    const desktopCollectionsMenuRef = useRef(null);
    const desktopCollectionsCloseTimeoutRef = useRef(null);
    const desktopCollectionsUnmountTimeoutRef = useRef(null);

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
        setIsCollectionsSubmenuOpen(false);
        setIsDesktopCollectionsMenuOpen(false);
    }, [pathname]);

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
        if (!isMobileMenuOpen) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileMenuOpen]);

    const toggleMobileMenu = () => {
        if (!isMobileMenuOpen) {
            setIsCartOpen(false);
        }

        if (isMobileMenuOpen) {
            setIsCollectionsSubmenuOpen(false);
        }

        setIsMobileMenuOpen((currentValue) => !currentValue);
    };

    const handleMobileNavClose = () => {
        setIsCollectionsSubmenuOpen(false);
        setIsMobileMenuOpen(false);
    };

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

        try {
            window.localStorage.setItem(PAGE_MOTION_STORAGE_KEY, nextMotionEnabled ? 'on' : 'off');
        } catch {
            // Ignore storage failures and keep the live preference applied for this visit.
        }

        if (!nextMotionEnabled && typeof window !== 'undefined') {
            window.__luminaLastRevealPathname = pathname;
            window.dispatchEvent(new CustomEvent('lumina:page-reveal-complete', { detail: { pathname } }));
        }
    };

    useGSAP(() => {
        // --- 1. Advanced Custom Cursor ---
        const cursor = cursorRef.current;

        if (!cursor || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            hoverTargetRef.current = null;
            return undefined;
        }

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
                const attraction = activeTarget.classList.contains('view-img') ? 0.04 : 0.12;

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

                if (target.classList.contains('view-img')) {
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
              .to('.hero-sub', { opacity: 1, duration: transitionTimings.heroSubDuration, stagger: 0.1, ease: "power3.out" }, "-=0.52")
              .to(
                  '#nav',
                  {
                      opacity: 1,
                      duration: transitionTimings.navDuration,
                      onComplete: () => {
                          if (typeof window !== 'undefined') {
                              window.__luminaLastRevealPathname = pathname;
                              window.dispatchEvent(new CustomEvent('lumina:page-reveal-complete', { detail: { pathname } }));
                          }
                      },
                  },
                  "-=0.5"
              );
        } else {
            gsap.set(preloaderRef.current, { yPercent: -100 });
            gsap.set('.loader-text', { y: '0%', opacity: 0 });
            gsap.set('.hero-img', { opacity: 1, scale: 1 });
            gsap.set('.hero-title', { y: '0%' });
            gsap.set('.hero-sub', { opacity: 1 });
            gsap.set('#nav', { opacity: 1 });

            if (typeof window !== 'undefined') {
                window.__luminaLastRevealPathname = pathname;
                window.dispatchEvent(new CustomEvent('lumina:page-reveal-complete', { detail: { pathname } }));
            }
        }

        hasPlayedInitialLoadRef.current = true;

        // Refresh ScrollTriggers for new page content
        ScrollTrigger.refresh();
        
        gsap.utils.toArray('.view-img img').forEach(img => {
            gsap.to(img, {
                yPercent: 20, ease: "none",
                scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true }
            });
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

    return (
        <>
            <div ref={cursorRef} id="cursor" aria-hidden="true" className={baseCursorClassName}>
                <span className="cursor-shell"></span>
                <span className="cursor-core"></span>
                <span ref={cursorLabelRef} className="cursor-label"></span>
            </div>

            <div ref={preloaderRef} id="preloader" className="fixed inset-0 z-[100] bg-[#1C1C1C] text-[#EFECE8] flex flex-col justify-center items-center">
                <div className="overflow-hidden"><h1 className="loader-text font-serif text-5xl md:text-7xl font-light tracking-widest uppercase translate-y-full">{loaderTitle}</h1></div>
                {loaderSub && <div className="overflow-hidden mt-6"><p className="loader-text font-sans text-xs md:text-sm tracking-[0.3em] uppercase opacity-0">{loaderSub}</p></div>}
            </div>

            <nav id="nav" className="fixed w-full flex justify-between items-center px-5 md:px-12 py-5 md:py-8 z-50 opacity-0 mix-blend-difference text-white">
                <a href="/" className="hover-target transition-link font-serif text-xl sm:text-2xl md:text-3xl leading-none font-medium tracking-[0.16em] md:tracking-widest uppercase whitespace-nowrap"><EditableText contentKey="shell.brand.name" fallback="The VA Store" editorLabel="Shell brand name" /></a>
                <div className="flex md:hidden items-center gap-3">
                    <button
                        type="button"
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-nav-panel"
                        aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        onClick={toggleMobileMenu}
                        className="hover-target relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white backdrop-blur-xl transition-colors hover:bg-white/16"
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
                            <span><EditableText contentKey="shell.nav.collections" fallback="Collections" editorLabel="Navigation Collections label" /></span>
                            <span className="text-white/30">+</span>
                        </a>
                    </div>
                    <a href="/spotlight" className="hover-target transition-link"><EditableText contentKey="shell.nav.spotlight" fallback="Spotlight" editorLabel="Navigation Spotlight label" /></a>
                    <a href="/account" className="hover-target transition-link"><EditableText contentKey="shell.nav.account" fallback="Account" editorLabel="Navigation Account label" /></a>
                    <a href="/contact" className="hover-target transition-link"><EditableText contentKey="shell.nav.contact" fallback="Contact" editorLabel="Navigation Contact label" /></a>
                    <a href="/cart" className="hover-target transition-link"><EditableText contentKey="shell.nav.cart" fallback="Cart" editorLabel="Navigation Cart label" /></a>
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
                                <p className="text-[10px] uppercase tracking-[0.28em] text-[#F1F1F1]/45"><EditableText contentKey="shell.collections_menu.eyebrow" fallback="Collections" editorLabel="Collections menu eyebrow" /></p>
                                <p className="mt-2 font-serif text-2xl font-light uppercase tracking-[0.08em] text-[#F1F1F1]"><EditableText contentKey="shell.collections_menu.title" fallback="By Category" editorLabel="Collections menu title" /></p>
                            </div>
                            <a href="/collections" className="hover-target transition-link text-[10px] uppercase tracking-[0.22em] text-[#F1F1F1]/62 transition-colors hover:text-[#F1F1F1]"><EditableText contentKey="shell.collections_menu.view_all" fallback="View All" editorLabel="Collections menu view all" /></a>
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
                <div id="mobile-nav-panel" className={`absolute inset-x-4 top-[5.75rem] overflow-hidden rounded-[2rem] border border-white/12 bg-[rgba(17,17,17,0.72)] p-5 text-[#EFECE8] shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40"><EditableText contentKey="shell.mobile_menu.eyebrow" fallback="Navigation" editorLabel="Mobile menu eyebrow" /></p>
                            <p className="mt-2 font-serif text-2xl font-light uppercase tracking-[0.08em]"><EditableText contentKey="shell.brand.name" fallback="The VA Store" editorLabel="Shell brand name" /></p>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/36"><EditableText contentKey="shell.mobile_menu.badge" fallback="Mobile" editorLabel="Mobile menu badge" /></p>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 text-[11px] uppercase tracking-[0.24em] font-medium">
                        <div className={`transition-all duration-300 ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '80ms' : '0ms' }}>
                            <button
                                type="button"
                                aria-expanded={isCollectionsSubmenuOpen}
                                onClick={() => setIsCollectionsSubmenuOpen((currentValue) => !currentValue)}
                                className="hover-target flex w-full items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-left text-white/88 transition-colors hover:bg-white/[0.08]"
                            >
                                <span><EditableText contentKey="shell.nav.collections" fallback="Collections" editorLabel="Navigation Collections label" /></span>
                                <span className={`text-white/26 transition-transform duration-300 ${isCollectionsSubmenuOpen ? 'rotate-45' : ''}`}>+</span>
                            </button>

                            <div className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ${isCollectionsSubmenuOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
                                <div className="min-h-0 flex flex-col gap-2 pl-4">
                                    <a href="/collections" onClick={handleMobileNavClose} className="hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-[10px] text-white/72 transition-colors hover:bg-white/[0.08]"><span><EditableText contentKey="shell.mobile_menu.view_all_collections" fallback="View All Collections" editorLabel="Mobile menu view all collections" /></span></a>
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

                        <a href="/spotlight" onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '130ms' : '0ms' }}><span><EditableText contentKey="shell.nav.spotlight" fallback="Spotlight" editorLabel="Navigation Spotlight label" /></span></a>
                        <a href="/account" onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '180ms' : '0ms' }}><span><EditableText contentKey="shell.nav.account" fallback="Account" editorLabel="Navigation Account label" /></span></a>
                        <a href="/contact" onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '230ms' : '0ms' }}><span><EditableText contentKey="shell.nav.contact" fallback="Contact" editorLabel="Navigation Contact label" /></span></a>
                        <a href="/cart" onClick={handleMobileNavClose} className={`hover-target transition-link flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '280ms' : '0ms' }}><span><EditableText contentKey="shell.nav.cart" fallback="Cart" editorLabel="Navigation Cart label" /></span></a>
                    </div>
                </div>
            </div>

            <div id="smooth-wrapper" className={`w-full min-h-screen relative z-10 bg-[#EFECE8] mb-[24rem] md:mb-[18rem] ${isUtilityRoute ? 'shadow-[0_16px_40px_rgba(0,0,0,0.18)]' : 'shadow-[0_20px_50px_rgba(0,0,0,0.3)]'}`}>
                <div id="smooth-content">
                    {children}
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 w-full h-[24rem] md:h-[18rem] z-0 bg-[#1C1C1C] text-[#EFECE8] px-5 md:px-8 xl:px-10 py-5">
                <div className="max-w-[1800px] mx-auto w-full h-full flex flex-col justify-between gap-4 md:gap-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[11px] uppercase tracking-[0.15em] font-medium md:[grid-template-columns:minmax(0,1.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.05fr)] md:gap-x-12 md:gap-y-8 md:text-xs">
                        <div className="col-span-2 flex max-w-sm flex-col gap-3 md:col-span-1 md:max-w-none">
                            <h3 className="font-serif text-3xl md:text-5xl font-light uppercase tracking-[0.18em] md:tracking-widest"><EditableText contentKey="shell.brand.name" fallback="The VA Store" editorLabel="Shell brand name" /></h3>
                            <p className="text-[11px] md:text-sm tracking-[0.2em] md:tracking-[0.24em] font-light uppercase text-white/70"><EditableText contentKey="shell.footer.slogan" fallback="Beautiful People Smile More" editorLabel="Footer slogan" /></p>
                            <p className="hidden md:block text-xs md:text-sm tracking-[0.2em] font-light uppercase text-white/50"><EditableText contentKey="shell.footer.brand_copy" fallback="Elevating traditional craftsmanship into avant-garde fashion." editorLabel="Footer brand copy" /></p>
                        </div>

                        <div className="flex flex-col">
                            <span className="mb-3 text-white/30"><EditableText contentKey="shell.footer.explore_title" fallback="Explore" editorLabel="Footer explore title" /></span>
                            <div className="flex flex-col gap-3">
                                <a href="/" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.home" fallback="Home" editorLabel="Footer Home label" /></a>
                                <a href="/collections" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.collections" fallback="Collections" editorLabel="Navigation Collections label" /></a>
                                <a href="/spotlight" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.spotlight" fallback="Spotlight" editorLabel="Navigation Spotlight label" /></a>
                            </div>
                        </div>

                        <div className="col-start-1 row-start-3 flex flex-col md:col-start-auto md:row-start-auto">
                            <span className="mb-3 text-white/30"><EditableText contentKey="shell.footer.client_title" fallback="Client" editorLabel="Footer client title" /></span>
                            <div className="flex flex-col gap-3">
                                <a href="/account" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.account" fallback="Account" editorLabel="Navigation Account label" /></a>
                                <a href="/cart" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.nav.cart" fallback="Cart" editorLabel="Navigation Cart label" /></a>
                                <a href="/contact" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.contact_form" fallback="Contact Form" editorLabel="Footer contact form label" /></a>
                                <a href="mailto:sales@stylingbyva.com" className="hover-target hover:text-white/70 transition-colors normal-case tracking-normal text-sm">sales@stylingbyva.com</a>
                            </div>
                        </div>

                        <div className="col-start-2 row-start-2 row-span-2 flex flex-col border-l border-white/10 pl-4 text-right md:col-span-1 md:col-start-auto md:row-start-auto md:row-span-1 md:pl-6 md:text-left">
                            <span className="mb-3 text-white/30"><EditableText contentKey="shell.footer.atelier_title" fallback="Atelier" editorLabel="Footer atelier title" /></span>
                            <div className="flex h-full flex-col gap-2.5 normal-case tracking-normal text-sm font-normal text-white/55 md:h-auto">
                                <p className="text-white/70"><EditableText contentKey="shell.footer.location" fallback="Ruse, Bulgaria" editorLabel="Footer location" /></p>
                                <p><EditableText contentKey="shell.footer.atelier_name" fallback="Styling by VA Atelier" editorLabel="Footer atelier name" /></p>
                                <p className="hidden md:block"><EditableText contentKey="shell.footer.atelier_copy" fallback="Editorial spotlight and personal support for signature pieces" editorLabel="Footer atelier copy" /></p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 border-t border-white/10 pt-4 text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/40 md:flex md:items-center md:justify-between">
                        <p className="text-center md:text-left"><EditableText contentKey="shell.footer.copyright" fallback="© 2026 The VA Store." editorLabel="Footer copyright" /></p>
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center md:justify-start">
                                <a href="/privacy-policy" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.privacy_policy" fallback="Privacy Policy" editorLabel="Footer privacy policy label" /></a>
                                <a href="/cookie-policy" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.cookie_policy" fallback="Cookie Policy" editorLabel="Footer cookie policy label" /></a>
                                <a href="https://www.instagram.com/va.storeofficial/" target="_blank" rel="noreferrer" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.social.instagram" fallback="Instagram" editorLabel="Footer Instagram label" /></a>
                                <a href="https://www.facebook.com/profile.php?id=61584052437151" target="_blank" rel="noreferrer" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.social.facebook" fallback="Facebook" editorLabel="Footer Facebook label" /></a>
                                <a href="https://www.tiktok.com/@2hotbyva" target="_blank" rel="noreferrer" className="hover-target transition-link hover:text-white/70 transition-colors"><EditableText contentKey="shell.footer.social.tiktok" fallback="TikTok" editorLabel="Footer TikTok label" /></a>
                        </div>
                        <div className="mx-auto flex items-center justify-center gap-3 md:mx-0">
                            <span className="text-white/34"><EditableText contentKey="shell.footer.page_motion" fallback="Page Motion" editorLabel="Footer page motion label" /></span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={hasMounted ? isPageMotionEnabled : true}
                                aria-label={hasMounted && !isPageMotionEnabled ? 'Turn page motion on' : 'Turn page motion off'}
                                onClick={togglePageMotion}
                                className="hover-target inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-white/72 transition-colors hover:bg-white/[0.08]"
                            >
                                <span className={`flex h-5 w-10 items-center rounded-full border border-white/10 px-1 transition-colors ${hasMounted && isPageMotionEnabled ? 'justify-end bg-white/12' : 'justify-start bg-transparent'}`}>
                                    <span className={`h-3 w-3 rounded-full transition-colors ${hasMounted && isPageMotionEnabled ? 'bg-[#EFECE8]' : 'bg-white/42'}`}></span>
                                </span>
                                <span suppressHydrationWarning>{hasMounted && !isPageMotionEnabled ? 'Off' : 'On'}</span>
                            </button>
                        </div>
                        <p className="hover-target text-center md:text-right"><EditableText contentKey="shell.footer.credits" fallback="Crafted by Victoria" editorLabel="Footer credits" /></p>
                    </div>
                </div>
            </footer>

            <div id="cart-container" className="fixed inset-0 z-[200] invisible flex justify-end overflow-hidden">
            <div onClick={() => setIsCartOpen(false)} className="cart-overlay absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-md opacity-0 cursor-pointer"></div>
                <div className="cart-panel relative w-full md:w-[30vw] h-full bg-[#EFECE8] translate-x-full flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-8 md:p-12 border-b border-[#1C1C1C]/10"><h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest"><EditableText contentKey="shell.cart_drawer.title" fallback="Cart" editorLabel="Cart drawer title" /></h2><button onClick={() => setIsCartOpen(false)} className="hover-target text-xs uppercase tracking-widest font-medium"><EditableText contentKey="shell.cart_drawer.close" fallback="Close" editorLabel="Cart drawer close" /></button></div>
                <div data-lenis-prevent-wheel className="flex-1 p-8 md:p-12 flex flex-col gap-8 overflow-y-auto overscroll-contain">
                    {cartItems.length === 0 ? (
                        <p className="text-sm uppercase tracking-widest text-gray-500"><EditableText contentKey="shell.cart_drawer.empty" fallback="Your cart is empty." editorLabel="Cart drawer empty state" /></p>
                    ) : (
                        cartItems.map((item, i) => {
                            const customMeasurementSummary = formatCustomMeasurementSummary(item);

                            return (
                            <div key={i} className="flex gap-6 items-center group">
                                <img src={item.image_main} className="w-20 h-28 object-cover rounded-sm" alt={item.name} />
                                <div className="flex flex-col flex-1 gap-2">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-sans text-xs uppercase tracking-widest font-medium">{item.name}</h3>
                                        <button onClick={() => removeFromCart(i)} className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-[#1C1C1C] transition-colors">Remove</button>
                                    </div>
                                    <p className="font-sans text-sm font-medium">€{Number(item.price).toFixed(2)}</p>
                                    {(item.selected_size || item.selected_tone) && (
                                        <div className="flex flex-wrap gap-2 pt-1 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/48">
                                            {item.selected_size && <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">Size {item.selected_size}</span>}
                                            {item.selected_tone && <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">Tone {item.selected_tone}</span>}
                                        </div>
                                    )}
                                    {customMeasurementSummary && (
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">Custom {customMeasurementSummary}</p>
                                    )}
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>
                <div className="p-8 md:p-12 border-t border-[#1C1C1C]/10 bg-[#EFECE8]">
                    <div className="flex justify-between items-center mb-8 font-medium uppercase tracking-widest text-xs"><span><EditableText contentKey="shell.cart_drawer.total" fallback="Total" editorLabel="Cart drawer total label" /></span><span className="text-sm">€{cartTotal.toFixed(2)}</span></div>
                    <p className="mb-6 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/50"><EditableText contentKey={cartPersistenceMode === 'supabase' ? 'shell.cart_drawer.note.synced' : 'shell.cart_drawer.note.local'} fallback={drawerNote} editorLabel="Cart drawer note" /></p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a href={drawerPrimaryHref} onClick={() => setIsCartOpen(false)} className="hover-target transition-link w-full py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center transition-colors hover:bg-black"><EditableText contentKey={cartItems.length === 0 ? 'shell.cart_drawer.primary.explore' : 'shell.cart_drawer.primary.view_cart'} fallback={drawerPrimaryLabel} editorLabel="Cart drawer primary button" /></a>
                        <button onClick={() => setIsCartOpen(false)} className="hover-target w-full py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium transition-colors hover:border-[#1C1C1C]/25 hover:bg-white/50"><EditableText contentKey="shell.cart_drawer.continue" fallback="Continue Shopping" editorLabel="Cart drawer continue shopping" /></button>
                    </div>
                </div>
                </div>
            </div>
        </>
    );
}