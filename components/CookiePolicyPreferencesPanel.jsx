"use client";

import { useEffect, useState } from 'react';
import {
    COOKIE_CONSENT_UPDATED_EVENT,
    createCookieConsentState,
    hasCookieConsentDecision,
    persistCookieConsent,
    readStoredCookieConsent,
} from '../utils/cookie-consent';
import {
    createLocalizedValue as localizedFallback,
    DEFAULT_LANGUAGE,
    normalizeLanguage,
    resolveLocalizedValue,
} from '../utils/language';

function ConsentSwitch({ label, description, checked, disabled = false, onChange, language }) {
    const getText = (value) => resolveLocalizedValue(value, language);

    return (
        <div className="rounded-[1.25rem] border border-[#1C1C1C]/10 bg-white/72 p-4 shadow-[0_10px_24px_rgba(92,75,67,0.08)]">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]">{getText(label)}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/62">{getText(description)}</p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={getText(label)}
                    disabled={disabled}
                    onClick={disabled ? undefined : onChange}
                    className={`inline-flex h-8 w-14 shrink-0 items-center rounded-full border px-1 transition-colors ${checked ? 'border-[#1C1C1C] bg-[#1C1C1C]' : 'border-[#1C1C1C]/12 bg-white'} ${disabled ? 'opacity-72' : 'hover:border-[#A78B65]'}`}
                >
                    <span className={`h-6 w-6 rounded-full transition-transform ${checked ? 'translate-x-6 bg-[#EFECE8]' : 'translate-x-0 bg-[#D7B56D]'}`}></span>
                </button>
            </div>
            {disabled ? (
                <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/44">
                    {getText(localizedFallback('Always on for core store features', 'Винаги е включено за основните функции на магазина'))}
                </p>
            ) : null}
        </div>
    );
}

export default function CookiePolicyPreferencesPanel({ language = DEFAULT_LANGUAGE }) {
    const resolvedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, resolvedLanguage);
    const [consent, setConsent] = useState(null);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const syncFromStoredConsent = (nextConsent = readStoredCookieConsent()) => {
            setConsent(nextConsent);
            setAnalyticsEnabled(Boolean(nextConsent?.analytics));
        };

        syncFromStoredConsent();

        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleConsentUpdated = (event) => {
            const nextConsent = event?.detail && typeof event.detail === 'object'
                ? createCookieConsentState({ analytics: Boolean(event.detail.analytics) })
                : readStoredCookieConsent();

            syncFromStoredConsent(nextConsent);
        };

        window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, handleConsentUpdated);

        return () => window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, handleConsentUpdated);
    }, []);

    const applyConsent = ({ analytics = false } = {}) => {
        const nextConsent = persistCookieConsent(createCookieConsentState({ analytics }));

        setConsent(nextConsent);
        setAnalyticsEnabled(Boolean(nextConsent.analytics));
        setFeedback(getText(localizedFallback('Saved for this browser. Changes apply immediately.', 'Запазено за този браузър. Промените се прилагат веднага.')));
    };

    const hasDecision = hasCookieConsentDecision(consent);
    const statusLabel = hasDecision
        ? analyticsEnabled
            ? localizedFallback('Analytics allowed', 'Анализът е разрешен')
            : localizedFallback('Necessary only', 'Само необходимите')
        : localizedFallback('No optional choice saved yet', 'Все още няма запазен избор за допълнителните бисквитки');

    return (
        <aside className="rounded-[1.8rem] border border-[#1C1C1C]/10 bg-[linear-gradient(145deg,rgba(255,249,242,0.96),rgba(248,237,223,0.9))] p-6 shadow-[0_22px_52px_rgba(92,75,67,0.12)] lg:sticky lg:top-32 md:p-8">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#5C4B43]/72">{getText(localizedFallback('Cookie controls', 'Контроли за бисквитки'))}</p>
            <h2 className="mt-3 font-serif text-3xl font-light uppercase leading-[0.92] tracking-[0.06em] text-[#1C1C1C] md:text-[2.3rem]">
                {getText(localizedFallback('Review your choices', 'Прегледай избора си'))}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/64 md:text-base">
                {getText(localizedFallback(
                    'If you want a second thought later, this page is where you can update the optional cookie setting without the storefront keeping a floating button on every page.',
                    'Ако по-късно искате да промените решението си, точно тук можете да обновите настройката за допълнителните бисквитки, без сайтът да пази плаващ бутон на всяка страница.'
                ))}
            </p>

            <div className="mt-5 rounded-[1.25rem] border border-[#1C1C1C]/10 bg-white/65 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#5C4B43] shadow-[0_8px_22px_rgba(92,75,67,0.08)]">
                {getText(localizedFallback('Current status:', 'Текущ статус:'))} {getText(statusLabel)}
            </div>

            <div className="mt-5 grid gap-3">
                <ConsentSwitch
                    language={resolvedLanguage}
                    label={localizedFallback('Necessary cookies', 'Необходими бисквитки')}
                    description={localizedFallback('Needed for cart, language, secure sign-in, and checkout reliability.', 'Нужни са за количката, езика, защитения вход и надеждната работа на поръчката.')}
                    checked
                    disabled
                />
                <ConsentSwitch
                    language={resolvedLanguage}
                    label={localizedFallback('Analytics cookies', 'Аналитични бисквитки')}
                    description={localizedFallback('Optional. Turns on Google Analytics so the storefront can measure visits and improve pages.', 'По избор. Включва Google Analytics, за да може магазинът да измерва посещенията и да подобрява страниците.')}
                    checked={analyticsEnabled}
                    onChange={() => setAnalyticsEnabled((currentValue) => !currentValue)}
                />
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
                <button type="button" onClick={() => applyConsent({ analytics: false })} className="hover-target lumina-button lumina-button--compact">
                    {getText(localizedFallback('Necessary only', 'Само необходимите'))}
                </button>
                <button type="button" onClick={() => applyConsent({ analytics: analyticsEnabled })} className="hover-target lumina-button lumina-button--compact">
                    {getText(localizedFallback('Save choice', 'Запази избора'))}
                </button>
                <button type="button" onClick={() => applyConsent({ analytics: true })} className="hover-target lumina-button lumina-button--compact lumina-button--solid">
                    {getText(localizedFallback('Accept all', 'Приеми всички'))}
                </button>
            </div>

            <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[#5C4B43]/62">
                {getText(localizedFallback('These changes apply in this browser immediately.', 'Тези промени се прилагат веднага в този браузър.'))}
            </p>

            {feedback ? <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/62">{feedback}</p> : null}
        </aside>
    );
}