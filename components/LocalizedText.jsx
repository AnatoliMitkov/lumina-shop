"use client";

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, normalizeLanguage, resolveLocalizedValue } from '../utils/language';

export default function LocalizedText({ value, language }) {
    const { i18n } = useTranslation();
    const [hasHydrated, setHasHydrated] = useState(false);
    const initialLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    const runtimeLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
    const activeLanguage = hasHydrated
        ? (runtimeLanguage || initialLanguage)
        : initialLanguage;

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    return <span suppressHydrationWarning>{resolveLocalizedValue(value, activeLanguage)}</span>;
}