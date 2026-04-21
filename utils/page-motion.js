export const PAGE_MOTION_STORAGE_KEY = 'lumina-page-motion';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const PAGE_MOTION_CHANGE_EVENT = 'lumina:page-motion-change';
export const PAGE_REVEAL_COMPLETE_EVENT = 'lumina:page-reveal-complete';

export function resolvePageMotionEnabled() {
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

export function dispatchPageMotionChange(isEnabled) {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(PAGE_MOTION_CHANGE_EVENT, {
        detail: {
            isEnabled,
        },
    }));
}

export function dispatchPageRevealComplete(pathname) {
    if (typeof window === 'undefined') {
        return;
    }

    window.__luminaLastRevealPathname = pathname;
    window.dispatchEvent(new CustomEvent(PAGE_REVEAL_COMPLETE_EVENT, {
        detail: {
            pathname,
        },
    }));
}