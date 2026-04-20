"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import { useCart } from './CartProvider';
import { formatCustomMeasurementSummary } from '../utils/cart';

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

export default function ClientEngine({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { cartItems, removeFromCart, cartTotal, isCartOpen, setIsCartOpen, cartPersistenceMode } = useCart();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isPageMotionEnabled, setIsPageMotionEnabled] = useState(() => resolvePageMotionEnabled());
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
    }, [pathname]);

    useEffect(() => {
        const nextMotionEnabled = resolvePageMotionEnabled();

        setHasMounted(true);
        setIsPageMotionEnabled(nextMotionEnabled);
        syncPageMotionAttribute(nextMotionEnabled);
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

        setIsMobileMenuOpen((currentValue) => !currentValue);
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
            return Math.max(60, Math.min(136, Math.round((trimmedLabel.length * 6.6) + 28)));
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
                <a href="/" className="hover-target transition-link font-serif text-xl sm:text-2xl md:text-3xl leading-none font-medium tracking-[0.16em] md:tracking-widest uppercase whitespace-nowrap">The VA Store</a>
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
                        {cartItems.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-[9px] font-medium tracking-normal text-[#111111]">{cartItems.length}</span>}
                    </button>
                </div>
                <div className="hidden md:flex gap-10 text-sm md:text-base uppercase tracking-[0.2em] font-medium">
                    <a href="/collections" className="hover-target transition-link">Collections</a>
                    <a href="/spotlight" className="hover-target transition-link">Spotlight</a>
                    <a href="/account" className="hover-target transition-link">Account</a>
                    <a href="/contact" className="hover-target transition-link">Contact</a>
                    <a href="/cart" className="hover-target transition-link">Cart ({cartItems.length})</a>
                </div>
            </nav>

            <div className={`fixed inset-0 z-[120] md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <div onClick={() => setIsMobileMenuOpen(false)} className={`absolute inset-0 bg-[#1C1C1C]/42 backdrop-blur-xl transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}></div>
                <div id="mobile-nav-panel" className={`absolute inset-x-4 top-[5.75rem] overflow-hidden rounded-[2rem] border border-white/12 bg-[rgba(17,17,17,0.72)] p-5 text-[#EFECE8] shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Navigation</p>
                            <p className="mt-2 font-serif text-2xl font-light uppercase tracking-[0.08em]">The VA Store</p>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/36">Mobile</p>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 text-[11px] uppercase tracking-[0.24em] font-medium">
                        <a href="/collections" onClick={() => setIsMobileMenuOpen(false)} className={`hover-target transition-link flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '80ms' : '0ms' }}><span>Collections</span><span className="text-white/26">01</span></a>
                        <a href="/spotlight" onClick={() => setIsMobileMenuOpen(false)} className={`hover-target transition-link flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '130ms' : '0ms' }}><span>Spotlight</span><span className="text-white/26">02</span></a>
                        <a href="/account" onClick={() => setIsMobileMenuOpen(false)} className={`hover-target transition-link flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '180ms' : '0ms' }}><span>Account</span><span className="text-white/26">03</span></a>
                        <a href="/contact" onClick={() => setIsMobileMenuOpen(false)} className={`hover-target transition-link flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '230ms' : '0ms' }}><span>Contact</span><span className="text-white/26">04</span></a>
                        <a href="/cart" onClick={() => setIsMobileMenuOpen(false)} className={`hover-target transition-link flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/88 transition-all duration-300 hover:bg-white/[0.08] ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} style={{ transitionDelay: isMobileMenuOpen ? '280ms' : '0ms' }}><span>Cart</span><span className="text-white/26">{String(cartItems.length).padStart(2, '0')}</span></a>
                    </div>
                </div>
            </div>

            <div id="smooth-wrapper" className={`w-full min-h-screen relative z-10 bg-[#EFECE8] mb-[30rem] md:mb-[18rem] ${isUtilityRoute ? 'shadow-[0_16px_40px_rgba(0,0,0,0.18)]' : 'shadow-[0_20px_50px_rgba(0,0,0,0.3)]'}`}>
                <div id="smooth-content">
                    {children}
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 w-full h-[30rem] md:h-[18rem] z-0 bg-[#1C1C1C] text-[#EFECE8] px-6 md:px-8 xl:px-10 py-5">
                <div className="max-w-[1800px] mx-auto w-full h-full flex flex-col justify-between gap-5 md:gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-8 md:gap-x-16 md:gap-y-8 text-xs uppercase tracking-[0.15em] font-medium">
                        <div className="flex flex-col gap-4 max-w-sm">
                            <h3 className="font-serif text-4xl md:text-5xl font-light uppercase tracking-widest">The VA Store</h3>
                            <p className="text-xs md:text-sm tracking-[0.24em] font-light uppercase text-white/70">Beautiful People Smile More</p>
                            <p className="text-xs md:text-sm tracking-[0.2em] font-light uppercase text-white/50">Elevating traditional craftsmanship into avant-garde fashion.</p>
                        </div>

                        <div className="flex flex-col">
                            <span className="mb-4 text-white/30">Explore</span>
                            <div className="flex flex-col gap-4">
                                <a href="/" className="hover-target transition-link hover:text-white/70 transition-colors">Home</a>
                                <a href="/collections" className="hover-target transition-link hover:text-white/70 transition-colors">Collections</a>
                                <a href="/spotlight" className="hover-target transition-link hover:text-white/70 transition-colors">Spotlight</a>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="mb-4 text-white/30">Client</span>
                            <div className="flex flex-col gap-4">
                                <a href="/account" className="hover-target transition-link hover:text-white/70 transition-colors">Account</a>
                                <a href="/cart" className="hover-target transition-link hover:text-white/70 transition-colors">Cart</a>
                                <a href="/contact" className="hover-target transition-link hover:text-white/70 transition-colors">Contact Form</a>
                                <a href="mailto:sales@stylingbyva.com" className="hover-target hover:text-white/70 transition-colors normal-case tracking-normal text-sm">sales@stylingbyva.com</a>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="mb-4 text-white/30">Atelier</span>
                            <div className="flex flex-col gap-4 normal-case tracking-normal text-sm font-normal text-white/55">
                                <p className="text-white/70">Ruse, Bulgaria</p>
                                <p>Styling by VA Atelier</p>
                                <p>Editorial spotlight and personal support for signature pieces</p>
                            </div>
                        </div>
                    </div>

                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/10 pt-4 text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/40">
                        <p>&copy; 2026 The VA Store.</p>
                            <div className="flex items-center gap-3">
                                <span className="text-white/34">Page Motion</span>
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
                        <p className="hover-target">Crafted by Victoria</p>
                    </div>
                </div>
            </footer>

            <div id="cart-container" className="fixed inset-0 z-[200] invisible flex justify-end overflow-hidden">
            <div onClick={() => setIsCartOpen(false)} className="cart-overlay absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-md opacity-0 cursor-pointer"></div>
                <div className="cart-panel relative w-full md:w-[30vw] h-full bg-[#EFECE8] translate-x-full flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-8 md:p-12 border-b border-[#1C1C1C]/10"><h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest">Cart</h2><button onClick={() => setIsCartOpen(false)} className="hover-target text-xs uppercase tracking-widest font-medium">Close</button></div>
                <div data-lenis-prevent-wheel className="flex-1 p-8 md:p-12 flex flex-col gap-8 overflow-y-auto overscroll-contain">
                    {cartItems.length === 0 ? (
                        <p className="text-sm uppercase tracking-widest text-gray-500">Your cart is empty.</p>
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
                    <div className="flex justify-between items-center mb-8 font-medium uppercase tracking-widest text-xs"><span>Total</span><span className="text-sm">€{cartTotal.toFixed(2)}</span></div>
                    <p className="mb-6 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/50">{drawerNote}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a href={drawerPrimaryHref} onClick={() => setIsCartOpen(false)} className="hover-target transition-link w-full py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center transition-colors hover:bg-black">{drawerPrimaryLabel}</a>
                        <button onClick={() => setIsCartOpen(false)} className="hover-target w-full py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium transition-colors hover:border-[#1C1C1C]/25 hover:bg-white/50">Continue Shopping</button>
                    </div>
                </div>
                </div>
            </div>
        </>
    );
}