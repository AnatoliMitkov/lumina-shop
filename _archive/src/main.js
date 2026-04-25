import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// --- 1. Smooth Scroll Setup (Lenis) ---
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Sync Lenis with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);

// --- 2. Advanced Custom Cursor Logic ---
const cursor = document.getElementById('cursor');
const hoverTargets = document.querySelectorAll('.hover-target');

window.addEventListener('mousemove', (e) => {
    gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
});

hoverTargets.forEach(target => {
    target.addEventListener('mouseenter', () => {
        if(target.classList.contains('view-img')) {
            cursor.classList.add('view-mode');
            cursor.innerText = target.getAttribute('data-cursor-text') || 'View';
            gsap.to(cursor, { textOpacity: 1, duration: 0.3 });
        } else {
            cursor.classList.add('hovered');
        }
    });
    
    target.addEventListener('mouseleave', () => {
        cursor.className = 'hidden md:flex fixed top-0 left-0 w-3 h-3 bg-[#1C1C1C] rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-[width,height,background-color] duration-300 ease-out justify-center items-center text-white text-[10px] uppercase tracking-widest font-medium text-opacity-0';
        cursor.innerText = '';
    });
});

// --- 3. Cinematic Preloader Sequence ---
const tl = gsap.timeline();

tl.to('.loader-text', { y: '0%', opacity: 1, duration: 1.5, stagger: 0.2, ease: "power4.out", delay: 0.2 })
  .to('.loader-text', { y: '-100%', opacity: 0, duration: 1, stagger: 0.1, ease: "power4.in", delay: 0.8 })
  .to('#preloader', { yPercent: -100, duration: 1.2, ease: "power4.inOut" })
  // Scale hero image down from zoom
  .to('.hero-img', { opacity: 1, scale: 1, duration: 2, ease: "power3.out" }, "-=0.8")
  .to('.hero-title', { y: '0%', duration: 1.5, stagger: 0.1, ease: "power4.out" }, "-=1.5")
  .to('.hero-sub', { opacity: 1, duration: 1.5, stagger: 0.2, ease: "power3.out" }, "-=1")
  .to('#nav', { opacity: 1, duration: 1.5 }, "-=1.2")
  .call(() => document.body.style.overflowY = 'auto'); // Enable scroll after load

// --- 4. Page Transition Interceptor ---
document.querySelectorAll('.transition-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); // Stop instant browser redirect
        const targetUrl = link.getAttribute('href');
        
        // Hide the loader text and slide the black curtain down
        gsap.set('.loader-text', { opacity: 0 });
        gsap.to('#preloader', { 
            yPercent: 0, 
            duration: 1, 
            ease: "power4.inOut", 
            onComplete: () => window.location.href = targetUrl 
        });
    });
});

// --- 5. Scroll Parallax Animations ---
// Subtly move the main hero image up as you scroll down
if (document.querySelector('.hero-img')) {
    gsap.to('.hero-img', {
        yPercent: 15,
        ease: "none",
        scrollTrigger: {
            trigger: "#smooth-content",
            start: "top top",
            end: "bottom top",
            scrub: true
        }
    });
}

// Add parallax depth to the editorial grid images
gsap.utils.toArray('.view-img img').forEach(img => {
    gsap.fromTo(img,
        { yPercent: -8 },
        {
            yPercent: 8,
            ease: "none",
            scrollTrigger: {
                trigger: img.parentElement,
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        }
    );
});

// --- 6. Scroll Text Reveal ---
gsap.utils.toArray('.reveal-text').forEach(text => {
    gsap.to(text, {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
            trigger: text,
            start: "top 90%",
        }
    });
});

// --- 7. Shopping Cart Sidebar ---
const cartTl = gsap.timeline({ paused: true });

cartTl.to('#cart-container', { autoAlpha: 1, duration: 0.01 }) // Makes it visible
      .to('.cart-overlay', { opacity: 1, duration: 0.4, ease: "power2.out" }, 0)
      .to('.cart-panel', { x: '0%', duration: 0.6, ease: "power3.inOut" }, 0);

document.querySelectorAll('.cart-open').forEach(btn => {
    btn.addEventListener('click', () => {
        cartTl.play();
        lenis.stop(); // Lock the background scroll
    });
});

document.querySelectorAll('.cart-close, .cart-overlay').forEach(btn => {
    btn.addEventListener('click', () => {
        cartTl.reverse();
        lenis.start(); // Unlock the background scroll
    });
});

// --- 8. Interactive Accordions ---
document.querySelectorAll('.accordion-item').forEach(item => {
    const header = item.querySelector('.accordion-header');
    const content = item.querySelector('.accordion-content');
    const icon = item.querySelector('.accordion-icon');
    let isOpen = false;

    header.addEventListener('click', () => {
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