"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

export default function ClientEngine({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [cartOpen, setCartOpen] = useState(false);
    
    // Dynamically set cinematic loader text based on the route
    let loaderTitle = "The VA Store";
    let loaderSub = "Bespoke Macramé • VICTORIA";
    if (pathname === '/collections') {
        loaderTitle = "Collections";
        loaderSub = null;
    } else if (pathname === '/product') {
        loaderTitle = "Aura Vest";
        loaderSub = null;
    }

    const lenisRef = useRef(null);
    const cursorRef = useRef(null);
    const preloaderRef = useRef(null);

    useGSAP(() => {
        // --- 1. Lenis Smooth Scroll ---
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
        });
        lenisRef.current = lenis;

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);

        // --- 2. Advanced Custom Cursor ---
        const cursor = cursorRef.current;
        const onMouseMove = (e) => {
            gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
        };
        window.addEventListener('mousemove', onMouseMove);

        // Event delegation for hover states
        const onMouseOver = (e) => {
            const target = e.target.closest('.hover-target');
            if (target) {
                if (target.classList.contains('view-img')) {
                    cursor.classList.add('view-mode');
                    cursor.innerText = target.getAttribute('data-cursor-text') || 'View';
                    gsap.to(cursor, { '--tw-text-opacity': '1', duration: 0.3 });
                } else {
                    cursor.classList.add('hovered');
                }
            }
        };
        const onMouseOut = (e) => {
            const target = e.target.closest('.hover-target');
            if (target) {
                cursor.className = 'hidden md:flex fixed top-0 left-0 w-3 h-3 bg-[#1C1C1C] rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-[width,height,background-color] duration-300 ease-out justify-center items-center text-white text-[10px] uppercase tracking-widest font-medium text-opacity-0';
                cursor.innerText = '';
                gsap.to(cursor, { '--tw-text-opacity': '0', duration: 0.3 });
            }
        };

        document.addEventListener('mouseover', onMouseOver);
        document.addEventListener('mouseout', onMouseOut);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseover', onMouseOver);
            document.removeEventListener('mouseout', onMouseOut);
            lenis.destroy();
        };
    });

    // --- 3. Page Load & Scroll Animations (Triggers on Route Change) ---
    useGSAP(() => {
        // Initial Reveal Wipe
        const tl = gsap.timeline();
        tl.to('.loader-text', { y: '0%', opacity: 1, duration: 1.5, stagger: 0.2, ease: "power4.out", delay: 0.2 })
          .to('.loader-text', { y: '-100%', opacity: 0, duration: 1, stagger: 0.1, ease: "power4.in", delay: 0.8 })
          .to(preloaderRef.current, { yPercent: -100, duration: 1.2, ease: "power4.inOut" })
          .to('.hero-img', { opacity: 1, scale: 1, duration: 2, ease: "power3.out" }, "-=0.8")
          .to('.hero-title', { y: '0%', duration: 1.5, stagger: 0.1, ease: "power4.out" }, "-=1.5")
          .to('.hero-sub', { opacity: 1, duration: 1.5, stagger: 0.2, ease: "power3.out" }, "-=1")
          .to('#nav', { opacity: 1, duration: 1.5 }, "-=1.2");

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
        const handleLinkClick = (e) => {
            const link = e.target.closest('.transition-link');
            if (link) {
                e.preventDefault();
                const url = link.getAttribute('href');
                if (pathname === url) return;
                
                gsap.set('.loader-text', { opacity: 0 });
                gsap.to(preloaderRef.current, { 
                    yPercent: 0, duration: 1, ease: "power4.inOut", 
                    onComplete: () => router.push(url)
                });
            }
        };
        document.addEventListener('click', handleLinkClick);
        return () => document.removeEventListener('click', handleLinkClick);
    }, [pathname, router]);

    // --- 5. Cart Toggle Animation ---
    useEffect(() => {
        if (cartOpen) {
            lenisRef.current?.stop();
            gsap.to('#cart-container', { autoAlpha: 1, duration: 0.01 });
            gsap.to('.cart-overlay', { opacity: 1, duration: 0.4, ease: "power2.out" });
            gsap.to('.cart-panel', { x: '0%', duration: 0.6, ease: "power3.inOut" });
        } else {
            gsap.to('.cart-panel', { x: '100%', duration: 0.5, ease: "power3.in" });
            gsap.to('.cart-overlay', { opacity: 0, duration: 0.4, ease: "power2.in" });
            gsap.to('#cart-container', { autoAlpha: 0, duration: 0.01, delay: 0.5 });
            lenisRef.current?.start();
        }
    }, [cartOpen]);

    return (
        <>
            <div ref={cursorRef} id="cursor" className="hidden md:flex fixed top-0 left-0 w-3 h-3 bg-[#1C1C1C] rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-[width,height,background-color] duration-300 ease-out justify-center items-center text-white text-[10px] uppercase tracking-widest font-medium text-opacity-0"></div>

            <div ref={preloaderRef} id="preloader" className="fixed inset-0 z-[100] bg-[#1C1C1C] text-[#EFECE8] flex flex-col justify-center items-center">
                <div className="overflow-hidden"><h1 className="loader-text font-serif text-5xl md:text-7xl font-light tracking-widest uppercase translate-y-full">{loaderTitle}</h1></div>
                {loaderSub && <div className="overflow-hidden mt-6"><p className="loader-text font-sans text-xs md:text-sm tracking-[0.3em] uppercase opacity-0">{loaderSub}</p></div>}
            </div>

            <nav id="nav" className="fixed w-full flex justify-between items-center px-6 md:px-12 py-8 z-50 opacity-0 mix-blend-difference text-white">
                <a href="/" className="hover-target transition-link font-serif text-xl md:text-2xl font-medium tracking-widest uppercase">The VA Store</a>
                <div className="hidden md:flex gap-12 text-xs uppercase tracking-[0.2em] font-medium">
                    <a href="/collections" className="hover-target transition-link">Collections</a>
                    <span className="hover-target">Bespoke</span>
                    <span className="hover-target cursor-pointer" onClick={() => setCartOpen(true)}>Cart (1) €</span>
                </div>
            </nav>

            {/* Wrap the page content in the sticky footer reveal layout */}
            <div id="smooth-wrapper" className="w-full min-h-screen relative z-10 bg-[#EFECE8] mb-[70vh] md:mb-[60vh] shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                <div id="smooth-content">
                    {children}
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 w-full h-[70vh] md:h-[60vh] z-0 bg-[#1C1C1C] text-[#EFECE8] flex flex-col justify-between pt-24 px-6 md:px-12 pb-8">
                <div className="flex flex-col md:flex-row justify-between items-start gap-16 md:gap-0 max-w-[1800px] mx-auto w-full">
                    <div className="flex flex-col gap-6"><h3 className="font-serif text-4xl md:text-5xl font-light uppercase tracking-widest">The VA Store</h3><p className="text-xs md:text-sm tracking-[0.2em] font-light uppercase text-white/50 max-w-sm">Elevating traditional craftsmanship into avant-garde fashion.</p></div>
                    <div className="flex gap-16 md:gap-32 text-xs uppercase tracking-[0.15em] font-medium">
                        <div className="flex flex-col gap-6"><span className="text-white/30 mb-2">Explore</span><a href="/" className="hover-target transition-link hover:text-white/70 transition-colors">Home</a><a href="/collections" className="hover-target transition-link hover:text-white/70 transition-colors">Collections</a><a href="#" className="hover-target hover:text-white/70 transition-colors">Bespoke</a></div>
                        <div className="flex flex-col gap-6"><span className="text-white/30 mb-2">Connect</span><a href="#" className="hover-target hover:text-white/70 transition-colors">Instagram</a><a href="#" className="hover-target hover:text-white/70 transition-colors">Pinterest</a></div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center border-t border-white/10 pt-8 text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/40 max-w-[1800px] mx-auto w-full"><p>&copy; 2026 The VA Store.</p><p className="mt-4 md:mt-0 hover-target">Crafted in Sofia, BG</p></div>
            </footer>

            <div id="cart-container" className="fixed inset-0 z-[200] invisible flex justify-end">
                <div onClick={() => setCartOpen(false)} className="cart-overlay absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-md opacity-0 cursor-pointer"></div>
                <div className="cart-panel relative w-full md:w-[30vw] h-full bg-[#EFECE8] translate-x-full flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center p-8 md:p-12 border-b border-[#1C1C1C]/10"><h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest">Cart</h2><button onClick={() => setCartOpen(false)} className="hover-target text-xs uppercase tracking-widest font-medium">Close</button></div>
                    <div className="flex-1 p-8 md:p-12 flex flex-col gap-8 overflow-y-auto"><div className="flex gap-6 items-center group"><img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=300&auto=format&fit=crop" className="w-20 h-28 object-cover rounded-sm" alt="Aura Vest" /><div className="flex flex-col flex-1 gap-2"><div className="flex justify-between items-start"><h3 className="font-sans text-xs uppercase tracking-widest font-medium">Aura Vest</h3><button className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-[#1C1C1C] transition-colors">Remove</button></div><p className="font-sans text-sm font-medium">€450</p></div></div></div>
                    <div className="p-8 md:p-12 border-t border-[#1C1C1C]/10 bg-[#EFECE8]"><div className="flex justify-between items-center mb-8 font-medium uppercase tracking-widest text-xs"><span>Total</span><span className="text-sm">€450</span></div><button className="w-full py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover-target transition-colors hover:bg-black">Checkout</button></div>
                </div>
            </div>
        </>
    );
}