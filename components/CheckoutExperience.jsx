"use client";

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { formatCustomMeasurementSummary } from '../utils/cart';
import {
    buildPhoneValue,
    countryPhoneOptions,
    defaultContactCountry,
    detectCountryFromLocationText,
    getCountryPhoneOption,
    getLocationSuggestionsForCountry,
    locationSuggestions,
    resolveUserCountry,
    splitStoredPhoneNumber,
} from '../utils/contact';
import {
    getDeliveryMethodOptions,
    normalizeDeliveryMethod,
    shippingScopeOptions,
} from '../utils/checkout';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, resolveLocalizedValue } from '../utils/language';
import { createBaseCheckoutPricing, formatPromotionCurrency } from '../utils/promotions';

function formatCurrency(value) {
    return `€${Number(value ?? 0).toFixed(2)}`;
}

function CheckoutItem({ item, index }) {
    const customMeasurementSummary = formatCustomMeasurementSummary(item);

    return (
        <div className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-4 flex gap-4 items-start">
            <div className="w-20 h-24 shrink-0 overflow-hidden rounded-sm bg-[#E4DED5]">
                {item.image_main ? (
                    <img src={item.image_main} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/35"><EditableText contentKey="checkout.item.image_fallback" fallback={localizedFallback('Piece', 'Модел')} editorLabel="Checkout item image fallback" /></div>
                )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/40 mb-2"><EditableText contentKey="checkout.item.eyebrow" fallback={localizedFallback('Piece', 'Модел')} editorLabel="Checkout item eyebrow" /> {String(index + 1).padStart(2, '0')}</p>
                        <p className="font-serif text-2xl font-light leading-none break-words text-[#1C1C1C]">{item.name}</p>
                    </div>
                    <p className="shrink-0 text-sm uppercase tracking-[0.18em] text-[#1C1C1C]">{formatCurrency(item.price)}</p>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/46">
                    {item.category && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">{item.category}</span>}
                    {item.selected_size && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2"><EditableText contentKey="checkout.item.size" fallback={localizedFallback('Size', 'Размер')} editorLabel="Checkout item size label" /> {item.selected_size}</span>}
                    {item.selected_tone && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2"><EditableText contentKey="checkout.item.tone" fallback={localizedFallback('Tone', 'Нюанс')} editorLabel="Checkout item tone label" /> {item.selected_tone}</span>}
                </div>

                {customMeasurementSummary && (
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42"><EditableText contentKey="checkout.item.custom" fallback={localizedFallback('Custom', 'По мярка')} editorLabel="Checkout item custom label" /> {customMeasurementSummary}</p>
                )}
            </div>
        </div>
    );
}

function ScopeButton({ label, copy, active, onClick, contentKeyPrefix }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`hover-target rounded-sm border p-4 text-left transition-colors ${active ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/72 text-[#1C1C1C] hover:bg-white'}`}
        >
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70"><EditableText contentKey="checkout.shipping_scope.kicker" fallback={localizedFallback('Shipping Scope', 'Обхват на доставката')} editorLabel="Checkout shipping scope kicker" /></p>
            <p className="mt-3 font-serif text-2xl font-light uppercase tracking-[0.08em] leading-none"><EditableText contentKey={`${contentKeyPrefix}.label`} fallback={label} editorLabel={`${contentKeyPrefix} shipping scope label`} /></p>
            <p className={`mt-3 text-sm leading-relaxed ${active ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}><EditableText contentKey={`${contentKeyPrefix}.copy`} fallback={copy} editorLabel={`${contentKeyPrefix} shipping scope copy`} /></p>
        </button>
    );
}

function PaymentModeButton({ label, copy, active, onClick, contentKeyPrefix }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`hover-target rounded-sm border p-4 text-left transition-colors ${active ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/72 text-[#1C1C1C] hover:bg-white'}`}
        >
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70"><EditableText contentKey="checkout.payment_route.kicker" fallback={localizedFallback('Checkout Route', 'Път на поръчката')} editorLabel="Checkout route kicker" /></p>
            <p className="mt-3 font-serif text-2xl font-light uppercase tracking-[0.08em] leading-none"><EditableText contentKey={`${contentKeyPrefix}.label`} fallback={label} editorLabel={`${contentKeyPrefix} payment route label`} /></p>
            <p className={`mt-3 text-sm leading-relaxed ${active ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}><EditableText contentKey={`${contentKeyPrefix}.copy`} fallback={copy} editorLabel={`${contentKeyPrefix} payment route copy`} /></p>
        </button>
    );
}

function PricingValidationCard({ label, labelKey, message, status }) {
    const shellClassName = status === 'invalid'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-[#1C1C1C]/10 bg-white/72 text-[#1C1C1C]/62';

    return (
        <div className={`rounded-sm border px-4 py-4 text-sm leading-relaxed ${shellClassName}`}>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-2 opacity-60"><EditableText contentKey={labelKey} fallback={label} editorLabel={`${labelKey} validation label`} /></p>
            <p>{message}</p>
        </div>
    );
}

function hasTypedValue(value) {
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function getMissingCheckoutFieldKeys({
    fullName = '',
    email = '',
    phoneNumber = '',
    shippingCountry = '',
    shippingCity = '',
    shippingRegion = '',
    shippingPostalCode = '',
    shippingAddressLine1 = '',
    shippingOfficeLabel = '',
    needsCustomAddress = false,
    requiresOfficeDetails = false,
} = {}) {
    const missingFieldKeys = [];

    if (!hasTypedValue(fullName)) {
        missingFieldKeys.push('fullName');
    }

    if (!hasTypedValue(email)) {
        missingFieldKeys.push('email');
    }

    if (!hasTypedValue(phoneNumber)) {
        missingFieldKeys.push('phoneNumber');
    }

    if (!hasTypedValue(shippingCountry)) {
        missingFieldKeys.push('shippingCountry');
    }

    if (!hasTypedValue(shippingCity)) {
        missingFieldKeys.push('shippingCity');
    }

    if (!hasTypedValue(shippingRegion)) {
        missingFieldKeys.push('shippingRegion');
    }

    if (!hasTypedValue(shippingPostalCode)) {
        missingFieldKeys.push('shippingPostalCode');
    }

    if (needsCustomAddress && !hasTypedValue(shippingAddressLine1)) {
        missingFieldKeys.push('shippingAddressLine1');
    }

    if (requiresOfficeDetails && !hasTypedValue(shippingOfficeLabel)) {
        missingFieldKeys.push('shippingOfficeLabel');
    }

    return missingFieldKeys;
}

export default function CheckoutExperience({ initialProfile, isSignedIn = false, schemaMessage = '', stripeReady = false }) {
    const siteCopy = useSiteCopy();
    const getText = (key, fallback) => siteCopy ? siteCopy.resolveText(key, fallback) : resolveLocalizedValue(fallback, DEFAULT_LANGUAGE);
    const router = useRouter();
    const {
        cartItems,
        cartTotal,
        cartPersistenceMode,
        hasLoadedCart,
        checkoutCart,
        checkoutStatus,
        cartMessage,
    } = useCart();
    const locationListId = useId();
    const shippingCityListId = useId();
    const initialPhoneParts = splitStoredPhoneNumber(initialProfile?.phone || '');
    const initialCountryFromLocation = detectCountryFromLocationText(initialProfile?.location || '');
    const initialCountry = initialPhoneParts.country || initialCountryFromLocation || defaultContactCountry;
    const initialShippingScope = initialCountry === 'BG' ? 'domestic_bg' : 'worldwide';
    const initialShippingCountry = initialShippingScope === 'domestic_bg'
        ? 'Bulgaria'
        : getCountryPhoneOption(initialCountry)?.label || '';
    const [fullName, setFullName] = useState(initialProfile?.fullName || '');
    const [email, setEmail] = useState(initialProfile?.email || '');
    const [selectedCountry, setSelectedCountry] = useState(initialCountry);
    const [phoneNumber, setPhoneNumber] = useState(initialPhoneParts.nationalNumber || '');
    const [location, setLocation] = useState(initialProfile?.location || '');
    const [customerNotes, setCustomerNotes] = useState(initialProfile?.notes || '');
    const [shippingScope, setShippingScope] = useState(initialShippingScope);
    const [deliveryMethod, setDeliveryMethod] = useState(() => normalizeDeliveryMethod(initialShippingScope));
    const [shippingCountry, setShippingCountry] = useState(initialShippingCountry);
    const [shippingCity, setShippingCity] = useState('');
    const [shippingRegion, setShippingRegion] = useState('');
    const [shippingPostalCode, setShippingPostalCode] = useState('');
    const [shippingAddressLine1, setShippingAddressLine1] = useState('');
    const [shippingOfficeLabel, setShippingOfficeLabel] = useState('');
    const [shippingMapUrl, setShippingMapUrl] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [affiliateCode, setAffiliateCode] = useState('');
    const [checkoutMode, setCheckoutMode] = useState(stripeReady ? 'stripe_checkout' : 'manual_review');
    const [submittedOrder, setSubmittedOrder] = useState(null);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [pricingPreview, setPricingPreview] = useState(() => createBaseCheckoutPricing({
        subtotal: Number(cartTotal || 0),
        shippingInput: {
            shippingScope: initialShippingScope,
            deliveryMethod: normalizeDeliveryMethod(initialShippingScope),
            shippingCountry: initialShippingCountry,
            shippingCity: '',
            shippingAddressLine1: '',
            shippingOfficeLabel: '',
        },
    }));
    const [pricingStatus, setPricingStatus] = useState('idle');
    const [pricingMessage, setPricingMessage] = useState('');

    useEffect(() => {
        if (initialPhoneParts.country || initialCountryFromLocation) {
            return;
        }

        const detectedCountry = resolveUserCountry({
            locales: [navigator.language, ...(navigator.languages || [])].filter(Boolean),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }) || defaultContactCountry;

        setSelectedCountry((currentCountry) => currentCountry === defaultContactCountry ? detectedCountry : currentCountry);

        if (detectedCountry === 'BG') {
            setShippingScope('domestic_bg');
            setShippingCountry('Bulgaria');
            return;
        }

        setShippingScope('worldwide');
        setShippingCountry(getCountryPhoneOption(detectedCountry)?.label || '');
    }, [initialCountryFromLocation, initialPhoneParts.country]);

    useEffect(() => {
        const nextDeliveryMethod = normalizeDeliveryMethod(shippingScope, deliveryMethod);

        if (nextDeliveryMethod !== deliveryMethod) {
            setDeliveryMethod(nextDeliveryMethod);
        }

        if (shippingScope === 'domestic_bg') {
            setShippingCountry('Bulgaria');
            setShippingMapUrl('');
            return;
        }

        const suggestedShippingCountry = getCountryPhoneOption(selectedCountry)?.label || '';

        if (!shippingCountry || shippingCountry === 'Bulgaria') {
            setShippingCountry(suggestedShippingCountry);
        }
    }, [deliveryMethod, selectedCountry, shippingCountry, shippingScope]);

    const selectedCountryOption = getCountryPhoneOption(selectedCountry) || getCountryPhoneOption(defaultContactCountry);
    const deliveryMethodFallbacks = {
        speedy_address: {
            label: localizedFallback('Speedy Address Delivery', 'Speedy до адрес'),
            copy: localizedFallback('Courier delivery to a Bulgarian address.', 'Куриерска доставка до адрес в България.'),
        },
        speedy_office: {
            label: localizedFallback('Speedy Office Pickup', 'Speedy до офис'),
            copy: localizedFallback('Pick up from a Speedy office in Bulgaria.', 'Получаване от офис на Speedy в България.'),
        },
        econt_address: {
            label: localizedFallback('ECONT Address Delivery', 'ECONT до адрес'),
            copy: localizedFallback('Courier delivery through ECONT to a Bulgarian address.', 'Куриерска доставка чрез ECONT до адрес в България.'),
        },
        econt_office: {
            label: localizedFallback('ECONT Office Pickup', 'ECONT до офис'),
            copy: localizedFallback('Pick up from an ECONT office in Bulgaria.', 'Получаване от офис на ECONT в България.'),
        },
        worldwide_quote: {
            label: localizedFallback('Worldwide Shipping Quote', 'Международна оферта за доставка'),
            copy: localizedFallback('The typed address, pinned map, and route details prepare the final worldwide shipping quote before dispatch.', 'Адресът, пинът от картата и маршрутните детайли подготвят финалната оферта за международна доставка преди изпращане.'),
        },
    };
    const localizedShippingScopeOptions = shippingScopeOptions.map((option) => ({
        ...option,
        label: getText(`checkout.delivery.scope.${option.value}.label`, option.value === 'domestic_bg' ? localizedFallback('Domestic Bulgaria', 'България') : localizedFallback('Worldwide', 'Извън България')),
        copy: getText(`checkout.delivery.scope.${option.value}.copy`, option.value === 'domestic_bg' ? localizedFallback('For deliveries inside Bulgaria, with automatic shipping coverage rules until the carrier APIs are connected.', 'За доставки в България с автоматични правила за покритие, докато куриерските API връзки още не са активни.') : localizedFallback('For clients outside Bulgaria, with delivery details used to prepare the worldwide shipping route and quote.', 'За клиенти извън България, където детайлите по доставката подготвят международния маршрут и офертата.')),
    }));
    const deliveryMethodOptions = getDeliveryMethodOptions(shippingScope).map((option) => ({
        ...option,
        label: getText(`checkout.delivery.method_option.${option.value}.label`, deliveryMethodFallbacks[option.value]?.label || option.label),
        copy: getText(`checkout.delivery.method_option.${option.value}.copy`, deliveryMethodFallbacks[option.value]?.copy || option.copy),
    }));
    const requiresOfficeDetails = deliveryMethod.endsWith('_office');
    const requiresAddressDetails = deliveryMethod.endsWith('_address');
    const needsCustomAddress = requiresAddressDetails || shippingScope === 'worldwide';
    const structuredCheckoutReady = cartPersistenceMode === 'supabase';
    const orderSubtotal = Number(cartTotal || 0);
    const shippingInput = {
        shippingScope,
        deliveryMethod,
        shippingCountry,
        shippingCity,
        shippingAddressLine1,
        shippingOfficeLabel,
    };
    const shippingAmount = pricingPreview.shippingAmount;
    const discountAmount = pricingPreview.discountAmount;
    const orderTotal = pricingPreview.total;
    const shippingDisplayValue = shippingAmount > 0 ? formatCurrency(shippingAmount) : pricingPreview.shipping.label;
    const shippingCitySuggestions = getLocationSuggestionsForCountry(shippingScope === 'domestic_bg' ? 'Bulgaria' : shippingCountry);
    const hasPricingBlocker = (Boolean(discountCode) && pricingPreview.discount.status === 'invalid')
        || (Boolean(affiliateCode) && pricingPreview.affiliate.status === 'invalid')
        || ((discountCode || affiliateCode) && pricingPreview.pricingReady === false);
    const missingRequiredFieldKeys = hasAttemptedSubmit
        ? getMissingCheckoutFieldKeys({
            fullName,
            email,
            phoneNumber,
            shippingCountry,
            shippingCity,
            shippingRegion,
            shippingPostalCode,
            shippingAddressLine1,
            shippingOfficeLabel,
            needsCustomAddress,
            requiresOfficeDetails,
        })
        : [];
    const missingRequiredFieldSet = new Set(missingRequiredFieldKeys);
    const hasMissingRequiredFields = missingRequiredFieldKeys.length > 0;
    const domesticManualLaneEnabled = shippingScope === 'domestic_bg';
    const hasInvalidPaymentItems = cartItems.some((item) => Number(item.price ?? 0) <= 0);
    const hasPayableOrderTotal = Number(orderTotal ?? 0) > 0;
    const canSubmitStripe = structuredCheckoutReady && stripeReady && !hasInvalidPaymentItems && hasPayableOrderTotal;
    const canSubmitPayOnDelivery = structuredCheckoutReady && domesticManualLaneEnabled && !hasInvalidPaymentItems && hasPayableOrderTotal;
    const paymentRouteReady = domesticManualLaneEnabled ? (canSubmitStripe || canSubmitPayOnDelivery) : canSubmitStripe;
    const paymentBlockers = [
        hasInvalidPaymentItems ? getText('checkout.payment_route.blockers.invalid_price', localizedFallback('One or more selected pieces do not have a valid live price yet.', 'Един или повече избрани модели още нямат валидна активна цена.')) : '',
        !hasPayableOrderTotal ? getText('checkout.payment_route.blockers.zero_total', localizedFallback('The live total must be above zero before checkout can continue.', 'Общата сума трябва да е над нула, преди checkout да продължи.')) : '',
        !stripeReady && !domesticManualLaneEnabled ? getText('checkout.payment_route.blockers.no_stripe', localizedFallback('Secure online payment is not configured in this environment yet.', 'Сигурното онлайн плащане още не е конфигурирано в тази среда.')) : '',
    ].filter(Boolean);
    const selectCountryLabel = getText('checkout.delivery.select_country', localizedFallback('Select country', 'Изберете държава'));
    const mapsPlaceholder = siteCopy ? siteCopy.resolveText('checkout.delivery.maps_placeholder', 'https://maps.app.goo.gl/...') : 'https://maps.app.goo.gl/...';
    const discountPlaceholder = siteCopy ? siteCopy.resolveText('checkout.codes.discount_placeholder', 'PROMO') : 'PROMO';
    const affiliatePlaceholder = siteCopy ? siteCopy.resolveText('checkout.codes.affiliate_placeholder', 'PARTNER') : 'PARTNER';
    const missingRequiredFieldsMessage = getText(
        'checkout.validation.missing_required',
        localizedFallback(
            'Go back and complete the highlighted client and delivery fields before payment. The atelier needs these details to deliver the order correctly.',
            'Върнете се и попълнете маркираните в червено клиентски и доставни полета преди плащането. Ателието има нужда от тези данни, за да достави поръчката коректно.'
        )
    );
    const requiredFieldHint = getText(
        'checkout.validation.required_field',
        localizedFallback(
            'Required before payment can continue.',
            'Задължително преди плащането да продължи.'
        )
    );
    const getFieldLabelClassName = (fieldKey, extraClassName = '') => `${extraClassName} flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] ${missingRequiredFieldSet.has(fieldKey) ? 'text-red-700' : 'text-[#1C1C1C]/55'}`.trim();
    const getFieldSurfaceClassName = (fieldKey, backgroundClassName = 'bg-white') => (
        missingRequiredFieldSet.has(fieldKey)
            ? 'border-red-300 bg-red-50 text-red-900 placeholder:text-red-400 focus:border-red-500'
            : `border-[#1C1C1C]/12 ${backgroundClassName} text-[#1C1C1C] focus:border-[#1C1C1C]`
    );
    const renderRequiredFieldHint = (fieldKey) => missingRequiredFieldSet.has(fieldKey)
        ? <span className="text-xs leading-relaxed normal-case tracking-normal text-red-600">{requiredFieldHint}</span>
        : null;
    const submitDisabled = checkoutStatus === 'submitting'
        || pricingStatus === 'loading'
        || hasPricingBlocker
        || (checkoutMode === 'stripe_checkout' ? !canSubmitStripe : !canSubmitPayOnDelivery);

    useEffect(() => {
        if (!domesticManualLaneEnabled) {
            if (checkoutMode !== 'stripe_checkout') {
                setCheckoutMode('stripe_checkout');
            }
            return;
        }

        if (checkoutMode === 'stripe_checkout' && !canSubmitStripe) {
            setCheckoutMode('manual_review');
            return;
        }

        if (checkoutMode === 'manual_review' && !canSubmitPayOnDelivery && canSubmitStripe) {
            setCheckoutMode('stripe_checkout');
        }
    }, [canSubmitPayOnDelivery, canSubmitStripe, checkoutMode, domesticManualLaneEnabled]);

    useEffect(() => {
        const basePricing = createBaseCheckoutPricing({ subtotal: orderSubtotal, shippingInput });

        if (!structuredCheckoutReady || (!discountCode && !affiliateCode)) {
            setPricingPreview(basePricing);
            setPricingStatus('ready');
            setPricingMessage('');
            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setPricingStatus('loading');

            try {
                const response = await fetch('/api/cart/pricing', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ subtotal: orderSubtotal, discountCode, affiliateCode, ...shippingInput }),
                    signal: controller.signal,
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || 'Unable to validate the promotion codes right now.');
                }

                if (controller.signal.aborted) {
                    return;
                }

                setPricingPreview(data.pricing || basePricing);
                setPricingStatus('ready');
                setPricingMessage(data.pricing?.message || '');
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setPricingPreview(basePricing);
                setPricingStatus('error');
                setPricingMessage(error.message || 'Unable to validate the promotion codes right now.');
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [
        affiliateCode,
        deliveryMethod,
        discountCode,
        orderSubtotal,
        shippingAddressLine1,
        shippingCity,
        shippingCountry,
        shippingOfficeLabel,
        shippingScope,
        structuredCheckoutReady,
    ]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextMissingRequiredFieldKeys = getMissingCheckoutFieldKeys({
            fullName,
            email,
            phoneNumber,
            shippingCountry,
            shippingCity,
            shippingRegion,
            shippingPostalCode,
            shippingAddressLine1,
            shippingOfficeLabel,
            needsCustomAddress,
            requiresOfficeDetails,
        });

        setHasAttemptedSubmit(true);

        if (nextMissingRequiredFieldKeys.length > 0) {
            const firstMissingField = event.currentTarget.querySelector(`[data-checkout-input="${nextMissingRequiredFieldKeys[0]}"]`);

            if (typeof firstMissingField?.scrollIntoView === 'function') {
                firstMissingField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            if (typeof firstMissingField?.focus === 'function') {
                window.setTimeout(() => {
                    firstMissingField.focus();
                }, 150);
            }

            return;
        }

        const result = await checkoutCart({
            fullName,
            email,
            phone: buildPhoneValue(selectedCountryOption?.dialCode || '', phoneNumber),
            location,
            customerNotes,
            shippingScope,
            deliveryMethod,
            shippingCountry,
            shippingCity,
            shippingRegion,
            shippingPostalCode,
            shippingAddressLine1,
            shippingOfficeLabel,
            shippingMapUrl,
            subtotal: orderSubtotal,
            shippingAmount,
            discountAmount,
            total: orderTotal,
            discountCode,
            affiliateCode,
            affiliateCommissionType: pricingPreview.affiliate.commissionType,
            affiliateCommissionValue: pricingPreview.affiliate.commissionValue,
            checkoutMode,
        });

        if (result?.redirectUrl) {
            window.location.assign(result.redirectUrl);
            return;
        }

        if (result?.order) {
            setSubmittedOrder(result.order);
            router.refresh();
        }
    };

    if (!hasLoadedCart) {
        return (
            <section className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-8 md:p-10">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="checkout.loading.eyebrow" fallback={localizedFallback('Loading Checkout', 'Зареждане на checkout')} editorLabel="Checkout loading eyebrow" /></p>
                <p className="font-serif text-2xl md:text-3xl font-light leading-tight text-[#1C1C1C]"><EditableText contentKey="checkout.loading.title" fallback={localizedFallback('Bringing the order details into place.', 'Подготвяме детайлите по поръчката.')} editorLabel="Checkout loading title" /></p>
            </section>
        );
    }

    if (submittedOrder) {
        return (
            <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-8 md:p-10 flex flex-col gap-8">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="checkout.submitted.eyebrow" fallback={localizedFallback('Order Submitted', 'Поръчката е изпратена')} editorLabel="Checkout submitted eyebrow" /></p>
                    <h2 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.1em] leading-[0.92] text-[#1C1C1C]">{submittedOrder.orderCode || 'VA-PENDING'}</h2>
                </div>

                <p className="max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
                    {cartMessage || <EditableText contentKey="checkout.submitted.copy" fallback={localizedFallback('The atelier now has the customer and delivery structure needed to review this order.', 'Ателието вече разполага с клиентските и доставните детайли, нужни за преглед на тази поръчка.')} editorLabel="Checkout submitted copy" />}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.submitted.status" fallback={localizedFallback('Status', 'Статус')} editorLabel="Checkout submitted status" /></p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{submittedOrder.status || getText('checkout.submitted.pending', localizedFallback('pending', 'в изчакване'))}</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.submitted.pieces" fallback={localizedFallback('Pieces', 'Модели')} editorLabel="Checkout submitted pieces" /></p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{submittedOrder.itemCount || 0}</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.submitted.total" fallback={localizedFallback('Total', 'Общо')} editorLabel="Checkout submitted total" /></p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{formatCurrency(submittedOrder.total || 0)}</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <a href="/account" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors">{isSignedIn ? <EditableText contentKey="checkout.submitted.open_account" fallback={localizedFallback('Open Account Archive', 'Отвори архива в профила')} editorLabel="Checkout submitted open account" /> : <EditableText contentKey="checkout.submitted.create_account" fallback={localizedFallback('Create Account', 'Създай профил')} editorLabel="Checkout submitted create account" />}</a>
                    <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.submitted.return_collections" fallback={localizedFallback('Return To Collections', 'Към колекциите')} editorLabel="Checkout submitted return collections" /></a>
                </div>
            </section>
        );
    }

    if (cartItems.length === 0) {
        return (
            <section className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-8 md:p-10 flex flex-col gap-6">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45"><EditableText contentKey="checkout.empty.eyebrow" fallback={localizedFallback('Checkout', 'Поръчка')} editorLabel="Checkout empty eyebrow" /></p>
                <p className="font-serif text-2xl md:text-4xl font-light leading-tight text-[#1C1C1C]"><EditableText contentKey="checkout.empty.title" fallback={localizedFallback('There is nothing in the cart to submit yet.', 'В количката още няма нищо за изпращане.')} editorLabel="Checkout empty title" /></p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors"><EditableText contentKey="checkout.empty.explore" fallback={localizedFallback('Explore Collections', 'Разгледай колекциите')} editorLabel="Checkout empty explore" /></a>
                    <a href="/cart" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.empty.back_cart" fallback={localizedFallback('Back To Cart', 'Назад към количката')} editorLabel="Checkout empty back to cart" /></a>
                </div>
            </section>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1.04fr_0.96fr] gap-10 md:gap-12 items-start">
            <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.form.client_details" fallback={localizedFallback('Client Details', 'Данни за клиента')} editorLabel="Checkout client details eyebrow" /></p>
                        <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.form.title" fallback={localizedFallback('Checkout', 'Поръчка')} editorLabel="Checkout form title" /></h2>
                        <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
                            <EditableText contentKey="checkout.form.copy" fallback={localizedFallback('This step captures the customer and delivery context the atelier actually needs before confirming shipping, timeline, and next steps.', 'Тук събираме клиентските и доставните детайли, които ателието реално изисква, преди да потвърди доставка, срок и следващи стъпки.')} editorLabel="Checkout form copy" />
                        </p>
                    </div>

                    {!isSignedIn && (
                        <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            <EditableText contentKey="checkout.form.guest_notice" fallback={localizedFallback('You can submit this as a guest, but signing in lets the checkout start with your saved account details and keeps the order visible in your archive.', 'Можете да изпратите и като гост, но при вход checkout започва със запазените данни от профила ви и поръчката остава видима в архива.')} editorLabel="Checkout guest notice" />
                        </div>
                    )}

                    {!structuredCheckoutReady && (
                        <div className="border border-red-200 bg-red-50 rounded-sm px-4 py-4 text-sm leading-relaxed text-red-700">
                            <EditableText contentKey="checkout.form.structured_notice" fallback={localizedFallback('Structured checkout is not active in this environment yet. Use the atelier contact route until Supabase order persistence is enabled.', 'Структурираният checkout още не е активен в тази среда. Използвайте контактната форма към ателието, докато записването на поръчки в Supabase бъде включено.')} editorLabel="Checkout structured notice" />
                        </div>
                    )}

                    {schemaMessage && (
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            {schemaMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className={getFieldLabelClassName('fullName')}>
                            <EditableText contentKey="checkout.form.full_name" fallback={localizedFallback('Full Name', 'Име и фамилия')} editorLabel="Checkout full name label" />
                            <input data-checkout-input="fullName" aria-invalid={missingRequiredFieldSet.has('fullName')} value={fullName} onChange={(event) => setFullName(event.target.value)} required className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('fullName')}`} />
                            {renderRequiredFieldHint('fullName')}
                        </label>
                        <label className={getFieldLabelClassName('email')}>
                            <EditableText contentKey="checkout.form.email" fallback={localizedFallback('Email', 'Имейл')} editorLabel="Checkout email label" />
                            <input data-checkout-input="email" aria-invalid={missingRequiredFieldSet.has('email')} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('email')}`} />
                            {renderRequiredFieldHint('email')}
                        </label>
                        <label className={getFieldLabelClassName('phoneNumber')}>
                            <EditableText contentKey="checkout.form.phone" fallback={localizedFallback('Phone', 'Телефон')} editorLabel="Checkout phone label" />
                            <div className="grid grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] gap-3">
                                <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)} aria-label={getText('checkout.form.phone_country_code', localizedFallback('Country calling code', 'Код на държавата'))} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {countryPhoneOptions.map((option) => (
                                        <option key={option.country} value={option.country}>{`${option.label} (${option.dialCode})`}</option>
                                    ))}
                                </select>
                                <input data-checkout-input="phoneNumber" aria-invalid={missingRequiredFieldSet.has('phoneNumber')} value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required autoComplete="tel-national" className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('phoneNumber')}`} />
                            </div>
                            {renderRequiredFieldHint('phoneNumber')}
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.form.location" fallback={localizedFallback('Location', 'Локация')} editorLabel="Checkout location label" />
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
                        <EditableText contentKey="checkout.form.notes" fallback={localizedFallback('Notes For Atelier', 'Бележки за ателието')} editorLabel="Checkout notes label" />
                        <textarea value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} rows={5} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                    </label>
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.delivery.eyebrow" fallback={localizedFallback('Delivery Structure', 'Структура на доставката')} editorLabel="Checkout delivery eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.delivery.title" fallback={localizedFallback('Shipping & Delivery', 'Доставка')} editorLabel="Checkout delivery title" /></h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {localizedShippingScopeOptions.map((option) => (
                            <ScopeButton
                                key={option.value}
                                label={option.label}
                                copy={option.copy}
                                active={shippingScope === option.value}
                                onClick={() => setShippingScope(option.value)}
                                contentKeyPrefix={`checkout.delivery.scope.${option.value}`}
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                            <EditableText contentKey="checkout.delivery.method" fallback={localizedFallback('Delivery Method', 'Метод на доставка')} editorLabel="Checkout delivery method label" />
                            <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                {deliveryMethodOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal">{deliveryMethodOptions.find((option) => option.value === deliveryMethod)?.copy}</span>
                        </label>

                        <label className={getFieldLabelClassName('shippingCountry')}>
                            <EditableText contentKey="checkout.delivery.country" fallback={localizedFallback('Country', 'Държава')} editorLabel="Checkout delivery country label" />
                            {shippingScope === 'domestic_bg' ? (
                                <input data-checkout-input="shippingCountry" aria-invalid={missingRequiredFieldSet.has('shippingCountry')} value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} required readOnly className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('shippingCountry', 'bg-[#EFECE8]')}`} />
                            ) : (
                                <select data-checkout-input="shippingCountry" aria-invalid={missingRequiredFieldSet.has('shippingCountry')} value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} required className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('shippingCountry')}`}>
                                    <option value="">{selectCountryLabel}</option>
                                    {countryPhoneOptions.map((option) => (
                                        <option key={option.country} value={option.label}>{option.label}</option>
                                    ))}
                                </select>
                            )}
                            {renderRequiredFieldHint('shippingCountry')}
                        </label>
                        <label className={getFieldLabelClassName('shippingCity')}>
                            <EditableText contentKey="checkout.delivery.city" fallback={localizedFallback('City', 'Град')} editorLabel="Checkout delivery city label" />
                            <>
                                <input data-checkout-input="shippingCity" aria-invalid={missingRequiredFieldSet.has('shippingCity')} value={shippingCity} onChange={(event) => setShippingCity(event.target.value)} list={shippingCityListId} autoComplete="address-level2" required className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('shippingCity')}`} />
                                <datalist id={shippingCityListId}>
                                    {shippingCitySuggestions.map((option) => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </>
                            {renderRequiredFieldHint('shippingCity')}
                        </label>
                        <label className={getFieldLabelClassName('shippingRegion')}>
                            <EditableText contentKey="checkout.delivery.region" fallback={localizedFallback('State / Province / Region', 'Област / щат / регион')} editorLabel="Checkout delivery region label" />
                            <input data-checkout-input="shippingRegion" aria-invalid={missingRequiredFieldSet.has('shippingRegion')} value={shippingRegion} onChange={(event) => setShippingRegion(event.target.value)} required className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('shippingRegion')}`} />
                            {renderRequiredFieldHint('shippingRegion')}
                        </label>
                        <label className={getFieldLabelClassName('shippingPostalCode')}>
                            <EditableText contentKey="checkout.delivery.postal_code" fallback={localizedFallback('Postal Code', 'Пощенски код')} editorLabel="Checkout delivery postal code label" />
                            <input data-checkout-input="shippingPostalCode" aria-invalid={missingRequiredFieldSet.has('shippingPostalCode')} value={shippingPostalCode} onChange={(event) => setShippingPostalCode(event.target.value)} required className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('shippingPostalCode')}`} />
                            {renderRequiredFieldHint('shippingPostalCode')}
                        </label>

                        {needsCustomAddress && (
                            <label className={getFieldLabelClassName('shippingAddressLine1', 'md:col-span-2')}>
                                {shippingScope === 'worldwide' ? <EditableText contentKey="checkout.delivery.custom_address" fallback={localizedFallback('Delivery Address', 'Адрес за доставка')} editorLabel="Checkout custom address label" /> : <EditableText contentKey="checkout.delivery.address_line_one" fallback={localizedFallback('Address Line 1', 'Адрес, ред 1')} editorLabel="Checkout address line one label" />}
                                <input data-checkout-input="shippingAddressLine1" aria-invalid={missingRequiredFieldSet.has('shippingAddressLine1')} value={shippingAddressLine1} onChange={(event) => setShippingAddressLine1(event.target.value)} required className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('shippingAddressLine1')}`} />
                                {renderRequiredFieldHint('shippingAddressLine1')}
                            </label>
                        )}

                        {requiresOfficeDetails && (
                            <label className={getFieldLabelClassName('shippingOfficeLabel', 'md:col-span-2')}>
                                <EditableText contentKey="checkout.delivery.office_label" fallback={localizedFallback('Pickup Office', 'Офис за получаване')} editorLabel="Checkout office label" />
                                <input data-checkout-input="shippingOfficeLabel" aria-invalid={missingRequiredFieldSet.has('shippingOfficeLabel')} value={shippingOfficeLabel} onChange={(event) => setShippingOfficeLabel(event.target.value)} required className={`h-14 border px-4 text-sm tracking-normal outline-none transition-colors ${getFieldSurfaceClassName('shippingOfficeLabel')}`} />
                                {renderRequiredFieldHint('shippingOfficeLabel')}
                            </label>
                        )}

                        {shippingScope === 'worldwide' && (
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                <EditableText contentKey="checkout.delivery.maps_link" fallback={localizedFallback('Google Maps Pin Link', 'Google Maps линк')} editorLabel="Checkout maps link label" />
                                <input value={shippingMapUrl} onChange={(event) => setShippingMapUrl(event.target.value)} placeholder={mapsPlaceholder} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                <span className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal"><EditableText contentKey="checkout.delivery.maps_helper" fallback={localizedFallback('Optional, but useful for villas, gated buildings, ateliers, or destinations that are easier to confirm with a dropped pin than a typed address alone.', 'По избор, но е полезно за вили, комплекси, ателиета или адреси, които се потвърждават по-лесно с пин.')} editorLabel="Checkout maps helper" /></span>
                            </label>
                        )}
                    </div>
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.codes.eyebrow" fallback={localizedFallback('Codes & Attribution', 'Кодове и атрибуция')} editorLabel="Checkout codes eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.codes.title" fallback={localizedFallback('Discounts & Affiliates', 'Отстъпки и партньори')} editorLabel="Checkout codes title" /></h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.codes.discount" fallback={localizedFallback('Discount Code', 'Код за отстъпка')} editorLabel="Checkout discount code label" />
                            <input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.replace(/\s+/g, '').toUpperCase())} placeholder={discountPlaceholder} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.codes.affiliate" fallback={localizedFallback('Affiliate Code', 'Партньорски код')} editorLabel="Checkout affiliate code label" />
                            <input value={affiliateCode} onChange={(event) => setAffiliateCode(event.target.value.replace(/\s+/g, '').toUpperCase())} placeholder={affiliatePlaceholder} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                    </div>

                    {(discountCode || affiliateCode) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {discountCode && (
                                <PricingValidationCard
                                    label={localizedFallback('Discount Result', 'Резултат от отстъпката')}
                                    labelKey="checkout.codes.discount_result"
                                    status={pricingPreview.discount.status}
                                    message={pricingPreview.discount.status === 'applied'
                                        ? `${pricingPreview.discount.code} ${getText('checkout.codes.discount_result.saves', localizedFallback('saves', 'спестява'))} ${formatPromotionCurrency(pricingPreview.discount.appliedAmount)}.`
                                        : pricingPreview.discount.message || getText('checkout.codes.discount_result.pending', localizedFallback('The discount will be checked before submission.', 'Отстъпката ще бъде проверена преди изпращане.'))}
                                />
                            )}

                            {affiliateCode && (
                                <PricingValidationCard
                                    label={localizedFallback('Affiliate Result', 'Резултат от партньорския код')}
                                    labelKey="checkout.codes.affiliate_result"
                                    status={pricingPreview.affiliate.status}
                                    message={pricingPreview.affiliate.status === 'applied'
                                        ? `${pricingPreview.affiliate.code} ${getText('checkout.codes.affiliate_result.saves', localizedFallback('saves', 'спестява'))} ${formatPromotionCurrency(pricingPreview.affiliate.customerDiscountAmount)} ${getText('checkout.codes.affiliate_result.and_tracks', localizedFallback('and tracks the partner attribution.', 'и отчита партньорската атрибуция.'))}`
                                        : pricingPreview.affiliate.status === 'tracked'
                                            ? pricingPreview.affiliate.message || `${pricingPreview.affiliate.code} ${getText('checkout.codes.affiliate_result.tracked', localizedFallback('tracks the partner attribution with no shopper discount.', 'отчита партньорската атрибуция без отстъпка за клиента.'))}`
                                            : pricingPreview.affiliate.message || getText('checkout.codes.affiliate_result.pending', localizedFallback('The affiliate code will be checked before submission.', 'Партньорският код ще бъде проверен преди изпращане.'))}
                                />
                            )}
                        </div>
                    )}

                    <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                        <EditableText contentKey="checkout.codes.notice" fallback={localizedFallback('Codes are validated against the live studio settings. Shopper savings update immediately, and delivery coverage follows the current studio rules before payment opens. For discount plus affiliate stacking, both codes must allow stacking; otherwise the discount keeps the shopper savings and the affiliate only tracks attribution.', 'Кодовете се валидират спрямо текущите студийни настройки. Спестяването за клиента се обновява веднага, а обхватът на доставката следва активните правила преди да се отвори плащането. За комбиниране на код за отстъпка с партньорски код и двата трябва да позволяват наслагване; в противен случай отстъпката остава за клиента, а партньорският код само отчита атрибуцията.')} editorLabel="Checkout codes notice" />
                    </div>

                    {pricingMessage && (
                        <PricingValidationCard
                            label={localizedFallback('Promotion Notice', 'Бележка за промоцията')}
                            labelKey="checkout.codes.promotion_notice"
                            status={pricingPreview.pricingReady === false || pricingStatus === 'error' ? 'invalid' : 'ready'}
                            message={pricingMessage}
                        />
                    )}
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.payment_route.eyebrow" fallback={localizedFallback('Payment Route', 'Път на плащането')} editorLabel="Checkout payment route eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.payment_route.title" fallback={localizedFallback('How This Order Moves', 'Как се движи тази поръчка')} editorLabel="Checkout payment route title" /></h3>
                    </div>

                    {paymentRouteReady ? (
                        domesticManualLaneEnabled ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {canSubmitStripe && (
                                    <PaymentModeButton
                                        label={localizedFallback('Online Payment', 'Онлайн плащане')}
                                        copy={localizedFallback('Move this order into secure Stripe payment. Cards, Apple Pay, and Google Pay appear automatically when the device supports them.', 'Прехвърлете поръчката към сигурно плащане със Stripe. Карти, Apple Pay и Google Pay се показват автоматично, когато устройството ги поддържа.')}
                                        active={checkoutMode === 'stripe_checkout'}
                                        onClick={() => setCheckoutMode('stripe_checkout')}
                                        contentKeyPrefix="checkout.payment_route.online_payment"
                                    />
                                )}
                                {canSubmitPayOnDelivery && (
                                    <PaymentModeButton
                                        label={localizedFallback('Pay On Delivery', 'Плащане при доставка')}
                                        copy={localizedFallback('Submit this Bulgarian order without paying online first. Payment is confirmed directly on delivery or pickup.', 'Изпратете тази поръчка за България без онлайн плащане предварително. Плащането се потвърждава при доставка или получаване.')}
                                        active={checkoutMode === 'manual_review'}
                                        onClick={() => setCheckoutMode('manual_review')}
                                        contentKeyPrefix="checkout.payment_route.local_delivery"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <PaymentModeButton
                                    label={localizedFallback('Online Payment', 'Онлайн плащане')}
                                    copy={localizedFallback('Pay securely by card online. Apple Pay and Google Pay appear automatically when the device supports them.', 'Платете сигурно с карта онлайн. Apple Pay и Google Pay се показват автоматично, когато устройството ги поддържа.')}
                                    active={checkoutMode === 'stripe_checkout'}
                                    onClick={() => setCheckoutMode('stripe_checkout')}
                                    contentKeyPrefix="checkout.payment_route.online_payment"
                                />
                            </div>
                        )
                    ) : (
                        <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            {paymentBlockers[0] || <EditableText contentKey="checkout.payment_route.manual_review" fallback={localizedFallback('Online payment is not available for this order yet.', 'Онлайн плащането още не е налично за тази поръчка.')} editorLabel="Checkout manual review notice" />}
                        </div>
                    )}

                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                        {checkoutMode === 'stripe_checkout'
                            ? <EditableText contentKey="checkout.payment_route.stripe_notice" fallback={localizedFallback('The final secure payment amount will be reconfirmed on the server against the live catalog before Stripe Checkout opens.', 'Крайната защитена сума ще бъде потвърдена отново на сървъра спрямо активния каталог, преди да се отвори Stripe Checkout.')} editorLabel="Checkout stripe notice" />
                            : domesticManualLaneEnabled
                                ? <EditableText contentKey="checkout.payment_route.domestic_notice" fallback={localizedFallback('Domestic Bulgaria can use either secure online payment now or a pay-on-delivery request confirmed directly on delivery or pickup.', 'За доставки в България можете да използвате сигурно онлайн плащане сега или заявка за плащане при доставка, потвърдена при получаване.')} editorLabel="Checkout domestic notice" />
                                : <EditableText contentKey="checkout.payment_route.manual_notice" fallback={localizedFallback('Online payment is required for this delivery scope before the order can continue.', 'За този обхват на доставка е нужно онлайн плащане, преди поръчката да продължи.')} editorLabel="Checkout manual notice" />}
                    </div>
                </section>

                {hasMissingRequiredFields && (
                    <div role="alert" className="border border-red-200 bg-red-50 rounded-sm px-4 py-4 text-sm leading-relaxed text-red-700">
                        {missingRequiredFieldsMessage}
                    </div>
                )}

                {(cartMessage || checkoutStatus === 'error') && (
                    <div className={`border rounded-sm px-4 py-4 text-sm leading-relaxed ${checkoutStatus === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C]/75'}`}>
                        {cartMessage}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    {structuredCheckoutReady ? (
                        <button disabled={submitDisabled} className={`hover-target inline-flex items-center justify-center px-8 py-5 text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium transition-colors ${submitDisabled ? 'bg-[#1C1C1C] opacity-60' : hasMissingRequiredFields ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1C1C1C] hover:bg-black'}`}>
                            {checkoutStatus === 'submitting'
                                ? <EditableText contentKey="checkout.submit.submitting" fallback={localizedFallback('Submitting Order...', 'Изпращане на поръчката...')} editorLabel="Checkout submitting" />
                                : checkoutStatus === 'redirecting'
                                    ? <EditableText contentKey="checkout.submit.redirecting" fallback={localizedFallback('Opening Secure Payment...', 'Отваряме сигурното плащане...')} editorLabel="Checkout redirecting" />
                                    : pricingStatus === 'loading'
                                        ? <EditableText contentKey="checkout.submit.validating" fallback={localizedFallback('Validating Codes...', 'Проверяваме кодовете...')} editorLabel="Checkout validating codes" />
                                        : hasMissingRequiredFields
                                            ? <EditableText contentKey="checkout.submit.complete_missing" fallback={localizedFallback('Complete Highlighted Fields First', 'Попълнете маркираните полета първо')} editorLabel="Checkout complete highlighted fields" />
                                        : checkoutMode === 'stripe_checkout'
                                            ? <EditableText contentKey="checkout.submit.secure_payment" fallback={localizedFallback('Continue To Secure Payment', 'Продължи към сигурно плащане')} editorLabel="Checkout continue to secure payment" />
                                            : domesticManualLaneEnabled
                                                ? <EditableText contentKey="checkout.submit.local_delivery" fallback={localizedFallback('Submit Pay On Delivery Request', 'Изпрати заявка за плащане при доставка')} editorLabel="Checkout local delivery submit" />
                                                : <EditableText contentKey="checkout.submit.order_request" fallback={localizedFallback('Submit Order Request', 'Изпрати заявка за поръчка')} editorLabel="Checkout order request submit" />}
                        </button>
                    ) : (
                        <a href="/contact" className="hover-target transition-link inline-flex items-center justify-center px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors"><EditableText contentKey="checkout.submit.request_atelier" fallback={localizedFallback('Request Through Atelier', 'Изпрати към ателието')} editorLabel="Checkout request through atelier" /></a>
                    )}
                    <a href="/cart" className="hover-target transition-link inline-flex items-center justify-center px-8 py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.submit.back_to_cart" fallback={localizedFallback('Back To Cart', 'Назад към количката')} editorLabel="Checkout back to cart" /></a>
                </div>
            </form>

            <aside className="flex flex-col gap-6 xl:sticky xl:top-28 xl:min-h-0 xl:h-[calc(100vh-7.5rem)]">
                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-5 xl:min-h-0 xl:flex-1">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.summary.eyebrow" fallback={localizedFallback('Order Summary', 'Обобщение на поръчката')} editorLabel="Checkout summary eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.summary.title" fallback={localizedFallback('Selection Review', 'Преглед на селекцията')} editorLabel="Checkout summary title" /></h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.summary.pieces" fallback={localizedFallback('Pieces', 'Модели')} editorLabel="Checkout summary pieces" /></p>
                            <p className="font-serif text-2xl font-light text-[#1C1C1C]">{cartItems.length}</p>
                        </div>
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.summary.savings" fallback={localizedFallback('Savings', 'Спестено')} editorLabel="Checkout summary savings" /></p>
                            <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(discountAmount)}</p>
                        </div>
                        <div className="col-span-2 border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 sm:col-span-1">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.summary.shipping" fallback={localizedFallback('Shipping', 'Доставка')} editorLabel="Checkout summary shipping" /></p>
                            <p className="font-serif text-xl font-light leading-tight text-[#1C1C1C]">{shippingDisplayValue}</p>
                        </div>
                    </div>

                    <div data-lenis-prevent-wheel className="flex flex-col gap-4 max-h-[20rem] overflow-y-auto overscroll-contain pr-1 md:max-h-[24rem] xl:min-h-0 xl:max-h-none xl:flex-1">
                        {cartItems.map((item, index) => (
                            <CheckoutItem key={`${item.id}-${index}`} item={item} index={index} />
                        ))}
                    </div>
                </section>

                <section className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-8 flex flex-col gap-5 shrink-0">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/42 mb-3"><EditableText contentKey="checkout.pricing.eyebrow" fallback={localizedFallback('Pricing Structure', 'Структура на цената')} editorLabel="Checkout pricing eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none"><EditableText contentKey="checkout.pricing.title" fallback={localizedFallback('Current Totals', 'Текущи суми')} editorLabel="Checkout pricing title" /></h3>
                    </div>

                    <div className="flex flex-col gap-3 text-sm md:text-base leading-relaxed text-white/72">
                        <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.subtotal" fallback={localizedFallback('Subtotal', 'Междинна сума')} editorLabel="Checkout pricing subtotal" /></span><span>{formatCurrency(orderSubtotal)}</span></div>
                        {discountCode && <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.discount_code" fallback={localizedFallback('Discount Code', 'Код за отстъпка')} editorLabel="Checkout pricing discount code" /></span><span>{pricingPreview.discount.status === 'applied' ? `-${formatCurrency(pricingPreview.discount.appliedAmount)}` : pricingPreview.discount.message || discountCode}</span></div>}
                        {affiliateCode && <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.affiliate" fallback={localizedFallback('Affiliate', 'Партньор')} editorLabel="Checkout pricing affiliate" /></span><span>{pricingPreview.affiliate.status === 'applied' ? `-${formatCurrency(pricingPreview.affiliate.customerDiscountAmount)}` : pricingPreview.affiliate.status === 'tracked' ? getText('checkout.pricing.affiliate_tracked', localizedFallback('Tracked Only', 'Само отчетено')) : pricingPreview.affiliate.message || affiliateCode}</span></div>}
                        <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.total_savings" fallback={localizedFallback('Total Savings', 'Общо спестено')} editorLabel="Checkout pricing total savings" /></span><span>{formatCurrency(discountAmount)}</span></div>
                        <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.shipping" fallback={localizedFallback('Shipping', 'Доставка')} editorLabel="Checkout pricing shipping" /></span><span>{shippingDisplayValue}</span></div>
                    </div>

                    <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-4">
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/42"><EditableText contentKey="checkout.pricing.estimated_total" fallback="Estimated Total" editorLabel="Checkout estimated total" /></span>
                        <span className="font-serif text-3xl font-light text-white">{formatCurrency(orderTotal)}</span>
                    </div>

                    <p className="text-sm leading-relaxed text-white/62">
                        {pricingPreview.shipping.message || <EditableText contentKey="checkout.pricing.notice" fallback="Live codes now affect the checkout total immediately, and delivery coverage follows the current studio rules before the order is submitted." editorLabel="Checkout pricing notice" />}
                    </p>
                </section>
            </aside>
        </div>
    );
}
