export const COOKIE_CONSENT_STORAGE_KEY = 'lumina-cookie-consent';
export const COOKIE_CONSENT_COOKIE_KEY = 'lumina-cookie-consent';
export const COOKIE_CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
export const COOKIE_CONSENT_UPDATED_EVENT = 'lumina:cookie-consent-updated';

function normalizeConsentShape(value = {}) {
  return {
    essential: true,
    analytics: Boolean(value?.analytics),
    version: 1,
    updatedAt: value?.updatedAt || new Date().toISOString(),
  };
}

export function createCookieConsentState({ analytics = false } = {}) {
  return normalizeConsentShape({ analytics });
}

export function parseCookieConsentValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue === 'all') {
    return createCookieConsentState({ analytics: true });
  }

  if (normalizedValue === 'necessary') {
    return createCookieConsentState({ analytics: false });
  }

  try {
    const parsedValue = JSON.parse(normalizedValue);

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return null;
    }

    return normalizeConsentShape(parsedValue);
  } catch {
    return null;
  }
}

export function readCookieConsentCookie(cookieSource) {
  const cookieKeyPrefix = `${COOKIE_CONSENT_COOKIE_KEY}=`;

  if (typeof cookieSource === 'string') {
    const cookieParts = cookieSource.split(';').map((part) => part.trim());
    const cookieMatch = cookieParts.find((part) => part.startsWith(cookieKeyPrefix));

    if (!cookieMatch) {
      return null;
    }

    return parseCookieConsentValue(decodeURIComponent(cookieMatch.slice(cookieKeyPrefix.length)));
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return readCookieConsentCookie(document.cookie || '');
}

export function readStoredCookieConsent() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    const parsedStoredValue = parseCookieConsentValue(storedValue || '');

    if (parsedStoredValue) {
      return parsedStoredValue;
    }
  } catch {
    // Ignore storage failures and fall back to the cookie value.
  }

  return readCookieConsentCookie();
}

export function persistCookieConsent(value = {}) {
  const normalizedValue = normalizeConsentShape(value);
  const serializedValue = JSON.stringify(normalizedValue);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, serializedValue);
    } catch {
      // Ignore storage failures and still write the cookie.
    }
  }

  if (typeof document !== 'undefined') {
    try {
      document.cookie = `${COOKIE_CONSENT_COOKIE_KEY}=${encodeURIComponent(serializedValue)}; path=/; max-age=${COOKIE_CONSENT_COOKIE_MAX_AGE}; SameSite=Lax`;
    } catch {
      // Ignore cookie write failures and keep the in-memory consent state.
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT, {
        detail: normalizedValue,
      }));
    } catch {
      // Ignore dispatch failures and keep the saved consent values.
    }
  }

  return normalizedValue;
}

export function hasCookieConsentDecision(value) {
  return Boolean(value && typeof value === 'object');
}

export function isAnalyticsConsentGranted(value) {
  return Boolean(value?.analytics);
}