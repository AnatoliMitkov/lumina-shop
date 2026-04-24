"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createClient, isSupabaseConfigured } from '../utils/supabase/client';
import {
    buildPhoneValue,
    countryPhoneOptions,
    defaultContactCountry,
    detectCountryFromLocationText,
    getCountryPhoneOption,
    locationSuggestions,
    resolveUserCountry,
    splitStoredPhoneNumber,
} from '../utils/contact';
import {
    buildOrderAddressSummary,
    buildOrderDeliverySummary,
    buildOrderDiscountSummary,
    buildOrderMapUrl,
    buildOrderReference,
    buildOrderShippingMessage,
    buildOrderShippingSummary,
} from '../utils/checkout';
import { buildOrderPaymentSummary, getPaymentStatusMeta } from '../utils/payments';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, normalizeLanguage, resolveLocalizedValue } from '../utils/language';
import { useSiteCopy } from './site-copy/SiteCopyProvider';

function resolveTextValue(value, language = DEFAULT_LANGUAGE) {
    return resolveLocalizedValue(value, normalizeLanguage(language) || DEFAULT_LANGUAGE);
}

function formatDate(value, language = DEFAULT_LANGUAGE) {
    if (!value) {
        return resolveTextValue(localizedFallback('Pending', 'Предстои'), language);
    }

    return new Intl.DateTimeFormat(language === 'bg' ? 'bg-BG' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function formatCurrency(value, language = DEFAULT_LANGUAGE) {
    return new Intl.NumberFormat(language === 'bg' ? 'bg-BG' : 'en-GB', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
}

function toTitleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildInquiryPreview(message, language = DEFAULT_LANGUAGE) {
    const safeMessage = typeof message === 'string' ? message : '';
    const trimmedMessage = safeMessage.split('\n\nAttached selection:')[0].trim() || safeMessage.trim();

    if (!trimmedMessage) {
        return resolveTextValue(localizedFallback('Your atelier note is saved and waiting in the thread.', 'Бележката ви към ателието е запазена и чака отговор.'), language);
    }

    return trimmedMessage.length > 180 ? `${trimmedMessage.slice(0, 177)}...` : trimmedMessage;
}

function hasAttachedSelection(message) {
    return typeof message === 'string' && message.includes('Attached selection:');
}

function getOrderStatusMeta(status, language = DEFAULT_LANGUAGE) {
    const normalizedStatus = String(status || 'pending').toLowerCase();

    switch (normalizedStatus) {
        case 'paid':
            return {
                label: resolveTextValue(localizedFallback('Paid', 'Платена'), language),
                description: resolveTextValue(localizedFallback('Confirmed and financially secured.', 'Потвърдена и финансово обезпечена.'), language),
                className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            };
        case 'fulfilled':
            return {
                label: resolveTextValue(localizedFallback('Fulfilled', 'Изпълнена'), language),
                description: resolveTextValue(localizedFallback('Completed and moved through the atelier flow.', 'Завършена и преминала през процеса на ателието.'), language),
                className: 'border-[#1C1C1C]/15 bg-[#F4F0EA] text-[#1C1C1C]/72',
            };
        case 'cancelled':
            return {
                label: resolveTextValue(localizedFallback('Cancelled', 'Отказана'), language),
                description: resolveTextValue(localizedFallback('Stopped before completion.', 'Спряна преди завършване.'), language),
                className: 'border-red-200 bg-red-50 text-red-700',
            };
        default:
            return {
                label: resolveTextValue(localizedFallback('Pending', 'Очаква'), language),
                description: resolveTextValue(localizedFallback('Waiting for confirmation and next steps.', 'Очаква потвърждение и следващи стъпки.'), language),
                className: 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]',
            };
    }
}

function getOrderImages(items) {
    return Array.isArray(items)
        ? items.filter((item) => item?.image_main).map((item) => item.image_main).slice(0, 3)
        : [];
}

function getOrderNameSummary(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return 'Order archived in Supabase.';
    }

    const names = items.map((item) => item?.name).filter(Boolean);

    if (names.length === 0) {
        return 'Order archived in Supabase.';
    }

    if (names.length <= 2) {
        return names.join(', ');
    }

    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

function OrderPreview({ order }) {
    const images = getOrderImages(order.items);

    if (images.length === 0) {
        return (
            <div className="account-image-stack h-[116px] rounded-sm border border-[#1C1C1C]/10 flex items-center justify-center text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/35">
                Atelier Archive
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2 h-[116px]">
            {images.map((image, index) => (
                <div key={`${image}-${index}`} className={`overflow-hidden rounded-sm border border-[#1C1C1C]/8 bg-[#E9E1D7] ${images.length === 1 ? 'col-span-2' : images.length === 3 && index === 0 ? 'row-span-2' : ''}`}>
                    <img src={image} alt="Archived order piece" className="w-full h-full object-cover" />
                </div>
            ))}
        </div>
    );
}

export default function AccountDashboard({ user, profile, orders, inquiries, schemaMessage, profileStorageMode, isAdmin = false, language }) {
    const supabase = isSupabaseConfigured() ? createClient() : null;
    const router = useRouter();
    const siteCopy = useSiteCopy();
    const { i18n } = useTranslation();
    const [hasHydrated, setHasHydrated] = useState(false);
    const initialLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    const runtimeLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
    const activeLanguage = hasHydrated
        ? (runtimeLanguage || initialLanguage)
        : initialLanguage;
    const getText = (key, fallback) => siteCopy ? siteCopy.resolveText(key, fallback) : resolveLocalizedValue(fallback, activeLanguage);
    const initialPhoneParts = splitStoredPhoneNumber(profile?.phone || '');
    const initialCountryFromLocation = detectCountryFromLocationText(profile?.location || '');
    const locationListId = useId();
    const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
    const [selectedCountry, setSelectedCountry] = useState(initialPhoneParts.country || initialCountryFromLocation || defaultContactCountry);
    const [phoneNumber, setPhoneNumber] = useState(initialPhoneParts.nationalNumber || '');
    const [location, setLocation] = useState(profile?.location || user?.user_metadata?.location || '');
    const [notes, setNotes] = useState(profile?.notes || user?.user_metadata?.notes || '');
    const [saveState, setSaveState] = useState({ type: 'idle', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [desktopOrdersPanelHeight, setDesktopOrdersPanelHeight] = useState(null);
    const savedAccountSectionRef = useRef(null);
    const requestThreadSectionRef = useRef(null);

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    useEffect(() => {
        if (initialPhoneParts.country || initialCountryFromLocation) {
            return;
        }

        const detectedCountry = resolveUserCountry({
            locales: [navigator.language, ...(navigator.languages || [])].filter(Boolean),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }) || defaultContactCountry;

        setSelectedCountry((currentCountry) => currentCountry === defaultContactCountry ? detectedCountry : currentCountry);

        const detectedLocation = getCountryPhoneOption(detectedCountry)?.label || '';

        if (detectedLocation) {
            setLocation((currentLocation) => currentLocation || detectedLocation);
        }
    }, [initialCountryFromLocation, initialPhoneParts.country]);

    const selectedCountryOption = getCountryPhoneOption(selectedCountry) || getCountryPhoneOption(defaultContactCountry);
    const phoneValue = buildPhoneValue(selectedCountryOption?.dialCode || '', phoneNumber);
    const profileFilledCount = [fullName, phoneValue, location, notes].filter((value) => String(value || '').trim()).length;
    const readinessLabel = profileFilledCount >= 4
        ? getText('account.dashboard.readiness.ready', localizedFallback('Atelier-Ready', 'Готово за ателието'))
        : profileFilledCount >= 2
            ? getText('account.dashboard.readiness.progress', localizedFallback('In Progress', 'В процес'))
            : getText('account.dashboard.readiness.started', localizedFallback('Just Started', 'Начало'));
    const totalArchivedPieces = orders.reduce((runningTotal, order) => runningTotal + Number(order?.item_count ?? 0), 0);
    const latestOrderDate = orders[0]?.created_at
        ? formatDate(orders[0].created_at, activeLanguage)
        : getText('account.dashboard.archive.none', localizedFallback('No archive yet', 'Още няма архив'));
    const latestInquiryDate = inquiries[0]?.created_at
        ? formatDate(inquiries[0].created_at, activeLanguage)
        : getText('account.dashboard.inquiries.none', localizedFallback('No request yet', 'Още няма запитване'));
    const schemaMessageToShow = saveState.message ? '' : schemaMessage;
    const profileStorageLabel = profileStorageMode === 'metadata'
        ? getText('account.dashboard.storage.metadata_active', localizedFallback('Metadata fallback active', 'Активен профил от метаданни'))
        : getText('account.dashboard.storage.table_active', localizedFallback('Profile table active', 'Активна профилна таблица'));

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const desktopMediaQuery = window.matchMedia('(min-width: 1280px)');

        const syncDesktopOrdersPanelHeight = () => {
            if (!desktopMediaQuery.matches || !savedAccountSectionRef.current || !requestThreadSectionRef.current) {
                setDesktopOrdersPanelHeight(null);
                return;
            }

            const savedAccountBounds = savedAccountSectionRef.current.getBoundingClientRect();
            const requestThreadBounds = requestThreadSectionRef.current.getBoundingClientRect();
            const nextHeight = Math.max(560, Math.round(requestThreadBounds.bottom - savedAccountBounds.top));

            setDesktopOrdersPanelHeight(nextHeight);
        };

        const resizeObserver = new ResizeObserver(() => {
            syncDesktopOrdersPanelHeight();
        });

        if (savedAccountSectionRef.current) {
            resizeObserver.observe(savedAccountSectionRef.current);
        }

        if (requestThreadSectionRef.current) {
            resizeObserver.observe(requestThreadSectionRef.current);
        }

        syncDesktopOrdersPanelHeight();

        const handleViewportChange = () => {
            syncDesktopOrdersPanelHeight();
        };

        desktopMediaQuery.addEventListener('change', handleViewportChange);
        window.addEventListener('resize', handleViewportChange);

        return () => {
            resizeObserver.disconnect();
            desktopMediaQuery.removeEventListener('change', handleViewportChange);
            window.removeEventListener('resize', handleViewportChange);
        };
    }, []);

    const handleSave = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setSaveState({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/account/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fullName, phone: phoneValue, location, notes }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || getText('account.dashboard.save.error', localizedFallback('Unable to save your profile right now.', 'Профилът ви не може да бъде запазен точно сега.')));
            }

            if (data.profile) {
                const savedPhoneParts = splitStoredPhoneNumber(data.profile.phone || '');

                if (savedPhoneParts.country) {
                    setSelectedCountry(savedPhoneParts.country);
                    setPhoneNumber(savedPhoneParts.nationalNumber || '');
                }

                setLocation(data.profile.location || '');
                setNotes(data.profile.notes || '');
                setFullName(data.profile.full_name || '');
            }

            setSaveState({ type: data.warning ? 'warning' : 'success', message: data.warning || data.message || getText('account.dashboard.save.success', localizedFallback('Account details saved.', 'Данните в профила са запазени.')) });
            router.refresh();
        } catch (error) {
            setSaveState({ type: 'error', message: error.message || getText('account.dashboard.save.error', localizedFallback('Unable to save your profile right now.', 'Профилът ви не може да бъде запазен точно сега.')) });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        setIsSigningOut(true);

        if (!supabase) {
            setIsSigningOut(false);
            router.push('/account');
            router.refresh();
            return;
        }

        await supabase.auth.signOut();
        router.push('/account');
        router.refresh();
    };

    const getInquiryTypeLabel = (queryType) => {
        const optionFallbacks = {
            'Bespoke Commission': localizedFallback('Bespoke Commission', 'Индивидуална поръчка'),
            'Order Support': localizedFallback('Order Support', 'Съдействие за поръчка'),
            'Styling Consultation': localizedFallback('Styling Consultation', 'Стайлинг консултация'),
            'Press / Collaboration': localizedFallback('Press / Collaboration', 'Преса / Сътрудничество'),
            Other: localizedFallback('Other', 'Друго'),
        };

        return resolveLocalizedValue(optionFallbacks[queryType] || toTitleCase(queryType || ''), activeLanguage);
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-12 xl:items-start">
            <div className="flex flex-col gap-10">
            <section ref={savedAccountSectionRef} className="account-surface border border-[#1C1C1C]/10 bg-white/60 p-6 md:p-8 rounded-sm">
                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45 mb-3">{getText('account.dashboard.profile_card.eyebrow', localizedFallback('Saved Account', 'Вашият профил'))}</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest">{fullName || getText('account.dashboard.profile_card.fallback_name', localizedFallback('The VA Client', 'Клиент на The VA Store'))}</h2>
                            <p className="mt-3 text-sm text-[#1C1C1C]/60">{user.email}</p>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-3">
                            <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/70 rounded-full text-[10px] uppercase tracking-[0.2em] text-[#1C1C1C]/48">{profileStorageLabel}</span>
                            <div className="flex flex-wrap gap-3">
                                {isAdmin && <a href="/admin" className="h-12 px-6 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] flex items-center justify-center transition-colors hover:bg-white">{getText('account.dashboard.admin_link', localizedFallback('Studio Admin', 'Админ панел'))}</a>}
                                <button onClick={handleSignOut} disabled={isSigningOut} className={`h-12 px-6 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-[#1C1C1C] hover:text-[#EFECE8] ${isSigningOut ? 'opacity-60' : ''}`}>{isSigningOut ? getText('account.dashboard.sign_out.leaving', localizedFallback('Leaving...', 'Излизане...')) : getText('account.dashboard.sign_out.cta', localizedFallback('Log Out', 'Изход'))}</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
                        <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5 flex flex-col gap-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{getText('account.dashboard.metrics.readiness.label', localizedFallback('Profile Readiness', 'Готовност на профила'))}</p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-none text-[#1C1C1C]">{readinessLabel}</p>
                            <p className="text-xs leading-relaxed text-[#1C1C1C]/56">{profileFilledCount}/4 {getText('account.dashboard.metrics.readiness.copy', localizedFallback('key fields ready for faster atelier follow-up.', 'ключови полета са готови за по-бърза връзка с ателието.'))}</p>
                        </div>
                        <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5 flex flex-col gap-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{getText('account.dashboard.metrics.archived.label', localizedFallback('Archived Pieces', 'Архивирани модели'))}</p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-none text-[#1C1C1C]">{String(totalArchivedPieces).padStart(2, '0')}</p>
                            <p className="text-xs leading-relaxed text-[#1C1C1C]/56">{getText('account.dashboard.metrics.archived.copy_prefix', localizedFallback('Latest archive', 'Последен архив'))} {latestOrderDate}.</p>
                        </div>
                        <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5 flex flex-col gap-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{getText('account.dashboard.metrics.threads.label', localizedFallback('Atelier Threads', 'Кореспонденция'))}</p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-none text-[#1C1C1C]">{String(inquiries.length).padStart(2, '0')}</p>
                            <p className="text-xs leading-relaxed text-[#1C1C1C]/56">{getText('account.dashboard.metrics.threads.copy_prefix', localizedFallback('Most recent note', 'Последна бележка'))} {latestInquiryDate}.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            {getText('account.dashboard.form.full_name', localizedFallback('Full Name', 'Име и фамилия'))}
                            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            {getText('account.dashboard.form.phone', localizedFallback('Phone', 'Телефон'))}
                            <div className="grid grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] gap-3">
                                <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)} aria-label={getText('account.dashboard.form.country_code_aria', localizedFallback('Country calling code', 'Код на държавата'))} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {countryPhoneOptions.map((option) => (
                                        <option key={option.country} value={option.country}>{`${option.label} (${option.dialCode})`}</option>
                                    ))}
                                </select>
                                <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} autoComplete="tel-national" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </div>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            {getText('account.dashboard.form.location', localizedFallback('Location', 'Локация'))}
                            <>
                                <input value={location} onChange={(event) => setLocation(event.target.value)} list={locationListId} autoComplete="address-level2" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                <datalist id={locationListId}>
                                    {locationSuggestions.map((option) => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </>
                        </label>
                        <div className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            {getText('account.dashboard.form.email', localizedFallback('Email', 'Имейл'))}
                            <div className="h-14 border border-[#1C1C1C]/12 bg-[#EFECE8] px-4 text-sm tracking-normal text-[#1C1C1C]/60 flex items-center">{user.email}</div>
                        </div>
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            {getText('account.dashboard.form.notes', localizedFallback('Notes For Atelier', 'Бележки за ателието'))}
                            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>

                        {(saveState.message || schemaMessageToShow) && (
                            <div className="md:col-span-2 flex flex-col gap-2">
                                {saveState.message && <p className={`text-xs ${saveState.type === 'error' ? 'text-red-600' : saveState.type === 'warning' ? 'text-[#8A6A2F]' : 'text-[#1C1C1C]/65'}`}>{saveState.message}</p>}
                                {schemaMessageToShow && <p className="text-xs text-[#1C1C1C]/55">{schemaMessageToShow}</p>}
                            </div>
                        )}

                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 pt-2">
                            <button disabled={isSaving} className={`h-14 px-8 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.24em] text-xs font-medium transition-colors hover:bg-black ${isSaving ? 'opacity-60' : ''}`}>{isSaving ? getText('account.dashboard.form.saving', localizedFallback('Saving...', 'Запазване...')) : getText('account.dashboard.form.save', localizedFallback('Save Details', 'Запази промените'))}</button>
                            <a href="/contact" className="h-14 px-8 border border-[#1C1C1C]/12 uppercase tracking-[0.24em] text-xs font-medium flex items-center justify-center hover:bg-white transition-colors">{getText('account.dashboard.form.contact_atelier', localizedFallback('Contact Atelier', 'Свържи се с ателието'))}</a>
                        </div>
                    </form>
                </section>

                <section ref={requestThreadSectionRef} className="account-surface border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] p-6 md:p-8 rounded-sm">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40 mb-3">{getText('account.dashboard.requests.eyebrow', localizedFallback('Submitted Requests', 'Изпратени запитвания'))}</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.14em]">{getText('account.dashboard.requests.title', localizedFallback('Atelier Thread', 'Разговор с ателието'))}</h2>
                        </div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">{inquiries.length === 0 ? getText('account.dashboard.requests.empty_state', localizedFallback('Waiting for first request', 'Още няма запитване')) : `${inquiries.length} ${inquiries.length === 1 ? getText('account.dashboard.requests.note_singular', localizedFallback('active note', 'активно запитване')) : getText('account.dashboard.requests.note_plural', localizedFallback('active notes', 'активни запитвания'))}`}</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        {inquiries.length === 0 ? (
                            <p className="text-sm text-white/60">{getText('account.dashboard.requests.empty_copy', localizedFallback('No contact requests yet. Use the atelier form whenever you want a personal reply.', 'Още няма изпратени запитвания. Използвайте формата за ателието, когато искате личен отговор.'))}</p>
                        ) : (
                            inquiries.map((inquiry) => (
                                <div key={inquiry.id} className="account-thread-card border border-white/10 p-4 md:p-5 rounded-sm bg-white/[0.03]">
                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-3">
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em]">
                                            <span className="px-3 py-2 rounded-full border border-white/10 bg-white/[0.05] text-white/70">{getInquiryTypeLabel(inquiry.query_type)}</span>
                                            {hasAttachedSelection(inquiry.message) && <span className="px-3 py-2 rounded-full border border-white/10 bg-white/[0.05] text-white/45">{getText('account.dashboard.requests.selection_attached', localizedFallback('Selection attached', 'Прикачена селекция'))}</span>}
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{formatDate(inquiry.created_at, activeLanguage)}</span>
                                    </div>
                                    <p className="text-sm text-white/72 leading-relaxed">{buildInquiryPreview(inquiry.message, activeLanguage)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            <section
                className="account-surface border border-[#1C1C1C]/10 bg-white/60 p-6 md:p-8 rounded-sm xl:self-start xl:flex xl:min-h-0 xl:flex-col"
                style={desktopOrdersPanelHeight ? { height: `${desktopOrdersPanelHeight}px` } : undefined}
            >
                <div className="flex flex-col gap-3 mb-8">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">{getText('account.dashboard.orders.eyebrow', localizedFallback('Order Tracking', 'Проследяване на поръчки'))}</p>
                    <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest">{getText('account.dashboard.orders.title', localizedFallback('Your Orders', 'Вашите поръчки'))}</h2>
                    <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{getText('account.dashboard.orders.copy', localizedFallback('Each submitted order stays here with its current status, delivery structure, and the same piece context the atelier is reviewing.', 'Всяка изпратена поръчка остава тук с текущия си статус, доставката и контекста на модела, който ателието преглежда.'))}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">{getText('account.dashboard.orders.metrics.selections', localizedFallback('Selections', 'Селекции'))}</p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{String(orders.length).padStart(2, '0')}</p>
                    </div>
                    <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">{getText('account.dashboard.orders.metrics.pieces', localizedFallback('Pieces', 'Модели'))}</p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{String(totalArchivedPieces).padStart(2, '0')}</p>
                    </div>
                </div>

                <div data-lenis-prevent-wheel className="flex flex-col gap-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-2">
                    {orders.length === 0 ? (
                        <p className="text-sm text-[#1C1C1C]/60 leading-relaxed">{getText('account.dashboard.orders.empty', localizedFallback('Your orders will appear here once you submit checkout while signed in to your account.', 'Поръчките ви ще се покажат тук, след като изпратите checkout, докато сте влезли в профила си.'))}</p>
                    ) : (
                        orders.map((order) => {
                            const orderStatusMeta = getOrderStatusMeta(order.status, activeLanguage);
                            const paymentStatusMeta = getPaymentStatusMeta(order.payment_status, order.checkout_mode, activeLanguage);
                            const pieceUnit = order.item_count === 1
                                ? getText('account.dashboard.orders.piece_unit_singular', localizedFallback('piece', 'модел'))
                                : getText('account.dashboard.orders.piece_unit_plural', localizedFallback('pieces', 'модела'));

                            return (
                            <div key={order.id} className="account-order-card border border-[#1C1C1C]/10 p-4 md:p-5 rounded-sm bg-white/72 xl:shrink-0">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                                    <div className="flex flex-col gap-2 min-w-0">
                                        <span className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/38">{buildOrderReference(order)}</span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`account-status-pill px-3 py-2 rounded-full border text-[10px] uppercase tracking-[0.22em] ${orderStatusMeta.className}`}>{orderStatusMeta.label}</span>
                                            <span className={`account-status-pill px-3 py-2 rounded-full border text-[10px] uppercase tracking-[0.22em] ${paymentStatusMeta.className}`}>{paymentStatusMeta.label}</span>
                                            <span className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/40">{formatDate(order.created_at, activeLanguage)}</span>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right shrink-0">
                                        <p className="font-serif text-2xl md:text-3xl font-light leading-none text-[#1C1C1C]">{formatCurrency(order.total, activeLanguage)}</p>
                                        <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{order.item_count} {pieceUnit}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-[116px_minmax(0,1fr)] gap-4 md:gap-5 items-start">
                                    <OrderPreview order={order} />
                                    <div className="min-w-0 flex flex-col gap-3">
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/40">{orderStatusMeta.description}</p>
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/40">{paymentStatusMeta.description}</p>
                                        <p className="font-serif text-xl md:text-2xl font-light leading-tight text-[#1C1C1C] break-words">{getOrderNameSummary(order.items)}</p>
                                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">
                                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{buildOrderDeliverySummary(order, activeLanguage)}</span>
                                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{buildOrderShippingSummary(order, activeLanguage)}</span>
                                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{buildOrderPaymentSummary(order, activeLanguage)}</span>
                                            {buildOrderDiscountSummary(order, activeLanguage) && <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{buildOrderDiscountSummary(order, activeLanguage)}</span>}
                                        </div>
                                        <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{buildOrderAddressSummary(order, activeLanguage)}</p>
                                        {buildOrderShippingMessage(order, activeLanguage) && <p className="text-xs leading-relaxed text-[#1C1C1C]/46">{buildOrderShippingMessage(order, activeLanguage)}</p>}
                                        {buildOrderMapUrl(order) && <a href={buildOrderMapUrl(order)} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/46 underline underline-offset-4">{getText('account.dashboard.orders.map_link', localizedFallback('Open pinned map', 'Отвори закачената карта'))}</a>}
                                    </div>
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
}