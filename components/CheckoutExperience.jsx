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
                    <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/35"><EditableText contentKey="checkout.item.image_fallback" fallback="Piece" editorLabel="Checkout item image fallback" /></div>
                )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/40 mb-2"><EditableText contentKey="checkout.item.eyebrow" fallback="Piece" editorLabel="Checkout item eyebrow" /> {String(index + 1).padStart(2, '0')}</p>
                        <p className="font-serif text-2xl font-light leading-none break-words text-[#1C1C1C]">{item.name}</p>
                    </div>
                    <p className="shrink-0 text-sm uppercase tracking-[0.18em] text-[#1C1C1C]">{formatCurrency(item.price)}</p>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/46">
                    {item.category && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">{item.category}</span>}
                    {item.selected_size && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2"><EditableText contentKey="checkout.item.size" fallback="Size" editorLabel="Checkout item size label" /> {item.selected_size}</span>}
                    {item.selected_tone && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2"><EditableText contentKey="checkout.item.tone" fallback="Tone" editorLabel="Checkout item tone label" /> {item.selected_tone}</span>}
                </div>

                {customMeasurementSummary && (
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42"><EditableText contentKey="checkout.item.custom" fallback="Custom" editorLabel="Checkout item custom label" /> {customMeasurementSummary}</p>
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
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70"><EditableText contentKey="checkout.shipping_scope.kicker" fallback="Shipping Scope" editorLabel="Checkout shipping scope kicker" /></p>
            <p className="mt-3 font-serif text-2xl font-light uppercase tracking-[0.08em] leading-none"><EditableText contentKey={`${contentKeyPrefix}.label`} fallback={label} editorLabel={`${label} shipping scope`} /></p>
            <p className={`mt-3 text-sm leading-relaxed ${active ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}><EditableText contentKey={`${contentKeyPrefix}.copy`} fallback={copy} editorLabel={`${label} shipping scope copy`} /></p>
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
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70"><EditableText contentKey="checkout.payment_route.kicker" fallback="Checkout Route" editorLabel="Checkout route kicker" /></p>
            <p className="mt-3 font-serif text-2xl font-light uppercase tracking-[0.08em] leading-none"><EditableText contentKey={`${contentKeyPrefix}.label`} fallback={label} editorLabel={`${label} payment route`} /></p>
            <p className={`mt-3 text-sm leading-relaxed ${active ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}><EditableText contentKey={`${contentKeyPrefix}.copy`} fallback={copy} editorLabel={`${label} payment route copy`} /></p>
        </button>
    );
}

function PricingValidationCard({ label, labelKey, message, status }) {
    const shellClassName = status === 'invalid'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-[#1C1C1C]/10 bg-white/72 text-[#1C1C1C]/62';

    return (
        <div className={`rounded-sm border px-4 py-4 text-sm leading-relaxed ${shellClassName}`}>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-2 opacity-60"><EditableText contentKey={labelKey} fallback={label} editorLabel={`${label} validation label`} /></p>
            <p>{message}</p>
        </div>
    );
}

export default function CheckoutExperience({ initialProfile, isSignedIn = false, schemaMessage = '', stripeReady = false }) {
    const siteCopy = useSiteCopy();
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
    const [shippingAddressLine2, setShippingAddressLine2] = useState('');
    const [shippingOfficeCode, setShippingOfficeCode] = useState('');
    const [shippingOfficeLabel, setShippingOfficeLabel] = useState('');
    const [shippingMapUrl, setShippingMapUrl] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [affiliateCode, setAffiliateCode] = useState('');
    const [checkoutMode, setCheckoutMode] = useState(stripeReady ? 'stripe_checkout' : 'manual_review');
    const [submittedOrder, setSubmittedOrder] = useState(null);
    const [pricingPreview, setPricingPreview] = useState(() => createBaseCheckoutPricing({
        subtotal: Number(cartTotal || 0),
        shippingInput: {
            shippingScope: initialShippingScope,
            deliveryMethod: normalizeDeliveryMethod(initialShippingScope),
            shippingCountry: initialShippingCountry,
            shippingCity: '',
            shippingAddressLine1: '',
            shippingOfficeLabel: '',
            shippingOfficeCode: '',
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
    const deliveryMethodOptions = getDeliveryMethodOptions(shippingScope);
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
        shippingOfficeCode,
    };
    const shippingAmount = pricingPreview.shippingAmount;
    const discountAmount = pricingPreview.discountAmount;
    const orderTotal = pricingPreview.total;
    const shippingDisplayValue = shippingAmount > 0 ? formatCurrency(shippingAmount) : pricingPreview.shipping.label;
    const shippingCitySuggestions = getLocationSuggestionsForCountry(shippingScope === 'domestic_bg' ? 'Bulgaria' : shippingCountry);
    const hasPricingBlocker = (Boolean(discountCode) && pricingPreview.discount.status === 'invalid')
        || (Boolean(affiliateCode) && pricingPreview.affiliate.status === 'invalid')
        || ((discountCode || affiliateCode) && pricingPreview.pricingReady === false);
    const domesticManualLaneEnabled = shippingScope === 'domestic_bg';
    const hasInvalidPaymentItems = cartItems.some((item) => Number(item.price ?? 0) <= 0);
    const hasPayableOrderTotal = Number(orderTotal ?? 0) > 0;
    const canSubmitStripe = structuredCheckoutReady && stripeReady && !hasInvalidPaymentItems && hasPayableOrderTotal;
    const canSubmitPayOnDelivery = structuredCheckoutReady && domesticManualLaneEnabled && !hasInvalidPaymentItems && hasPayableOrderTotal;
    const paymentRouteReady = domesticManualLaneEnabled ? (canSubmitStripe || canSubmitPayOnDelivery) : canSubmitStripe;
    const paymentBlockers = [
        hasInvalidPaymentItems ? (siteCopy ? siteCopy.resolveText('checkout.payment_route.blockers.invalid_price', 'One or more selected pieces do not have a valid live price yet.') : 'One or more selected pieces do not have a valid live price yet.') : '',
        !hasPayableOrderTotal ? (siteCopy ? siteCopy.resolveText('checkout.payment_route.blockers.zero_total', 'The live total must be above zero before checkout can continue.') : 'The live total must be above zero before checkout can continue.') : '',
        !stripeReady && !domesticManualLaneEnabled ? (siteCopy ? siteCopy.resolveText('checkout.payment_route.blockers.no_stripe', 'Secure online payment is not configured in this environment yet.') : 'Secure online payment is not configured in this environment yet.') : '',
    ].filter(Boolean);
    const selectCountryLabel = siteCopy ? siteCopy.resolveText('checkout.delivery.select_country', 'Select country') : 'Select country';
    const mapsPlaceholder = siteCopy ? siteCopy.resolveText('checkout.delivery.maps_placeholder', 'https://maps.app.goo.gl/...') : 'https://maps.app.goo.gl/...';
    const discountPlaceholder = siteCopy ? siteCopy.resolveText('checkout.codes.discount_placeholder', 'PROMO') : 'PROMO';
    const affiliatePlaceholder = siteCopy ? siteCopy.resolveText('checkout.codes.affiliate_placeholder', 'PARTNER') : 'PARTNER';

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
        shippingOfficeCode,
        shippingOfficeLabel,
        shippingScope,
        structuredCheckoutReady,
    ]);

    const handleSubmit = async (event) => {
        event.preventDefault();

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
            shippingAddressLine2,
            shippingOfficeCode,
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
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="checkout.loading.eyebrow" fallback="Loading Checkout" editorLabel="Checkout loading eyebrow" /></p>
                <p className="font-serif text-2xl md:text-3xl font-light leading-tight text-[#1C1C1C]"><EditableText contentKey="checkout.loading.title" fallback="Bringing the order details into place." editorLabel="Checkout loading title" /></p>
            </section>
        );
    }

    if (submittedOrder) {
        return (
            <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-8 md:p-10 flex flex-col gap-8">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="checkout.submitted.eyebrow" fallback="Order Submitted" editorLabel="Checkout submitted eyebrow" /></p>
                    <h2 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.1em] leading-[0.92] text-[#1C1C1C]">{submittedOrder.orderCode || 'VA-PENDING'}</h2>
                </div>

                <p className="max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
                    {cartMessage || <EditableText contentKey="checkout.submitted.copy" fallback="The atelier now has the customer and delivery structure needed to review this order." editorLabel="Checkout submitted copy" />}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.submitted.status" fallback="Status" editorLabel="Checkout submitted status" /></p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{submittedOrder.status || 'pending'}</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.submitted.pieces" fallback="Pieces" editorLabel="Checkout submitted pieces" /></p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{submittedOrder.itemCount || 0}</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.submitted.total" fallback="Total" editorLabel="Checkout submitted total" /></p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{formatCurrency(submittedOrder.total || 0)}</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <a href="/account" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors">{isSignedIn ? <EditableText contentKey="checkout.submitted.open_account" fallback="Open Account Archive" editorLabel="Checkout submitted open account" /> : <EditableText contentKey="checkout.submitted.create_account" fallback="Create Account" editorLabel="Checkout submitted create account" />}</a>
                    <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.submitted.return_collections" fallback="Return To Collections" editorLabel="Checkout submitted return collections" /></a>
                </div>
            </section>
        );
    }

    if (cartItems.length === 0) {
        return (
            <section className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-8 md:p-10 flex flex-col gap-6">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45"><EditableText contentKey="checkout.empty.eyebrow" fallback="Checkout" editorLabel="Checkout empty eyebrow" /></p>
                <p className="font-serif text-2xl md:text-4xl font-light leading-tight text-[#1C1C1C]"><EditableText contentKey="checkout.empty.title" fallback="There is nothing in the cart to submit yet." editorLabel="Checkout empty title" /></p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors"><EditableText contentKey="checkout.empty.explore" fallback="Explore Collections" editorLabel="Checkout empty explore" /></a>
                    <a href="/cart" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.empty.back_cart" fallback="Back To Cart" editorLabel="Checkout empty back to cart" /></a>
                </div>
            </section>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1.04fr_0.96fr] gap-10 md:gap-12 items-start">
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.form.client_details" fallback="Client Details" editorLabel="Checkout client details eyebrow" /></p>
                        <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.form.title" fallback="Checkout" editorLabel="Checkout form title" /></h2>
                        <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
                            <EditableText contentKey="checkout.form.copy" fallback="This step captures the customer and delivery context the atelier actually needs before confirming shipping, timeline, and next steps." editorLabel="Checkout form copy" />
                        </p>
                    </div>

                    {!isSignedIn && (
                        <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            <EditableText contentKey="checkout.form.guest_notice" fallback="You can submit this as a guest, but signing in lets the checkout start with your saved account details and keeps the order visible in your archive." editorLabel="Checkout guest notice" />
                        </div>
                    )}

                    {!structuredCheckoutReady && (
                        <div className="border border-red-200 bg-red-50 rounded-sm px-4 py-4 text-sm leading-relaxed text-red-700">
                            <EditableText contentKey="checkout.form.structured_notice" fallback="Structured checkout is not active in this environment yet. Use the atelier contact route until Supabase order persistence is enabled." editorLabel="Checkout structured notice" />
                        </div>
                    )}

                    {schemaMessage && (
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            {schemaMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.form.full_name" fallback="Full Name" editorLabel="Checkout full name label" />
                            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.form.email" fallback="Email" editorLabel="Checkout email label" />
                            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.form.phone" fallback="Phone" editorLabel="Checkout phone label" />
                            <div className="grid grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] gap-3">
                                <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)} aria-label="Country calling code" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {countryPhoneOptions.map((option) => (
                                        <option key={option.country} value={option.country}>{`${option.label} (${option.dialCode})`}</option>
                                    ))}
                                </select>
                                <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required autoComplete="tel-national" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </div>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.form.location" fallback="Location" editorLabel="Checkout location label" />
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
                        <EditableText contentKey="checkout.form.notes" fallback="Notes For Atelier" editorLabel="Checkout notes label" />
                        <textarea value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} rows={5} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                    </label>
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.delivery.eyebrow" fallback="Delivery Structure" editorLabel="Checkout delivery eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.delivery.title" fallback="Shipping & Delivery" editorLabel="Checkout delivery title" /></h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shippingScopeOptions.map((option) => (
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
                            <EditableText contentKey="checkout.delivery.method" fallback="Delivery Method" editorLabel="Checkout delivery method label" />
                            <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                {deliveryMethodOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal">{deliveryMethodOptions.find((option) => option.value === deliveryMethod)?.copy}</span>
                        </label>

                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.delivery.country" fallback="Country" editorLabel="Checkout delivery country label" />
                            {shippingScope === 'domestic_bg' ? (
                                <input value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} required readOnly className="h-14 border border-[#1C1C1C]/12 bg-[#EFECE8] px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            ) : (
                                <select value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    <option value="">{selectCountryLabel}</option>
                                    {countryPhoneOptions.map((option) => (
                                        <option key={option.country} value={option.label}>{option.label}</option>
                                    ))}
                                </select>
                            )}
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.delivery.city" fallback="City" editorLabel="Checkout delivery city label" />
                            <>
                                <input value={shippingCity} onChange={(event) => setShippingCity(event.target.value)} list={shippingCityListId} autoComplete="address-level2" required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                <datalist id={shippingCityListId}>
                                    {shippingCitySuggestions.map((option) => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.delivery.region" fallback="State / Province / Region" editorLabel="Checkout delivery region label" />
                            <input value={shippingRegion} onChange={(event) => setShippingRegion(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.delivery.postal_code" fallback="Postal Code" editorLabel="Checkout delivery postal code label" />
                            <input value={shippingPostalCode} onChange={(event) => setShippingPostalCode(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>

                        {needsCustomAddress && (
                            <>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                    {shippingScope === 'worldwide' ? <EditableText contentKey="checkout.delivery.custom_address" fallback="Custom Address" editorLabel="Checkout custom address label" /> : <EditableText contentKey="checkout.delivery.address_line_one" fallback="Address Line 1" editorLabel="Checkout address line one label" />}
                                    <input value={shippingAddressLine1} onChange={(event) => setShippingAddressLine1(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                    {shippingScope === 'worldwide' ? <EditableText contentKey="checkout.delivery.address_details" fallback="Address Details" editorLabel="Checkout address details label" /> : <EditableText contentKey="checkout.delivery.address_line_two" fallback="Address Line 2" editorLabel="Checkout address line two label" />}
                                    <input value={shippingAddressLine2} onChange={(event) => setShippingAddressLine2(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                            </>
                        )}

                        {requiresOfficeDetails && (
                            <>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                    <EditableText contentKey="checkout.delivery.office_label" fallback="Office Name / Label" editorLabel="Checkout office label" />
                                    <input value={shippingOfficeLabel} onChange={(event) => setShippingOfficeLabel(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                    <EditableText contentKey="checkout.delivery.office_code" fallback="Office Code" editorLabel="Checkout office code label" />
                                    <input value={shippingOfficeCode} onChange={(event) => setShippingOfficeCode(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                                <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62 md:col-span-1">
                                    <EditableText contentKey="checkout.delivery.office_notice" fallback="Speedy and ECONT office-map integration will plug into these fields once the carrier credentials and verified office endpoints are ready, so the checkout stays stable instead of guessing against undocumented APIs." editorLabel="Checkout office notice" />
                                </div>
                            </>
                        )}

                        {shippingScope === 'worldwide' && (
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                <EditableText contentKey="checkout.delivery.maps_link" fallback="Google Maps Pin Link" editorLabel="Checkout maps link label" />
                                <input value={shippingMapUrl} onChange={(event) => setShippingMapUrl(event.target.value)} placeholder={mapsPlaceholder} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                <span className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal"><EditableText contentKey="checkout.delivery.maps_helper" fallback="Optional, but useful for villas, gated buildings, ateliers, or destinations that are easier to confirm with a dropped pin than a typed address alone." editorLabel="Checkout maps helper" /></span>
                            </label>
                        )}
                    </div>
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.codes.eyebrow" fallback="Codes & Attribution" editorLabel="Checkout codes eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.codes.title" fallback="Discounts & Affiliates" editorLabel="Checkout codes title" /></h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.codes.discount" fallback="Discount Code" editorLabel="Checkout discount code label" />
                            <input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.replace(/\s+/g, '').toUpperCase())} placeholder={discountPlaceholder} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            <EditableText contentKey="checkout.codes.affiliate" fallback="Affiliate Code" editorLabel="Checkout affiliate code label" />
                            <input value={affiliateCode} onChange={(event) => setAffiliateCode(event.target.value.replace(/\s+/g, '').toUpperCase())} placeholder={affiliatePlaceholder} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                    </div>

                    {(discountCode || affiliateCode) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {discountCode && (
                                <PricingValidationCard
                                    label="Discount Result"
                                    labelKey="checkout.codes.discount_result"
                                    status={pricingPreview.discount.status}
                                    message={pricingPreview.discount.status === 'applied'
                                        ? `${pricingPreview.discount.code} saves ${formatPromotionCurrency(pricingPreview.discount.appliedAmount)}.`
                                        : pricingPreview.discount.message || 'The discount will be checked before submission.'}
                                />
                            )}

                            {affiliateCode && (
                                <PricingValidationCard
                                    label="Affiliate Result"
                                    labelKey="checkout.codes.affiliate_result"
                                    status={pricingPreview.affiliate.status}
                                    message={pricingPreview.affiliate.status === 'applied'
                                        ? `${pricingPreview.affiliate.code} saves ${formatPromotionCurrency(pricingPreview.affiliate.customerDiscountAmount)} and tracks the partner attribution.`
                                        : pricingPreview.affiliate.status === 'tracked'
                                            ? `${pricingPreview.affiliate.code} tracks the partner attribution with no shopper discount.`
                                            : pricingPreview.affiliate.message || 'The affiliate code will be checked before submission.'}
                                />
                            )}
                        </div>
                    )}

                    <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                        <EditableText contentKey="checkout.codes.notice" fallback="Codes are validated against the live studio settings. Shopper savings update immediately, and delivery coverage follows the current studio rules before payment opens." editorLabel="Checkout codes notice" />
                    </div>

                    {pricingMessage && (
                        <PricingValidationCard
                            label="Promotion Notice"
                            labelKey="checkout.codes.promotion_notice"
                            status={pricingPreview.pricingReady === false || pricingStatus === 'error' ? 'invalid' : 'ready'}
                            message={pricingMessage}
                        />
                    )}
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.payment_route.eyebrow" fallback="Payment Route" editorLabel="Checkout payment route eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.payment_route.title" fallback="How This Order Moves" editorLabel="Checkout payment route title" /></h3>
                    </div>

                    {paymentRouteReady ? (
                        domesticManualLaneEnabled ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {canSubmitStripe && (
                                    <PaymentModeButton
                                        label="Online Payment"
                                        copy="Move this order into secure Stripe payment. Cards, Apple Pay, and Google Pay appear automatically when the device supports them."
                                        active={checkoutMode === 'stripe_checkout'}
                                        onClick={() => setCheckoutMode('stripe_checkout')}
                                        contentKeyPrefix="checkout.payment_route.online_payment"
                                    />
                                )}
                                {canSubmitPayOnDelivery && (
                                    <PaymentModeButton
                                        label="Pay On Delivery"
                                        copy="Submit this Bulgarian order without paying online first. Payment is confirmed directly on delivery or pickup."
                                        active={checkoutMode === 'manual_review'}
                                        onClick={() => setCheckoutMode('manual_review')}
                                        contentKeyPrefix="checkout.payment_route.local_delivery"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <PaymentModeButton
                                    label="Online Payment"
                                    copy="Pay securely by card online. Apple Pay and Google Pay appear automatically when the device supports them."
                                    active={checkoutMode === 'stripe_checkout'}
                                    onClick={() => setCheckoutMode('stripe_checkout')}
                                    contentKeyPrefix="checkout.payment_route.online_payment"
                                />
                            </div>
                        )
                    ) : (
                        <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            {paymentBlockers[0] || <EditableText contentKey="checkout.payment_route.manual_review" fallback="Online payment is not available for this order yet." editorLabel="Checkout manual review notice" />}
                        </div>
                    )}

                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                        {checkoutMode === 'stripe_checkout'
                            ? <EditableText contentKey="checkout.payment_route.stripe_notice" fallback="The final secure payment amount will be reconfirmed on the server against the live catalog before Stripe Checkout opens." editorLabel="Checkout stripe notice" />
                            : domesticManualLaneEnabled
                                ? <EditableText contentKey="checkout.payment_route.domestic_notice" fallback="Domestic Bulgaria can use either secure online payment now or a pay-on-delivery request confirmed directly on delivery or pickup." editorLabel="Checkout domestic notice" />
                                : <EditableText contentKey="checkout.payment_route.manual_notice" fallback="Online payment is required for this delivery scope before the order can continue." editorLabel="Checkout manual notice" />}
                    </div>
                </section>

                {(cartMessage || checkoutStatus === 'error') && (
                    <div className={`border rounded-sm px-4 py-4 text-sm leading-relaxed ${checkoutStatus === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C]/75'}`}>
                        {cartMessage}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    {structuredCheckoutReady ? (
                        <button disabled={checkoutStatus === 'submitting' || pricingStatus === 'loading' || hasPricingBlocker || (checkoutMode === 'stripe_checkout' ? !canSubmitStripe : !canSubmitPayOnDelivery)} className={`hover-target inline-flex items-center justify-center px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium transition-colors ${checkoutStatus === 'submitting' || pricingStatus === 'loading' || hasPricingBlocker || (checkoutMode === 'stripe_checkout' ? !canSubmitStripe : !canSubmitPayOnDelivery) ? 'opacity-60' : 'hover:bg-black'}`}>
                            {checkoutStatus === 'submitting'
                                ? <EditableText contentKey="checkout.submit.submitting" fallback="Submitting Order..." editorLabel="Checkout submitting" />
                                : checkoutStatus === 'redirecting'
                                    ? <EditableText contentKey="checkout.submit.redirecting" fallback="Opening Secure Payment..." editorLabel="Checkout redirecting" />
                                    : pricingStatus === 'loading'
                                        ? <EditableText contentKey="checkout.submit.validating" fallback="Validating Codes..." editorLabel="Checkout validating codes" />
                                        : checkoutMode === 'stripe_checkout'
                                            ? <EditableText contentKey="checkout.submit.secure_payment" fallback="Continue To Secure Payment" editorLabel="Checkout continue to secure payment" />
                                            : domesticManualLaneEnabled
                                                ? <EditableText contentKey="checkout.submit.local_delivery" fallback="Submit Pay On Delivery Request" editorLabel="Checkout local delivery submit" />
                                                : <EditableText contentKey="checkout.submit.order_request" fallback="Submit Order Request" editorLabel="Checkout order request submit" />}
                        </button>
                    ) : (
                        <a href="/contact" className="hover-target transition-link inline-flex items-center justify-center px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors"><EditableText contentKey="checkout.submit.request_atelier" fallback="Request Through Atelier" editorLabel="Checkout request through atelier" /></a>
                    )}
                    <a href="/cart" className="hover-target transition-link inline-flex items-center justify-center px-8 py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.submit.back_to_cart" fallback="Back To Cart" editorLabel="Checkout back to cart" /></a>
                </div>
            </form>

            <aside className="flex flex-col gap-6 xl:sticky xl:top-28 xl:min-h-0 xl:h-[calc(100vh-7.5rem)]">
                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-5 xl:min-h-0 xl:flex-1">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="checkout.summary.eyebrow" fallback="Order Summary" editorLabel="Checkout summary eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]"><EditableText contentKey="checkout.summary.title" fallback="Selection Review" editorLabel="Checkout summary title" /></h3>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.summary.pieces" fallback="Pieces" editorLabel="Checkout summary pieces" /></p>
                            <p className="font-serif text-2xl font-light text-[#1C1C1C]">{cartItems.length}</p>
                        </div>
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.summary.savings" fallback="Savings" editorLabel="Checkout summary savings" /></p>
                            <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(discountAmount)}</p>
                        </div>
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.summary.shipping" fallback="Shipping" editorLabel="Checkout summary shipping" /></p>
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
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/42 mb-3"><EditableText contentKey="checkout.pricing.eyebrow" fallback="Pricing Structure" editorLabel="Checkout pricing eyebrow" /></p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none"><EditableText contentKey="checkout.pricing.title" fallback="Current Totals" editorLabel="Checkout pricing title" /></h3>
                    </div>

                    <div className="flex flex-col gap-3 text-sm md:text-base leading-relaxed text-white/72">
                        <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.subtotal" fallback="Subtotal" editorLabel="Checkout pricing subtotal" /></span><span>{formatCurrency(orderSubtotal)}</span></div>
                        {discountCode && <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.discount_code" fallback="Discount Code" editorLabel="Checkout pricing discount code" /></span><span>{pricingPreview.discount.status === 'applied' ? `-${formatCurrency(pricingPreview.discount.appliedAmount)}` : pricingPreview.discount.message || discountCode}</span></div>}
                        {affiliateCode && <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.affiliate" fallback="Affiliate" editorLabel="Checkout pricing affiliate" /></span><span>{pricingPreview.affiliate.status === 'applied' ? `-${formatCurrency(pricingPreview.affiliate.customerDiscountAmount)}` : pricingPreview.affiliate.status === 'tracked' ? 'Tracked' : pricingPreview.affiliate.message || affiliateCode}</span></div>}
                        <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.total_savings" fallback="Total Savings" editorLabel="Checkout pricing total savings" /></span><span>{formatCurrency(discountAmount)}</span></div>
                        <div className="flex items-center justify-between gap-4"><span><EditableText contentKey="checkout.pricing.shipping" fallback="Shipping" editorLabel="Checkout pricing shipping" /></span><span>{shippingDisplayValue}</span></div>
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
