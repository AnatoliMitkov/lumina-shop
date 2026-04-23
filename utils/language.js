export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'bg'];
export const LANGUAGE_STORAGE_KEY = 'lumina-language';
export const LANGUAGE_COOKIE_KEY = 'lumina-language';
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function createLocalizedValue(englishValue, bulgarianValue) {
  return {
    en: englishValue,
    bg: bulgarianValue,
  };
}

export function normalizeLanguage(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  const [baseLanguage] = normalizedValue.split(/[-_]/);

  return SUPPORTED_LANGUAGES.includes(baseLanguage) ? baseLanguage : null;
}

export function isLocalizedValueMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const valueKeys = Object.keys(value);

  return valueKeys.length > 0 && valueKeys.every((key) => Boolean(normalizeLanguage(key)));
}

export function resolveLocalizedValue(value, language = DEFAULT_LANGUAGE) {
  if (!isLocalizedValueMap(value)) {
    return value;
  }

  const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
  const localizedEntry = Object.entries(value).find(([key]) => normalizeLanguage(key) === normalizedLanguage);

  if (localizedEntry) {
    return localizedEntry[1];
  }

  const defaultEntry = Object.entries(value).find(([key]) => normalizeLanguage(key) === DEFAULT_LANGUAGE);

  if (defaultEntry) {
    return defaultEntry[1];
  }

  return Object.values(value)[0];
}

export function detectPreferredLanguageFromList(values = []) {
  for (const value of values) {
    const normalizedLanguage = normalizeLanguage(value);

    if (normalizedLanguage) {
      return normalizedLanguage;
    }
  }

  return null;
}

export function detectPreferredLanguageFromHeader(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const candidates = value
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter(Boolean);

  return detectPreferredLanguageFromList(candidates);
}

export function getCookieLanguage(cookieSource) {
  const cookieKeyPrefix = `${LANGUAGE_COOKIE_KEY}=`;

  if (typeof cookieSource === 'string') {
    const cookieParts = cookieSource.split(';').map((part) => part.trim());
    const cookieMatch = cookieParts.find((part) => part.startsWith(cookieKeyPrefix));

    if (!cookieMatch) {
      return null;
    }

    return normalizeLanguage(decodeURIComponent(cookieMatch.slice(cookieKeyPrefix.length)));
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return getCookieLanguage(document.cookie || '');
}

export function getStoredLanguage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getInitialWindowLanguage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return normalizeLanguage(window.__luminaInitialLanguage);
}

export function getBrowserLanguages() {
  if (typeof navigator === 'undefined') {
    return [];
  }

  const preferredLanguages = Array.isArray(navigator.languages) ? navigator.languages : [];

  return [navigator.language, ...preferredLanguages].filter(Boolean);
}

export function detectPreferredLanguage() {
  return getInitialWindowLanguage()
    || getCookieLanguage()
    || getStoredLanguage()
    || detectPreferredLanguageFromList(getBrowserLanguages())
    || DEFAULT_LANGUAGE;
}

export function persistLanguagePreference(language) {
  const normalizedLanguage = normalizeLanguage(language);

  if (!normalizedLanguage || typeof window === 'undefined') {
    return normalizedLanguage;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
  } catch {
    return normalizedLanguage;
  }

  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${encodeURIComponent(normalizedLanguage)}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    return normalizedLanguage;
  }

  window.__luminaInitialLanguage = normalizedLanguage;

  return normalizedLanguage;
}

export function syncDocumentLanguage(language) {
  const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizedLanguage;
  }

  if (typeof window !== 'undefined') {
    window.__luminaInitialLanguage = normalizedLanguage;
  }

  return normalizedLanguage;
}