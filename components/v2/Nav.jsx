"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '../CartProvider';

const NAV_LINKS = [
    { href: '/v2/collections', label: 'Collections' },
    { href: '/v2/cart', label: 'Cart' },
    { href: '/account', label: 'Account' },
    { href: '/contact', label: 'Contact' },
];

export default function Nav() {
    const pathname = usePathname();
    const { cartItems } = useCart();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Lock body scroll while mobile menu is open
    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileOpen]);

    return (
        <header className="v2-nav">
            <div className="v2-container h-full flex items-center justify-between gap-6">
                {/* Logo */}
                <a
                    href="/v2"
                    className="font-serif text-lg md:text-xl uppercase tracking-widest text-[#EFECE8] hover:text-[#D7B56D] transition-colors leading-none shrink-0"
                >
                    The VA Store
                </a>

                {/* Desktop navigation */}
                <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
                    {NAV_LINKS.map((link) => {
                        const isCart = link.href === '/v2/cart';
                        const label = isCart && hasMounted && cartCount > 0
                            ? `Cart (${cartCount})`
                            : link.label;
                        const isActive = pathname === link.href;

                        return (
                            <a
                                key={link.href}
                                href={link.href}
                                className={`v2-label transition-colors ${
                                    isActive
                                        ? 'text-[#EFECE8]'
                                        : 'text-[#EFECE8]/60 hover:text-[#EFECE8]'
                                }`}
                            >
                                {label}
                            </a>
                        );
                    })}
                </nav>

                {/* Mobile controls */}
                <div className="md:hidden flex items-center gap-3">
                    {/* Cart count pill */}
                    {hasMounted && cartCount > 0 && (
                        <a
                            href="/v2/cart"
                            className="v2-label text-[#EFECE8]/70 hover:text-[#EFECE8] transition-colors"
                            aria-label={`Cart, ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
                        >
                            Cart ({cartCount})
                        </a>
                    )}

                    {/* Hamburger */}
                    <button
                        type="button"
                        aria-expanded={isMobileOpen}
                        aria-controls="v2-mobile-nav"
                        aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
                        onClick={() => setIsMobileOpen((prev) => !prev)}
                        className="flex flex-col justify-center gap-[5px] w-10 h-10 shrink-0 text-[#EFECE8]"
                    >
                        <span
                            className={`block h-[1.5px] w-5 bg-current transition-all duration-200 origin-center ${
                                isMobileOpen ? 'rotate-45 translate-y-[6.5px]' : ''
                            }`}
                        />
                        <span
                            className={`block h-[1.5px] w-5 bg-current transition-all duration-200 ${
                                isMobileOpen ? 'opacity-0 scale-x-0' : ''
                            }`}
                        />
                        <span
                            className={`block h-[1.5px] w-5 bg-current transition-all duration-200 origin-center ${
                                isMobileOpen ? '-rotate-45 -translate-y-[6.5px]' : ''
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Mobile panel */}
            <div
                id="v2-mobile-nav"
                className={`md:hidden bg-[#1C1C1C] border-t border-[#EFECE8]/10 overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                    isMobileOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                }`}
                aria-hidden={!isMobileOpen}
            >
                <nav className="v2-container py-6 flex flex-col gap-1" aria-label="Mobile navigation">
                    {NAV_LINKS.map((link) => {
                        const isCart = link.href === '/v2/cart';
                        const label = isCart && hasMounted && cartCount > 0
                            ? `Cart (${cartCount})`
                            : link.label;
                        const isActive = pathname === link.href;

                        return (
                            <a
                                key={link.href}
                                href={link.href}
                                className={`v2-label py-3 border-b border-[#EFECE8]/10 transition-colors block ${
                                    isActive
                                        ? 'text-[#EFECE8]'
                                        : 'text-[#EFECE8]/60 hover:text-[#EFECE8]'
                                }`}
                            >
                                {label}
                            </a>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
