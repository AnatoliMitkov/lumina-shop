"use client";

import { useEffect, useId, useState } from 'react';
import { useCart } from './CartProvider';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { buildCartSnapshot } from '../utils/cart';
import {
    buildPhoneValue,
    countryPhoneOptions,
    defaultContactCountry,
    detectCountryFromLocationText,
    getCountryPhoneOption,
    locationSuggestions,
    queryOptions,
    resolveUserCountry,
    splitStoredPhoneNumber,
} from '../utils/contact';

async function fetchCaptchaChallenge() {
    const response = await fetch('/api/contact/captcha', {
        cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Unable to prepare the human check right now.');
    }

    return data;
}

export default function ContactForm({ initialValues }) {
    const { cartItems, cartTotal } = useCart();
    const siteCopy = useSiteCopy();
    const initialPhoneParts = splitStoredPhoneNumber(initialValues?.phone || '');
    const initialCountryFromLocation = detectCountryFromLocationText(initialValues?.location || '');
    const locationListId = useId();
    const cartSnapshot = buildCartSnapshot(cartItems);
    const visibleCartItems = cartSnapshot.items.slice(0, 4);
    const hiddenCartItemCount = Math.max(0, cartSnapshot.itemCount - visibleCartItems.length);
    const hasSelectionAttached = cartSnapshot.itemCount > 0;
    const messagePlaceholder = siteCopy
        ? siteCopy.resolveText(
            hasSelectionAttached ? 'contact.form.message.placeholder.selection' : 'contact.form.message.placeholder.default',
            hasSelectionAttached
                ? 'Tell us what you need about the selected pieces, fit, occasion, or timing.'
                : 'Tell us about the piece, fit, occasion, or support you need.'
        )
        : hasSelectionAttached
            ? 'Tell us what you need about the selected pieces, fit, occasion, or timing.'
            : 'Tell us about the piece, fit, occasion, or support you need.';
    const captchaPlaceholder = siteCopy ? siteCopy.resolveText('contact.form.captcha.answer_placeholder', 'Type the answer here') : 'Type the answer here';
    const [fullName, setFullName] = useState(initialValues?.fullName || '');
    const [email, setEmail] = useState(initialValues?.email || '');
    const [selectedCountry, setSelectedCountry] = useState(initialPhoneParts.country || initialCountryFromLocation || defaultContactCountry);
    const [phoneNumber, setPhoneNumber] = useState(initialPhoneParts.nationalNumber || '');
    const [location, setLocation] = useState(initialValues?.location || '');
    const [queryType, setQueryType] = useState(initialValues?.queryType || queryOptions[0]);
    const [message, setMessage] = useState('');
    const [captchaPrompt, setCaptchaPrompt] = useState('Preparing a tiny human check...');
    const [captchaToken, setCaptchaToken] = useState('');
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [studio, setStudio] = useState('');
    const [formStartedAt, setFormStartedAt] = useState(() => Date.now());
    const [isCaptchaLoading, setIsCaptchaLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', kicker: '', title: '', message: '', detail: '' });

    const loadCaptcha = async (shouldResetStatus = false) => {
        setIsCaptchaLoading(true);

        try {
            const challenge = await fetchCaptchaChallenge();
            setCaptchaPrompt(challenge.prompt || 'Human check');
            setCaptchaToken(challenge.token || '');
            setCaptchaAnswer('');
            setFormStartedAt(Date.now());

            if (shouldResetStatus) {
                setStatus({ type: 'idle', kicker: '', title: '', message: '', detail: '' });
            }
        } catch (error) {
            setCaptchaPrompt('Human check unavailable right now.');
            setCaptchaToken('');
            setStatus({
                type: 'error',
                kicker: 'Thread snagged',
                title: 'Human check missing',
                message: error.message || 'Unable to prepare the human check right now.',
                detail: 'Refresh the challenge and try again in a moment.',
            });
        } finally {
            setIsCaptchaLoading(false);
        }
    };

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

    useEffect(() => {
        void loadCaptcha();
    }, []);

    const selectedCountryOption = getCountryPhoneOption(selectedCountry) || getCountryPhoneOption(defaultContactCountry);
    const phoneValue = buildPhoneValue(selectedCountryOption?.dialCode || '', phoneNumber);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'idle', kicker: '', title: '', message: '', detail: '' });

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName,
                    email,
                    phone: phoneValue,
                    phoneCountry: selectedCountry,
                    phoneCountryCode: selectedCountryOption?.dialCode || '',
                    location,
                    queryType,
                    message,
                    captchaToken,
                    captchaAnswer,
                    selectionItems: cartSnapshot.items,
                    studio,
                    startedAt: formStartedAt,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to send your message right now.');
            }

            setStatus({
                type: 'success',
                kicker: 'Atelier relay',
                title: 'Request airborne',
                message: data.message || 'Your request has been sent.',
                detail: hasSelectionAttached
                    ? 'A copy should now be sitting in both inboxes with your selected pieces attached to the same request.'
                    : 'A copy should now be sitting in both inboxes with the same details.',
            });
            setMessage('');
            await loadCaptcha();
        } catch (error) {
            const messageText = error.message || 'Unable to send your message right now.';
            const isMailConfigError = messageText.includes('CONTACT_SMTP_PASSWORD');

            setStatus({
                type: 'error',
                kicker: 'Thread snagged',
                title: isMailConfigError ? 'Mailbox needs its key' : 'Almost there',
                message: isMailConfigError
                    ? 'The form is ready, but the atelier mailbox still needs its password before it can send anything.'
                    : messageText,
                detail: isMailConfigError
                    ? 'Add CONTACT_SMTP_PASSWORD in .env.local and this route will start sending immediately.'
                    : 'Nothing is lost. Tweak the field or refresh the human check and try once more.',
            });
            await loadCaptcha();
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSendDisabled = isSubmitting || isCaptchaLoading || !captchaToken;

    return (
        <form onSubmit={handleSubmit} className="border border-[#1C1C1C]/10 bg-white/60 p-6 md:p-8 rounded-sm flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.full_name" fallback="Full Name" editorLabel="Contact form full name label" />
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                </label>
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.email" fallback="Email" editorLabel="Contact form email label" />
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                </label>
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.phone" fallback="Phone" editorLabel="Contact form phone label" />
                    <div className="grid grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] gap-3">
                        <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)} aria-label="Country calling code" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                            {countryPhoneOptions.map((option) => (
                                <option key={option.country} value={option.country}>{`${option.label} (${option.dialCode})`}</option>
                            ))}
                        </select>
                        <input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required autoComplete="tel-national" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </div>
                </label>
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.location" fallback="Location" editorLabel="Contact form location label" />
                    <>
                        <input value={location} onChange={(event) => setLocation(event.target.value)} list={locationListId} autoComplete="address-level2" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        <datalist id={locationListId}>
                            {locationSuggestions.map((option) => (
                                <option key={option} value={option} />
                            ))}
                        </datalist>
                    </>
                </label>
            </div>

            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                <EditableText contentKey="contact.form.query_type" fallback="Query Type" editorLabel="Contact form query type label" />
                <select value={queryType} onChange={(event) => setQueryType(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                    {queryOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </label>

            {hasSelectionAttached && (
                <div className="border border-[#1C1C1C]/10 bg-white/45 p-4 md:p-5 rounded-sm flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45 mb-2"><EditableText contentKey="contact.form.selection.eyebrow" fallback="Selection Attached" editorLabel="Contact form selection eyebrow" /></p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-tight text-[#1C1C1C]">{cartSnapshot.itemCount} piece{cartSnapshot.itemCount === 1 ? '' : 's'} / €{cartTotal.toFixed(2)}</p>
                        </div>
                        <a href="/cart" className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 transition-colors hover:text-[#1C1C1C]">
                            <EditableText contentKey="contact.form.selection.review_cart" fallback="Review Cart" editorLabel="Contact form review cart" />
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibleCartItems.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm px-4 py-3 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/38 mb-1">Piece {String(index + 1).padStart(2, '0')}</p>
                                    <p className="font-serif text-lg leading-tight text-[#1C1C1C] truncate">{item.name}</p>
                                </div>
                                <p className="shrink-0 text-sm text-[#1C1C1C]/60">€{Number(item.price).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>

                    {hiddenCartItemCount > 0 && (
                        <p className="text-xs leading-relaxed text-[#1C1C1C]/50">+ {hiddenCartItemCount} more piece{hiddenCartItemCount === 1 ? '' : 's'} will be attached automatically when you send the request.</p>
                    )}
                </div>
            )}

            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                <EditableText contentKey="contact.form.message" fallback="Message" editorLabel="Contact form message label" />
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={7} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" placeholder={messagePlaceholder} />
            </label>

            <div className="border border-[#1C1C1C]/10 bg-white/45 p-4 md:p-5 rounded-sm flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45 mb-2"><EditableText contentKey="contact.form.captcha.eyebrow" fallback="Human Check" editorLabel="Contact form captcha eyebrow" /></p>
                        <p className="font-serif text-xl md:text-2xl font-light leading-tight text-[#1C1C1C]">{captchaPrompt}</p>
                    </div>
                    <button type="button" onClick={() => void loadCaptcha(true)} className="h-11 px-4 border border-[#1C1C1C]/12 bg-white text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/60 transition-colors hover:border-[#1C1C1C] hover:text-[#1C1C1C]" disabled={isCaptchaLoading}>
                        {isCaptchaLoading ? <EditableText contentKey="contact.form.captcha.loading" fallback="Loading" editorLabel="Contact form captcha loading" /> : <EditableText contentKey="contact.form.captcha.refresh" fallback="Refresh" editorLabel="Contact form captcha refresh" />}
                    </button>
                </div>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.captcha.answer" fallback="Answer" editorLabel="Contact form captcha answer label" />
                    <input value={captchaAnswer} onChange={(event) => setCaptchaAnswer(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" placeholder={captchaPlaceholder} />
                </label>
            </div>

            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
                <label>
                    Studio website
                    <input tabIndex={-1} autoComplete="off" value={studio} onChange={(event) => setStudio(event.target.value)} />
                </label>
            </div>

            {status.type !== 'idle' && (
                <div data-status={status.type} className={`contact-status-card border rounded-sm p-5 md:p-6 ${status.type === 'error' ? 'border-red-600/20 bg-[#fff5f3]' : 'border-[#1C1C1C]/10 bg-white/70'}`}>
                    <div className="flex items-start gap-4 md:gap-5">
                        <div className="contact-status-badge shrink-0">
                            <span className="contact-status-badge-core" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={`text-[10px] uppercase tracking-[0.24em] mb-2 ${status.type === 'error' ? 'text-red-600/70' : 'text-[#1C1C1C]/45'}`}>{status.kicker}</p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-tight text-[#1C1C1C] mb-2">{status.title}</p>
                            <p className={`text-sm leading-relaxed ${status.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/70'}`}>{status.message}</p>
                            {status.detail && <p className="mt-3 text-xs leading-relaxed text-[#1C1C1C]/50">{status.detail}</p>}
                        </div>
                    </div>
                </div>
            )}

            <button disabled={isSendDisabled} className={`h-14 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.24em] text-xs font-medium transition-colors hover:bg-black ${isSendDisabled ? 'opacity-60' : ''}`}>
                {isSubmitting ? <EditableText contentKey="contact.form.submit.sending" fallback="Sending..." editorLabel="Contact form submit loading" /> : <EditableText contentKey="contact.form.submit.default" fallback="Send Request" editorLabel="Contact form submit label" />}
            </button>
        </form>
    );
}