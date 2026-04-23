import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import bg from './locales/bg.json';
import {
  DEFAULT_LANGUAGE,
  detectPreferredLanguage,
  persistLanguagePreference,
  SUPPORTED_LANGUAGES,
  syncDocumentLanguage,
} from './utils/language';

export {
  DEFAULT_LANGUAGE,
  detectPreferredLanguage,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_COOKIE_MAX_AGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  persistLanguagePreference,
  SUPPORTED_LANGUAGES,
  syncDocumentLanguage,
} from './utils/language';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bg: { translation: bg },
    },
    lng: detectPreferredLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
  });

export function applyPreferredLanguage() {
  const preferredLanguage = detectPreferredLanguage();

  syncDocumentLanguage(preferredLanguage);

  if (i18n.language !== preferredLanguage) {
    void i18n.changeLanguage(preferredLanguage);
  }

  return preferredLanguage;
}

export function changeSiteLanguage(language) {
  const nextLanguage = persistLanguagePreference(language) || DEFAULT_LANGUAGE;

  syncDocumentLanguage(nextLanguage);

  if (i18n.language === nextLanguage) {
    return Promise.resolve(nextLanguage);
  }

  return i18n.changeLanguage(nextLanguage);
}

export default i18n;
