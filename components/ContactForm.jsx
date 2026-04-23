"use client";

import { useEffect, useId, useState } from 'react';
import { useCart } from './CartProvider';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { buildCartSnapshot } from '../utils/cart';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, resolveLocalizedValue } from '../utils/language';
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

async function fetchCaptchaChallenge(fallbackMessage) {
    const response = await fetch('/api/contact/captcha', {
        cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || fallbackMessage || 'Unable to prepare the human check right now.');
    }

    return data;
}

export default function ContactForm({ initialValues, hasProductContext = false }) {
    const { cartItems, cartTotal } = useCart();
    const siteCopy = useSiteCopy();
    const getText = (key, fallback) => siteCopy ? siteCopy.resolveText(key, fallback) : resolveLocalizedValue(fallback, DEFAULT_LANGUAGE);
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
                ? localizedFallback('Tell us what you need about the selected pieces, fit, occasion, or timing.', 'Разкажете ни какво ви е нужно за избраните модели, размера, повода или срока.')
                : localizedFallback('Tell us about the piece, fit, occasion, or support you need.', 'Разкажете ни от какво имате нужда за модела, размера, повода или консултацията.')
        )
        : hasSelectionAttached
            ? resolveLocalizedValue(localizedFallback('Tell us what you need about the selected pieces, fit, occasion, or timing.', 'Разкажете ни какво ви е нужно за избраните модели, размера, повода или срока.'), DEFAULT_LANGUAGE)
            : resolveLocalizedValue(localizedFallback('Tell us about the piece, fit, occasion, or support you need.', 'Разкажете ни от какво имате нужда за модела, размера, повода или консултацията.'), DEFAULT_LANGUAGE);
    const captchaPlaceholder = getText('contact.form.captcha.answer_placeholder', localizedFallback('Type the answer here', 'Въведете отговора тук'));
    const selectionUnit = cartSnapshot.itemCount === 1
        ? getText('contact.form.selection.unit_singular', localizedFallback('piece', 'модел'))
        : getText('contact.form.selection.unit_plural', localizedFallback('pieces', 'модела'));
    const hiddenSelectionUnit = hiddenCartItemCount === 1
        ? getText('contact.form.selection.unit_singular', localizedFallback('piece', 'модел'))
        : getText('contact.form.selection.unit_plural', localizedFallback('pieces', 'модела'));
    const queryTypeOptions = queryOptions.map((option) => {
        const optionFallbacks = {
            'Bespoke Commission': localizedFallback('Bespoke Commission', 'Индивидуална поръчка'),
            'Order Support': localizedFallback('Order Support', 'Съдействие за поръчка'),
            'Styling Consultation': localizedFallback('Styling Consultation', 'Стайлинг консултация'),
            'Press / Collaboration': localizedFallback('Press / Collaboration', 'Преса / Сътрудничество'),
            Other: localizedFallback('Other', 'Друго'),
        };
        const optionKeys = {
            'Bespoke Commission': 'contact.form.query_option.bespoke_commission',
            'Order Support': 'contact.form.query_option.order_support',
            'Styling Consultation': 'contact.form.query_option.styling_consultation',
            'Press / Collaboration': 'contact.form.query_option.press_collaboration',
            Other: 'contact.form.query_option.other',
        };

        return {
            value: option,
            label: getText(optionKeys[option] || 'contact.form.query_option.default', optionFallbacks[option] || option),
        };
    });
    const [fullName, setFullName] = useState(initialValues?.fullName || '');
    const [email, setEmail] = useState(initialValues?.email || '');
    const [selectedCountry, setSelectedCountry] = useState(initialPhoneParts.country || initialCountryFromLocation || defaultContactCountry);
    const [phoneNumber, setPhoneNumber] = useState(initialPhoneParts.nationalNumber || '');
    const [location, setLocation] = useState(initialValues?.location || '');
    const [queryType, setQueryType] = useState(initialValues?.queryType || queryOptions[0]);
    const [message, setMessage] = useState('');
    const [productContext, setProductContext] = useState(initialValues?.productContext || '');
    const [captchaPrompt, setCaptchaPrompt] = useState(getText('contact.form.captcha.preparing', localizedFallback('Preparing a tiny human check...', 'Подготвяме кратка проверка...')));
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
            const challenge = await fetchCaptchaChallenge(getText('contact.form.captcha.prepare_error', localizedFallback('Unable to prepare the human check right now.', 'Не успяхме да подготвим проверката в момента.')));
            setCaptchaPrompt(challenge.prompt || getText('contact.form.captcha.default_prompt', localizedFallback('Human check', 'Проверка')));
            setCaptchaToken(challenge.token || '');
            setCaptchaAnswer('');
            setFormStartedAt(Date.now());

            if (shouldResetStatus) {
                setStatus({ type: 'idle', kicker: '', title: '', message: '', detail: '' });
            }
        } catch (error) {
            setCaptchaPrompt(getText('contact.form.captcha.unavailable', localizedFallback('Human check unavailable right now.', 'Проверката не е налична в момента.')));
            setCaptchaToken('');
            setStatus({
                type: 'error',
                kicker: getText('contact.form.status.error_kicker', localizedFallback('Thread snagged', 'Нещо прекъсна')),
                title: getText('contact.form.status.captcha_missing', localizedFallback('Human check missing', 'Липсва проверка')),
                message: error.message || getText('contact.form.captcha.prepare_error', localizedFallback('Unable to prepare the human check right now.', 'Не успяхме да подготвим проверката в момента.')),
                detail: getText('contact.form.status.retry_detail', localizedFallback('Refresh the challenge and try again in a moment.', 'Обновете задачата и опитайте отново след малко.')),
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
            const messageWithContext = productContext
                ? `${productContext}\n\n${message}`
                : message;

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
                    message: messageWithContext,
                    captchaToken,
                    captchaAnswer,
                    selectionItems: cartSnapshot.items,
                    studio,
                    startedAt: formStartedAt,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || getText('contact.form.submit.error', localizedFallback('Unable to send your message right now.', 'Не успяхме да изпратим съобщението ви в момента.')));
            }

            setStatus({
                type: 'success',
                kicker: getText('contact.form.status.success_kicker', localizedFallback('Atelier relay', 'Ателие')),
                title: getText('contact.form.status.success_title', localizedFallback('Request airborne', 'Запитването е изпратено')),
                message: data.message || getText('contact.form.status.success_message', localizedFallback('Your request has been sent.', 'Изпратихме запитването ви.')),
                detail: hasSelectionAttached
                    ? getText('contact.form.status.success_detail_selection', localizedFallback('A copy should now be sitting in both inboxes with your selected pieces attached to the same request.', 'Копие вече трябва да е изпратено и до двата имейла, заедно с избраните модели.'))
                    : getText('contact.form.status.success_detail', localizedFallback('A copy should now be sitting in both inboxes with the same details.', 'Копие вече трябва да е изпратено и до двата имейла със същите детайли.')),
            });
            setMessage('');
            await loadCaptcha();
        } catch (error) {
            const messageText = error.message || getText('contact.form.submit.error', localizedFallback('Unable to send your message right now.', 'Не успяхме да изпратим съобщението ви в момента.'));
            const isMailConfigError = messageText.includes('CONTACT_SMTP_PASSWORD');

            setStatus({
                type: 'error',
                kicker: getText('contact.form.status.error_kicker', localizedFallback('Thread snagged', 'Нещо прекъсна')),
                title: isMailConfigError
                    ? getText('contact.form.status.mailbox_missing_key', localizedFallback('Mailbox needs its key', 'Липсва ключ за пощата'))
                    : getText('contact.form.status.almost_there', localizedFallback('Almost there', 'Почти готово')),
                message: isMailConfigError
                    ? getText('contact.form.status.mailbox_missing_password', localizedFallback('The form is ready, but the atelier mailbox still needs its password before it can send anything.', 'Формата е готова, но пощата на ателието още няма парола и не може да изпраща.'))
                    : messageText,
                detail: isMailConfigError
                    ? getText('contact.form.status.mailbox_fix_detail', localizedFallback('Add CONTACT_SMTP_PASSWORD in .env.local and this route will start sending immediately.', 'Добавете CONTACT_SMTP_PASSWORD в .env.local и изпращането ще заработи веднага.'))
                    : getText('contact.form.status.retry_detail_generic', localizedFallback('Nothing is lost. Tweak the field or refresh the human check and try once more.', 'Нищо не е изгубено. Коригирайте полето или обновете проверката и опитайте пак.')),
            });
            await loadCaptcha();
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSendDisabled = isSubmitting || isCaptchaLoading || !captchaToken;

    return (
        <form onSubmit={handleSubmit} className="border border-[#1C1C1C]/10 bg-white/60 p-6 md:p-8 rounded-sm flex flex-col gap-5">
            {hasProductContext && (
                <div className="flex flex-col gap-2 pb-4 border-b border-[#1C1C1C]/10">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">{getText('contact.form.product_context', localizedFallback('About This Piece', 'За този модел'))}</p>
                    <p className="text-sm font-serif text-[#1C1C1C]">{productContext}</p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.full_name" fallback={localizedFallback('Full Name', 'Име и фамилия')} editorLabel="Contact form full name label" />
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                </label>
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.email" fallback={localizedFallback('Email', 'Имейл')} editorLabel="Contact form email label" />
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                </label>
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.phone" fallback={localizedFallback('Phone', 'Телефон')} editorLabel="Contact form phone label" />
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
                    <EditableText contentKey="contact.form.location" fallback={localizedFallback('Location', 'Локация')} editorLabel="Contact form location label" />
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
                <EditableText contentKey="contact.form.query_type" fallback={localizedFallback('Query Type', 'Тип запитване')} editorLabel="Contact form query type label" />
                <select value={queryType} onChange={(event) => setQueryType(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                    {queryTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </label>

            {hasSelectionAttached && (
                <div className="border border-[#1C1C1C]/10 bg-white/45 p-4 md:p-5 rounded-sm flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45 mb-2"><EditableText contentKey="contact.form.selection.eyebrow" fallback={localizedFallback('Selection Attached', 'Избрани модели')} editorLabel="Contact form selection eyebrow" /></p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-tight text-[#1C1C1C]">{cartSnapshot.itemCount} {selectionUnit} / €{cartTotal.toFixed(2)}</p>
                        </div>
                        <a href="/cart" className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 transition-colors hover:text-[#1C1C1C]">
                            <EditableText contentKey="contact.form.selection.review_cart" fallback={localizedFallback('Review Cart', 'Прегледай количката')} editorLabel="Contact form review cart" />
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibleCartItems.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm px-4 py-3 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/38 mb-1">{getText('contact.form.selection.item', localizedFallback('Piece', 'Модел'))} {String(index + 1).padStart(2, '0')}</p>
                                    <p className="font-serif text-lg leading-tight text-[#1C1C1C] truncate">{item.name}</p>
                                </div>
                                <p className="shrink-0 text-sm text-[#1C1C1C]/60">€{Number(item.price).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>

                    {hiddenCartItemCount > 0 && (
                        <p className="text-xs leading-relaxed text-[#1C1C1C]/50">+ {hiddenCartItemCount} {getText('contact.form.selection.more', localizedFallback('more', 'още'))} {hiddenSelectionUnit} {getText('contact.form.selection.auto_attach', localizedFallback('will be attached automatically when you send the request.', 'ще бъдат добавени автоматично към запитването при изпращане.'))}</p>
                    )}
                </div>
            )}

            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                <EditableText contentKey="contact.form.message" fallback={localizedFallback('Message', 'Съобщение')} editorLabel="Contact form message label" />
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={7} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" placeholder={messagePlaceholder} />
            </label>

            <div className="border border-[#1C1C1C]/10 bg-white/45 p-4 md:p-5 rounded-sm flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45 mb-2"><EditableText contentKey="contact.form.captcha.eyebrow" fallback={localizedFallback('Human Check', 'Проверка')} editorLabel="Contact form captcha eyebrow" /></p>
                        <p className="font-serif text-xl md:text-2xl font-light leading-tight text-[#1C1C1C]">{captchaPrompt}</p>
                    </div>
                    <button type="button" onClick={() => void loadCaptcha(true)} className="h-11 px-4 border border-[#1C1C1C]/12 bg-white text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/60 transition-colors hover:border-[#1C1C1C] hover:text-[#1C1C1C]" disabled={isCaptchaLoading}>
                        {isCaptchaLoading ? <EditableText contentKey="contact.form.captcha.loading" fallback={localizedFallback('Loading', 'Зареждане')} editorLabel="Contact form captcha loading" /> : <EditableText contentKey="contact.form.captcha.refresh" fallback={localizedFallback('Refresh', 'Обнови')} editorLabel="Contact form captcha refresh" />}
                    </button>
                </div>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="contact.form.captcha.answer" fallback={localizedFallback('Answer', 'Отговор')} editorLabel="Contact form captcha answer label" />
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
                {isSubmitting ? <EditableText contentKey="contact.form.submit.sending" fallback={localizedFallback('Sending...', 'Изпращане...')} editorLabel="Contact form submit loading" /> : <EditableText contentKey="contact.form.submit.default" fallback={localizedFallback('Send Request', 'Изпрати запитване')} editorLabel="Contact form submit label" />}
            </button>
        </form>
    );
}