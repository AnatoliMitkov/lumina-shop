"use client";

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
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
                    <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/35">Piece</div>
                )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/40 mb-2">Piece {String(index + 1).padStart(2, '0')}</p>
                        <p className="font-serif text-2xl font-light leading-none break-words text-[#1C1C1C]">{item.name}</p>
                    </div>
                    <p className="shrink-0 text-sm uppercase tracking-[0.18em] text-[#1C1C1C]">{formatCurrency(item.price)}</p>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/46">
                    {item.category && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">{item.category}</span>}
                    {item.selected_size && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">Size {item.selected_size}</span>}
                    {item.selected_tone && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">Tone {item.selected_tone}</span>}
                </div>

                {customMeasurementSummary && (
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">Custom {customMeasurementSummary}</p>
                )}
            </div>
        </div>
    );
}

function ScopeButton({ label, copy, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`hover-target rounded-sm border p-4 text-left transition-colors ${active ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/72 text-[#1C1C1C] hover:bg-white'}`}
        >
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">Shipping Scope</p>
            <p className="mt-3 font-serif text-2xl font-light uppercase tracking-[0.08em] leading-none">{label}</p>
            <p className={`mt-3 text-sm leading-relaxed ${active ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}>{copy}</p>
        </button>
    );
}

function PaymentModeButton({ label, copy, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`hover-target rounded-sm border p-4 text-left transition-colors ${active ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/72 text-[#1C1C1C] hover:bg-white'}`}
        >
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">Checkout Route</p>
            <p className="mt-3 font-serif text-2xl font-light uppercase tracking-[0.08em] leading-none">{label}</p>
            <p className={`mt-3 text-sm leading-relaxed ${active ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}>{copy}</p>
        </button>
    );
}

function PricingValidationCard({ label, message, status }) {
    const shellClassName = status === 'invalid'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-[#1C1C1C]/10 bg-white/72 text-[#1C1C1C]/62';

    return (
        <div className={`rounded-sm border px-4 py-4 text-sm leading-relaxed ${shellClassName}`}>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-2 opacity-60">{label}</p>
            <p>{message}</p>
        </div>
    );
}

export default function CheckoutExperience({ initialProfile, isSignedIn = false, schemaMessage = '', stripeReady = false }) {
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
    const hasInventoryHints = cartItems.some((item) => item.inventory_count != null);
    const likelyMadeToOrder = hasInventoryHints && cartItems.some((item) => Number(item.inventory_count ?? 0) <= 0);
    const payNowEligible = structuredCheckoutReady && stripeReady && shippingScope === 'domestic_bg' && !likelyMadeToOrder;
    const paymentBlockers = [
        !stripeReady ? 'Secure online payment is not configured in this environment yet.' : '',
        shippingScope !== 'domestic_bg' ? 'Worldwide shipping still needs atelier review before payment.' : '',
        likelyMadeToOrder ? 'One or more selected pieces are made to order and still need manual review.' : '',
    ].filter(Boolean);

    useEffect(() => {
        if (!payNowEligible && checkoutMode !== 'manual_review') {
            setCheckoutMode('manual_review');
        }
    }, [checkoutMode, payNowEligible]);

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
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-4">Loading Checkout</p>
                <p className="font-serif text-2xl md:text-3xl font-light leading-tight text-[#1C1C1C]">Bringing the order details into place.</p>
            </section>
        );
    }

    if (submittedOrder) {
        return (
            <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-8 md:p-10 flex flex-col gap-8">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4">Order Submitted</p>
                    <h2 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.1em] leading-[0.92] text-[#1C1C1C]">{submittedOrder.orderCode || 'VA-PENDING'}</h2>
                </div>

                <p className="max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
                    {cartMessage || 'The atelier now has the customer and delivery structure needed to review this order.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Status</p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{submittedOrder.status || 'pending'}</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Pieces</p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{submittedOrder.itemCount || 0}</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Total</p>
                        <p className="font-serif text-3xl font-light text-[#1C1C1C]">{formatCurrency(submittedOrder.total || 0)}</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <a href="/account" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors">{isSignedIn ? 'Open Account Archive' : 'Create Account'}</a>
                    <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors">Return To Collections</a>
                </div>
            </section>
        );
    }

    if (cartItems.length === 0) {
        return (
            <section className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-8 md:p-10 flex flex-col gap-6">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">Checkout</p>
                <p className="font-serif text-2xl md:text-4xl font-light leading-tight text-[#1C1C1C]">There is nothing in the cart to submit yet.</p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors">Explore Collections</a>
                    <a href="/cart" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors">Back To Cart</a>
                </div>
            </section>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1.04fr_0.96fr] gap-10 md:gap-12 items-start">
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Client Details</p>
                        <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]">Checkout</h2>
                        <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
                            This step captures the customer and delivery context the atelier actually needs before confirming shipping, timeline, and next steps.
                        </p>
                    </div>

                    {!isSignedIn && (
                        <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            You can submit this as a guest, but signing in lets the checkout start with your saved account details and keeps the order visible in your archive.
                        </div>
                    )}

                    {!structuredCheckoutReady && (
                        <div className="border border-red-200 bg-red-50 rounded-sm px-4 py-4 text-sm leading-relaxed text-red-700">
                            Structured checkout is not active in this environment yet. Use the atelier contact route until Supabase order persistence is enabled.
                        </div>
                    )}

                    {schemaMessage && (
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            {schemaMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Full Name
                            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Email
                            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Phone
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
                    </div>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        Notes For Atelier
                        <textarea value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} rows={5} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                    </label>
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Delivery Structure</p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]">Shipping & Delivery</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shippingScopeOptions.map((option) => (
                            <ScopeButton
                                key={option.value}
                                label={option.label}
                                copy={option.copy}
                                active={shippingScope === option.value}
                                onClick={() => setShippingScope(option.value)}
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                            Delivery Method
                            <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                {deliveryMethodOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal">{deliveryMethodOptions.find((option) => option.value === deliveryMethod)?.copy}</span>
                        </label>

                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Country
                            {shippingScope === 'domestic_bg' ? (
                                <input value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} required readOnly className="h-14 border border-[#1C1C1C]/12 bg-[#EFECE8] px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            ) : (
                                <select value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    <option value="">Select country</option>
                                    {countryPhoneOptions.map((option) => (
                                        <option key={option.country} value={option.label}>{option.label}</option>
                                    ))}
                                </select>
                            )}
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            City
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
                            State / Province / Region
                            <input value={shippingRegion} onChange={(event) => setShippingRegion(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Postal Code
                            <input value={shippingPostalCode} onChange={(event) => setShippingPostalCode(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>

                        {needsCustomAddress && (
                            <>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                    {shippingScope === 'worldwide' ? 'Custom Address' : 'Address Line 1'}
                                    <input value={shippingAddressLine1} onChange={(event) => setShippingAddressLine1(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                    {shippingScope === 'worldwide' ? 'Address Details' : 'Address Line 2'}
                                    <input value={shippingAddressLine2} onChange={(event) => setShippingAddressLine2(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                            </>
                        )}

                        {requiresOfficeDetails && (
                            <>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                    Office Name / Label
                                    <input value={shippingOfficeLabel} onChange={(event) => setShippingOfficeLabel(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                    Office Code
                                    <input value={shippingOfficeCode} onChange={(event) => setShippingOfficeCode(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                                <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62 md:col-span-1">
                                    Speedy and ECONT office-map integration will plug into these fields once the carrier credentials and verified office endpoints are ready, so the checkout stays stable instead of guessing against undocumented APIs.
                                </div>
                            </>
                        )}

                        {shippingScope === 'worldwide' && (
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                Google Maps Pin Link
                                <input value={shippingMapUrl} onChange={(event) => setShippingMapUrl(event.target.value)} placeholder="https://maps.app.goo.gl/..." className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                <span className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal">Optional, but useful for villas, gated buildings, ateliers, or destinations that are easier to confirm with a dropped pin than a typed address alone.</span>
                            </label>
                        )}
                    </div>
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Codes & Attribution</p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]">Discounts & Affiliates</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Discount Code
                            <input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.replace(/\s+/g, '').toUpperCase())} placeholder="PROMO" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Affiliate Code
                            <input value={affiliateCode} onChange={(event) => setAffiliateCode(event.target.value.replace(/\s+/g, '').toUpperCase())} placeholder="PARTNER" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                    </div>

                    {(discountCode || affiliateCode) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {discountCode && (
                                <PricingValidationCard
                                    label="Discount Result"
                                    status={pricingPreview.discount.status}
                                    message={pricingPreview.discount.status === 'applied'
                                        ? `${pricingPreview.discount.code} saves ${formatPromotionCurrency(pricingPreview.discount.appliedAmount)}.`
                                        : pricingPreview.discount.message || 'The discount will be checked before submission.'}
                                />
                            )}

                            {affiliateCode && (
                                <PricingValidationCard
                                    label="Affiliate Result"
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
                        Codes are validated against the live studio settings. Shopper savings update immediately, domestic shipping follows the current studio rules, and worldwide routing still stays manual until confirmed.
                    </div>

                    {pricingMessage && (
                        <PricingValidationCard
                            label="Promotion Notice"
                            status={pricingPreview.pricingReady === false || pricingStatus === 'error' ? 'invalid' : 'ready'}
                            message={pricingMessage}
                        />
                    )}
                </section>

                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Payment Route</p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]">How This Order Moves</h3>
                    </div>

                    {payNowEligible ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PaymentModeButton
                                label="Online Payment"
                                copy="Move this domestic order into secure Stripe Checkout. Cards, Apple Pay, and Google Pay appear automatically when the device supports them."
                                active={checkoutMode === 'stripe_checkout'}
                                onClick={() => setCheckoutMode('stripe_checkout')}
                            />
                            <PaymentModeButton
                                label="Atelier Review"
                                copy="Keep the order in the manual review lane first, then confirm payment and next steps directly with the atelier."
                                active={checkoutMode === 'manual_review'}
                                onClick={() => setCheckoutMode('manual_review')}
                            />
                        </div>
                    ) : (
                        <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                            {paymentBlockers[0] || 'This order will stay in atelier review first.'}
                        </div>
                    )}

                    <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                        {checkoutMode === 'stripe_checkout'
                            ? 'The final secure payment amount will be reconfirmed on the server against the live catalog before Stripe Checkout opens.'
                            : 'Manual review is the safe lane for worldwide delivery, made-to-order work, or any order that still needs atelier confirmation before payment.'}
                    </div>
                </section>

                {(cartMessage || checkoutStatus === 'error') && (
                    <div className={`border rounded-sm px-4 py-4 text-sm leading-relaxed ${checkoutStatus === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C]/75'}`}>
                        {cartMessage}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    {structuredCheckoutReady ? (
                        <button disabled={checkoutStatus === 'submitting' || pricingStatus === 'loading' || hasPricingBlocker} className={`hover-target inline-flex items-center justify-center px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium transition-colors ${checkoutStatus === 'submitting' || pricingStatus === 'loading' || hasPricingBlocker ? 'opacity-60' : 'hover:bg-black'}`}>
                            {checkoutStatus === 'submitting'
                                ? 'Submitting Order...'
                                : checkoutStatus === 'redirecting'
                                    ? 'Opening Secure Payment...'
                                    : pricingStatus === 'loading'
                                        ? 'Validating Codes...'
                                        : checkoutMode === 'stripe_checkout'
                                            ? 'Continue To Secure Payment'
                                            : 'Submit Order Request'}
                        </button>
                    ) : (
                        <a href="/contact" className="hover-target transition-link inline-flex items-center justify-center px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors">Request Through Atelier</a>
                    )}
                    <a href="/cart" className="hover-target transition-link inline-flex items-center justify-center px-8 py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors">Back To Cart</a>
                </div>
            </form>

            <aside className="xl:sticky xl:top-28 flex flex-col gap-6">
                <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-6 md:p-8 flex flex-col gap-5">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Order Summary</p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]">Selection Review</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Pieces</p>
                            <p className="font-serif text-2xl font-light text-[#1C1C1C]">{cartItems.length}</p>
                        </div>
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Savings</p>
                            <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(discountAmount)}</p>
                        </div>
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Shipping</p>
                            <p className="font-serif text-xl font-light leading-tight text-[#1C1C1C]">{shippingDisplayValue}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {cartItems.map((item, index) => (
                            <CheckoutItem key={`${item.id}-${index}`} item={item} index={index} />
                        ))}
                    </div>
                </section>

                <section className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-8 flex flex-col gap-5">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/42 mb-3">Pricing Structure</p>
                        <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none">Current Totals</h3>
                    </div>

                    <div className="flex flex-col gap-3 text-sm md:text-base leading-relaxed text-white/72">
                        <div className="flex items-center justify-between gap-4"><span>Subtotal</span><span>{formatCurrency(orderSubtotal)}</span></div>
                        {discountCode && <div className="flex items-center justify-between gap-4"><span>Discount Code</span><span>{pricingPreview.discount.status === 'applied' ? `-${formatCurrency(pricingPreview.discount.appliedAmount)}` : pricingPreview.discount.message || discountCode}</span></div>}
                        {affiliateCode && <div className="flex items-center justify-between gap-4"><span>Affiliate</span><span>{pricingPreview.affiliate.status === 'applied' ? `-${formatCurrency(pricingPreview.affiliate.customerDiscountAmount)}` : pricingPreview.affiliate.status === 'tracked' ? 'Tracked' : pricingPreview.affiliate.message || affiliateCode}</span></div>}
                        <div className="flex items-center justify-between gap-4"><span>Total Savings</span><span>{formatCurrency(discountAmount)}</span></div>
                        <div className="flex items-center justify-between gap-4"><span>Shipping</span><span>{shippingDisplayValue}</span></div>
                    </div>

                    <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-4">
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/42">Estimated Total</span>
                        <span className="font-serif text-3xl font-light text-white">{formatCurrency(orderTotal)}</span>
                    </div>

                    <p className="text-sm leading-relaxed text-white/62">
                        {pricingPreview.shipping.message || 'Live codes now affect the checkout total immediately, while worldwide shipping remains manual until the atelier confirms the route.'}
                    </p>
                </section>
            </aside>
        </div>
    );
}
