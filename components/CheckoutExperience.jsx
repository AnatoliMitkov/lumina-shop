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
    locationSuggestions,
    resolveUserCountry,
    splitStoredPhoneNumber,
} from '../utils/contact';
import {
    getDeliveryMethodOptions,
    normalizeDeliveryMethod,
    shippingScopeOptions,
} from '../utils/checkout';

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

export default function CheckoutExperience({ initialProfile, isSignedIn = false, schemaMessage = '' }) {
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
    const initialPhoneParts = splitStoredPhoneNumber(initialProfile?.phone || '');
    const initialCountryFromLocation = detectCountryFromLocationText(initialProfile?.location || '');
    const initialCountry = initialPhoneParts.country || initialCountryFromLocation || defaultContactCountry;
    const initialShippingScope = initialCountry === 'BG' ? 'domestic_bg' : 'worldwide';
    const [fullName, setFullName] = useState(initialProfile?.fullName || '');
    const [email, setEmail] = useState(initialProfile?.email || '');
    const [selectedCountry, setSelectedCountry] = useState(initialCountry);
    const [phoneNumber, setPhoneNumber] = useState(initialPhoneParts.nationalNumber || '');
    const [location, setLocation] = useState(initialProfile?.location || '');
    const [customerNotes, setCustomerNotes] = useState(initialProfile?.notes || '');
    const [shippingScope, setShippingScope] = useState(initialShippingScope);
    const [deliveryMethod, setDeliveryMethod] = useState(() => normalizeDeliveryMethod(initialShippingScope));
    const [shippingCountry, setShippingCountry] = useState(initialShippingScope === 'domestic_bg' ? 'Bulgaria' : '');
    const [shippingCity, setShippingCity] = useState('');
    const [shippingRegion, setShippingRegion] = useState('');
    const [shippingPostalCode, setShippingPostalCode] = useState('');
    const [shippingAddressLine1, setShippingAddressLine1] = useState('');
    const [shippingAddressLine2, setShippingAddressLine2] = useState('');
    const [shippingOfficeCode, setShippingOfficeCode] = useState('');
    const [shippingOfficeLabel, setShippingOfficeLabel] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [affiliateCode, setAffiliateCode] = useState('');
    const [submittedOrder, setSubmittedOrder] = useState(null);

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
        }
    }, [initialCountryFromLocation, initialPhoneParts.country]);

    useEffect(() => {
        const nextDeliveryMethod = normalizeDeliveryMethod(shippingScope, deliveryMethod);

        if (nextDeliveryMethod !== deliveryMethod) {
            setDeliveryMethod(nextDeliveryMethod);
        }

        if (shippingScope === 'domestic_bg') {
            setShippingCountry('Bulgaria');
        }
    }, [deliveryMethod, shippingScope]);

    const selectedCountryOption = getCountryPhoneOption(selectedCountry) || getCountryPhoneOption(defaultContactCountry);
    const deliveryMethodOptions = getDeliveryMethodOptions(shippingScope);
    const requiresOfficeDetails = deliveryMethod.endsWith('_office');
    const requiresAddressDetails = deliveryMethod.endsWith('_address');
    const structuredCheckoutReady = cartPersistenceMode === 'supabase';
    const orderSubtotal = Number(cartTotal || 0);
    const shippingAmount = 0;
    const discountAmount = 0;
    const orderTotal = Number((orderSubtotal - discountAmount + shippingAmount).toFixed(2));

    const handleSubmit = async (event) => {
        event.preventDefault();

        const order = await checkoutCart({
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
            subtotal: orderSubtotal,
            shippingAmount,
            discountAmount,
            total: orderTotal,
            discountCode,
            affiliateCode,
        });

        if (order) {
            setSubmittedOrder(order);
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
                            <input value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} required readOnly={shippingScope === 'domestic_bg'} className={`h-14 border border-[#1C1C1C]/12 px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] ${shippingScope === 'domestic_bg' ? 'bg-[#EFECE8]' : 'bg-white'}`} />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            City
                            <input value={shippingCity} onChange={(event) => setShippingCity(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Region
                            <input value={shippingRegion} onChange={(event) => setShippingRegion(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Postal Code
                            <input value={shippingPostalCode} onChange={(event) => setShippingPostalCode(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>

                        {requiresAddressDetails && (
                            <>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                    Address Line 1
                                    <input value={shippingAddressLine1} onChange={(event) => setShippingAddressLine1(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                </label>
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                    Address Line 2
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
                                    Speedy and ECONT office-map integration will plug into these fields later, so the structure is ready without forcing the carrier APIs into this pass.
                                </div>
                            </>
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
                            <input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} placeholder="PROMO" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Affiliate Code
                            <input value={affiliateCode} onChange={(event) => setAffiliateCode(event.target.value.toUpperCase())} placeholder="PARTNER" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                    </div>

                    <div className="border border-[#1C1C1C]/10 bg-[#EFECE8] rounded-sm px-4 py-4 text-sm leading-relaxed text-[#1C1C1C]/62">
                        Codes are captured with the order structure now, even though discount validation and affiliate compensation logic will be introduced in the next phase.
                    </div>
                </section>

                {(cartMessage || checkoutStatus === 'error') && (
                    <div className={`border rounded-sm px-4 py-4 text-sm leading-relaxed ${checkoutStatus === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C]/75'}`}>
                        {cartMessage}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    {structuredCheckoutReady ? (
                        <button disabled={checkoutStatus === 'submitting'} className={`hover-target inline-flex items-center justify-center px-8 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium transition-colors ${checkoutStatus === 'submitting' ? 'opacity-60' : 'hover:bg-black'}`}>
                            {checkoutStatus === 'submitting' ? 'Submitting Order...' : 'Submit Order Request'}
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
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Discount</p>
                            <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(discountAmount)}</p>
                        </div>
                        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Shipping</p>
                            <p className="font-serif text-2xl font-light text-[#1C1C1C]">Quote</p>
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
                        <div className="flex items-center justify-between gap-4"><span>Discount</span><span>{discountCode ? `${discountCode} / Quote Pending` : formatCurrency(discountAmount)}</span></div>
                        <div className="flex items-center justify-between gap-4"><span>Shipping</span><span>Quote Pending</span></div>
                    </div>

                    <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-4">
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/42">Estimated Total</span>
                        <span className="font-serif text-3xl font-light text-white">{formatCurrency(orderTotal)}</span>
                    </div>

                    <p className="text-sm leading-relaxed text-white/62">
                        This structure stores the codes and delivery preference now, while the atelier confirms final discounts, shipping, and any Bulgaria-specific carrier routing after review.
                    </p>
                </section>
            </aside>
        </div>
    );
}
