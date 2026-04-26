"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CREATOR_PROGRAM_BRAND_NAME } from '../utils/creator-program';
import { COLLABORATION_PATH } from '../utils/site-routes';

const DISMISS_STORAGE_KEY = 'lumina-creator-program-popup-dismissed-at';
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const POPUP_DELAY_MS = 20 * 1000;

function hasActiveDismissal() {
    if (typeof window === 'undefined') {
        return true;
    }

    const storedValue = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    const dismissedAt = Number.parseInt(storedValue || '', 10);

    if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) {
        return false;
    }

    return Date.now() - dismissedAt < DISMISS_WINDOW_MS;
}

export default function CreatorProgramPopup({ pathname = '/', onOpenChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const shouldSkipRoute = useMemo(
        () => pathname === COLLABORATION_PATH || pathname === '/admin' || pathname === '/checkout',
        [pathname]
    );

    useEffect(() => {
        onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);

    useEffect(() => {
        if (shouldSkipRoute || hasActiveDismissal()) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            if (!hasActiveDismissal()) {
                setIsOpen(true);
            }
        }, POPUP_DELAY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [shouldSkipRoute]);

    useEffect(() => {
        if (shouldSkipRoute) {
            setIsOpen(false);
        }
    }, [shouldSkipRoute]);

    const handleClose = () => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
        }

        setIsOpen(false);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[125] flex items-end justify-center bg-[rgba(12,10,8,0.42)] px-4 pb-4 pt-20 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="relative w-full max-w-[33rem] overflow-hidden rounded-[1.85rem] border border-white/55 bg-[linear-gradient(160deg,rgba(248,243,237,0.98)_0%,rgba(239,231,222,0.97)_100%)] p-6 text-[#181410] shadow-[0_30px_100px_rgba(0,0,0,0.28)] sm:p-8">
                <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,rgba(24,20,16,0)_0%,rgba(24,20,16,0.16)_50%,rgba(24,20,16,0)_100%)]"></div>
                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close creator program popup"
                    className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#181410]/10 bg-white/70 text-[#181410]/68 transition-colors hover:border-[#181410]/18 hover:text-[#181410]"
                >
                    <span aria-hidden="true" className="text-lg leading-none">x</span>
                </button>

                <div className="flex flex-col gap-5 pr-8">
                    <p className="text-[10px] uppercase tracking-[0.38em] text-[#181410]/48">{CREATOR_PROGRAM_BRAND_NAME} Creator Partnership</p>
                    <div className="flex flex-col gap-3">
                        <h2 className="font-serif text-[clamp(2rem,5vw,3.4rem)] font-light uppercase leading-[0.94] tracking-[-0.04em] text-[#181410]">
                            Want access to {CREATOR_PROGRAM_BRAND_NAME} pieces at creator pricing?
                        </h2>
                        <p className="max-w-[26rem] text-sm leading-relaxed text-[#181410]/72 sm:text-[0.96rem]">
                            Apply for the premium collaboration program and unlock creator pricing, affiliate upside, and long-term partnership potential.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-[#181410]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] uppercase tracking-[0.26em] text-[#181410]/46">Limited partnership intake</p>
                        <Link
                            href={COLLABORATION_PATH}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#181410] px-6 text-xs font-medium uppercase tracking-[0.28em] text-[#F7F1EA] transition-transform duration-200 hover:-translate-y-0.5"
                        >
                            Apply Now
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}