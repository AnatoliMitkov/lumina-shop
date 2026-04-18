"use client";

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    buildOrderReference,
} from '../utils/checkout';

function formatDate(value) {
    if (!value) {
        return 'Pending';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function formatCurrency(value) {
    return `€${Number(value ?? 0).toFixed(2)}`;
}

function toTitleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildInquiryPreview(message) {
    const safeMessage = typeof message === 'string' ? message : '';
    const trimmedMessage = safeMessage.split('\n\nAttached selection:')[0].trim() || safeMessage.trim();

    if (!trimmedMessage) {
        return 'Your atelier note is saved and waiting in the thread.';
    }

    return trimmedMessage.length > 180 ? `${trimmedMessage.slice(0, 177)}...` : trimmedMessage;
}

function hasAttachedSelection(message) {
    return typeof message === 'string' && message.includes('Attached selection:');
}

function getOrderStatusMeta(status) {
    const normalizedStatus = String(status || 'pending').toLowerCase();

    switch (normalizedStatus) {
        case 'paid':
            return {
                label: 'Paid',
                description: 'Confirmed and financially secured.',
                className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            };
        case 'fulfilled':
            return {
                label: 'Fulfilled',
                description: 'Completed and moved through the atelier flow.',
                className: 'border-[#1C1C1C]/15 bg-[#F4F0EA] text-[#1C1C1C]/72',
            };
        case 'cancelled':
            return {
                label: 'Cancelled',
                description: 'Stopped before completion.',
                className: 'border-red-200 bg-red-50 text-red-700',
            };
        default:
            return {
                label: 'Pending',
                description: 'Waiting for atelier review and next steps.',
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

export default function AccountDashboard({ user, profile, orders, inquiries, schemaMessage, profileStorageMode, isAdmin = false }) {
    const supabase = isSupabaseConfigured() ? createClient() : null;
    const router = useRouter();
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
    const readinessLabel = profileFilledCount >= 4 ? 'Atelier-Ready' : profileFilledCount >= 2 ? 'In Progress' : 'Just Started';
    const totalArchivedPieces = orders.reduce((runningTotal, order) => runningTotal + Number(order?.item_count ?? 0), 0);
    const latestOrderDate = orders[0]?.created_at ? formatDate(orders[0].created_at) : 'No archive yet';
    const latestInquiryDate = inquiries[0]?.created_at ? formatDate(inquiries[0].created_at) : 'No request yet';
    const schemaMessageToShow = saveState.message ? '' : schemaMessage;

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
                throw new Error(data.error || 'Unable to save your profile right now.');
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

            setSaveState({ type: data.warning ? 'warning' : 'success', message: data.warning || data.message || 'Account details saved.' });
            router.refresh();
        } catch (error) {
            setSaveState({ type: 'error', message: error.message || 'Unable to save your profile right now.' });
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

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-12">
            <div className="flex flex-col gap-10">
                <section className="account-surface border border-[#1C1C1C]/10 bg-white/60 p-6 md:p-8 rounded-sm">
                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45 mb-3">Saved Account</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest">{fullName || 'The VA Client'}</h2>
                            <p className="mt-3 text-sm text-[#1C1C1C]/60">{user.email}</p>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-3">
                            <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/70 rounded-full text-[10px] uppercase tracking-[0.2em] text-[#1C1C1C]/48">{profileStorageMode === 'metadata' ? 'Metadata fallback active' : 'Profile table active'}</span>
                            <div className="flex flex-wrap gap-3">
                                {isAdmin && <a href="/admin" className="h-12 px-6 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] flex items-center justify-center transition-colors hover:bg-white">Studio Admin</a>}
                                <button onClick={handleSignOut} disabled={isSigningOut} className={`h-12 px-6 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-[#1C1C1C] hover:text-[#EFECE8] ${isSigningOut ? 'opacity-60' : ''}`}>{isSigningOut ? 'Leaving...' : 'Log Out'}</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
                        <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5 flex flex-col gap-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Profile Readiness</p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-none text-[#1C1C1C]">{readinessLabel}</p>
                            <p className="text-xs leading-relaxed text-[#1C1C1C]/56">{profileFilledCount}/4 key fields ready for faster atelier follow-up.</p>
                        </div>
                        <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5 flex flex-col gap-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Archived Pieces</p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-none text-[#1C1C1C]">{String(totalArchivedPieces).padStart(2, '0')}</p>
                            <p className="text-xs leading-relaxed text-[#1C1C1C]/56">Latest archive {latestOrderDate}.</p>
                        </div>
                        <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5 flex flex-col gap-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Atelier Threads</p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-none text-[#1C1C1C]">{String(inquiries.length).padStart(2, '0')}</p>
                            <p className="text-xs leading-relaxed text-[#1C1C1C]/56">Most recent note {latestInquiryDate}.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Full Name
                            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Phone
                            <div className="grid grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] gap-3">
                                <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)} aria-label="Country calling code" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {countryPhoneOptions.map((option) => (
                                        <option key={option.country} value={option.country}>{`${option.label} (${option.dialCode})`}</option>
                                    ))}
                                </select>
                                <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} autoComplete="tel-national" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </div>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Location
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
                            Email
                            <div className="h-14 border border-[#1C1C1C]/12 bg-[#EFECE8] px-4 text-sm tracking-normal text-[#1C1C1C]/60 flex items-center">{user.email}</div>
                        </div>
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Notes For Atelier
                            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>

                        {(saveState.message || schemaMessageToShow) && (
                            <div className="md:col-span-2 flex flex-col gap-2">
                                {saveState.message && <p className={`text-xs ${saveState.type === 'error' ? 'text-red-600' : saveState.type === 'warning' ? 'text-[#8A6A2F]' : 'text-[#1C1C1C]/65'}`}>{saveState.message}</p>}
                                {schemaMessageToShow && <p className="text-xs text-[#1C1C1C]/55">{schemaMessageToShow}</p>}
                            </div>
                        )}

                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 pt-2">
                            <button disabled={isSaving} className={`h-14 px-8 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.24em] text-xs font-medium transition-colors hover:bg-black ${isSaving ? 'opacity-60' : ''}`}>{isSaving ? 'Saving...' : 'Save Details'}</button>
                            <a href="/contact" className="h-14 px-8 border border-[#1C1C1C]/12 uppercase tracking-[0.24em] text-xs font-medium flex items-center justify-center hover:bg-white transition-colors">Contact Atelier</a>
                        </div>
                    </form>
                </section>

                <section className="account-surface border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] p-6 md:p-8 rounded-sm">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40 mb-3">Submitted Requests</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.14em]">Atelier Thread</h2>
                        </div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">{inquiries.length === 0 ? 'Waiting for first request' : `${inquiries.length} active note${inquiries.length === 1 ? '' : 's'}`}</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        {inquiries.length === 0 ? (
                            <p className="text-sm text-white/60">No contact requests yet. Use the atelier form whenever you want a personal reply.</p>
                        ) : (
                            inquiries.map((inquiry) => (
                                <div key={inquiry.id} className="account-thread-card border border-white/10 p-4 md:p-5 rounded-sm bg-white/[0.03]">
                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-3">
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em]">
                                            <span className="px-3 py-2 rounded-full border border-white/10 bg-white/[0.05] text-white/70">{inquiry.query_type}</span>
                                            {hasAttachedSelection(inquiry.message) && <span className="px-3 py-2 rounded-full border border-white/10 bg-white/[0.05] text-white/45">Selection attached</span>}
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{formatDate(inquiry.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-white/72 leading-relaxed">{buildInquiryPreview(inquiry.message)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            <section className="account-surface border border-[#1C1C1C]/10 bg-white/60 p-6 md:p-8 rounded-sm h-fit xl:sticky xl:top-28">
                <div className="flex flex-col gap-3 mb-8">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">Order Tracking</p>
                    <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest">Your Orders</h2>
                    <p className="text-sm leading-relaxed text-[#1C1C1C]/58">Each submitted order stays here with its current status, delivery structure, and the same piece context the atelier is reviewing.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Selections</p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{String(orders.length).padStart(2, '0')}</p>
                    </div>
                    <div className="account-metric-card border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Pieces</p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{String(totalArchivedPieces).padStart(2, '0')}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {orders.length === 0 ? (
                        <p className="text-sm text-[#1C1C1C]/60 leading-relaxed">Your orders will appear here once you submit checkout while signed in to your account.</p>
                    ) : (
                        orders.map((order) => (
                            <div key={order.id} className="account-order-card border border-[#1C1C1C]/10 p-4 md:p-5 rounded-sm bg-white/72">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                                    <div className="flex flex-col gap-2 min-w-0">
                                        <span className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/38">{buildOrderReference(order)}</span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`account-status-pill px-3 py-2 rounded-full border text-[10px] uppercase tracking-[0.22em] ${getOrderStatusMeta(order.status).className}`}>{getOrderStatusMeta(order.status).label}</span>
                                            <span className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/40">{formatDate(order.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right shrink-0">
                                        <p className="font-serif text-2xl md:text-3xl font-light leading-none text-[#1C1C1C]">{formatCurrency(order.total)}</p>
                                        <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{order.item_count} piece{order.item_count === 1 ? '' : 's'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-[116px_minmax(0,1fr)] gap-4 md:gap-5 items-start">
                                    <OrderPreview order={order} />
                                    <div className="min-w-0 flex flex-col gap-3">
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/40">{getOrderStatusMeta(order.status).description}</p>
                                        <p className="font-serif text-xl md:text-2xl font-light leading-tight text-[#1C1C1C] break-words">{getOrderNameSummary(order.items)}</p>
                                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">
                                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{buildOrderDeliverySummary(order)}</span>
                                            {buildOrderDiscountSummary(order) && <span className="rounded-full border border-[#1C1C1C]/10 bg-white/70 px-3 py-2">{buildOrderDiscountSummary(order)}</span>}
                                        </div>
                                        <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{buildOrderAddressSummary(order)}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}