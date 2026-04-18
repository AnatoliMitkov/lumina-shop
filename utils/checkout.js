export const shippingScopeOptions = [
    {
        value: 'domestic_bg',
        label: 'Domestic Bulgaria',
        copy: 'For deliveries inside Bulgaria, with automatic shipping coverage rules until the carrier APIs are connected.',
    },
    {
        value: 'worldwide',
        label: 'Worldwide',
        copy: 'For clients outside Bulgaria while the atelier reviews the route, destination, and final shipping quote manually.',
    },
];

export const shippingBenefitOptions = [
    { value: 'none', label: 'No Shipping Override' },
    { value: 'sender_covers', label: 'Covered by Sender' },
    { value: 'receiver_covers', label: 'Covered by Receiver' },
];

const FREE_DOMESTIC_SHIPPING_THRESHOLD = 150;

export const orderStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'fulfilled', label: 'Fulfilled' },
    { value: 'cancelled', label: 'Cancelled' },
];

const deliveryMethodOptionsByScope = {
    domestic_bg: [
        {
            value: 'speedy_address',
            label: 'Speedy Address Delivery',
            copy: 'Courier delivery to a Bulgarian address.',
        },
        {
            value: 'speedy_office',
            label: 'Speedy Office Pickup',
            copy: 'Structure ready for Speedy office selection and map integration later.',
        },
        {
            value: 'econt_address',
            label: 'ECONT Address Delivery',
            copy: 'Courier delivery through ECONT to a Bulgarian address.',
        },
        {
            value: 'econt_office',
            label: 'ECONT Office Pickup',
            copy: 'Structure ready for ECONT office selection and map integration later.',
        },
    ],
    worldwide: [
        {
            value: 'worldwide_quote',
            label: 'Worldwide Shipping Quote',
            copy: 'The atelier reviews the typed address, pinned map, and route before confirming the final worldwide shipping quote.',
        },
    ],
};

const shippingBenefitLabelMap = shippingBenefitOptions.reduce((labelMap, option) => {
    labelMap[option.value] = option.label;
    return labelMap;
}, {});

const deliveryMethodLabelMap = Object.values(deliveryMethodOptionsByScope)
    .flat()
    .reduce((labelMap, option) => {
        labelMap[option.value] = option.label;
        return labelMap;
    }, {});

function toText(value, maxLength = 160) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().slice(0, maxLength);
}

function toAmount(value) {
    const parsedValue = Number.parseFloat(String(value ?? 0));

    if (!Number.isFinite(parsedValue)) {
        return 0;
    }

    return Number(parsedValue.toFixed(2));
}

export function normalizeShippingScope(value) {
    return value === 'domestic_bg' ? 'domestic_bg' : 'worldwide';
}

export function normalizeShippingBenefit(value) {
    return shippingBenefitOptions.some((option) => option.value === value) ? value : 'none';
}

export function buildShippingBenefitLabel(value = '') {
    return shippingBenefitLabelMap[normalizeShippingBenefit(value)] || shippingBenefitLabelMap.none;
}

export function getDeliveryMethodOptions(shippingScope = 'worldwide') {
    return deliveryMethodOptionsByScope[normalizeShippingScope(shippingScope)] || deliveryMethodOptionsByScope.worldwide;
}

export function normalizeDeliveryMethod(shippingScope, value) {
    const options = getDeliveryMethodOptions(shippingScope);
    const matchingOption = options.find((option) => option.value === value);

    return matchingOption?.value || options[0]?.value || 'worldwide_quote';
}

function hasOfficeDeliveryDetails({ shippingCity = '', shippingOfficeLabel = '', shippingOfficeCode = '' } = {}) {
    return Boolean(toText(shippingCity, 120) && (toText(shippingOfficeLabel, 160) || toText(shippingOfficeCode, 80)));
}

function hasAddressDeliveryDetails({ shippingCountry = '', shippingCity = '', shippingAddressLine1 = '' } = {}) {
    return Boolean(toText(shippingCountry, 120) && toText(shippingCity, 120) && toText(shippingAddressLine1, 160));
}

export function hasCheckoutDeliveryDestination({
    shippingScope = 'worldwide',
    deliveryMethod = '',
    shippingCountry = '',
    shippingCity = '',
    shippingAddressLine1 = '',
    shippingOfficeLabel = '',
    shippingOfficeCode = '',
} = {}) {
    const normalizedScope = normalizeShippingScope(shippingScope);
    const normalizedMethod = normalizeDeliveryMethod(normalizedScope, deliveryMethod);

    if (normalizedScope === 'worldwide') {
        return hasAddressDeliveryDetails({ shippingCountry, shippingCity, shippingAddressLine1 });
    }

    if (normalizedMethod.endsWith('_office')) {
        return hasOfficeDeliveryDetails({ shippingCity, shippingOfficeLabel, shippingOfficeCode });
    }

    if (normalizedMethod.endsWith('_address')) {
        return hasAddressDeliveryDetails({ shippingCountry: 'Bulgaria', shippingCity, shippingAddressLine1 });
    }

    return Boolean(toText(shippingCity, 120));
}

export function evaluateCheckoutShipping({
    subtotal = 0,
    shippingScope = 'worldwide',
    deliveryMethod = '',
    shippingCountry = '',
    shippingCity = '',
    shippingAddressLine1 = '',
    shippingOfficeLabel = '',
    shippingOfficeCode = '',
    shippingBenefit = 'none',
} = {}) {
    const normalizedSubtotal = toAmount(subtotal);
    const normalizedScope = normalizeShippingScope(shippingScope);
    const normalizedMethod = normalizeDeliveryMethod(normalizedScope, deliveryMethod);
    const normalizedBenefit = normalizeShippingBenefit(shippingBenefit);
    const destinationReady = hasCheckoutDeliveryDestination({
        shippingScope: normalizedScope,
        deliveryMethod: normalizedMethod,
        shippingCountry,
        shippingCity,
        shippingAddressLine1,
        shippingOfficeLabel,
        shippingOfficeCode,
    });

    if (normalizedScope === 'worldwide') {
        return {
            amount: 0,
            status: 'pending_quote',
            label: 'Quote pending',
            message: destinationReady
                ? 'Worldwide shipping is still confirmed manually after the atelier reviews the address and route.'
                : 'Add the country, city, and custom address so the atelier can prepare the worldwide shipping quote.',
            payer: 'pending',
            source: 'worldwide',
        };
    }

    if (!destinationReady) {
        return {
            amount: 0,
            status: 'details_required',
            label: 'Add delivery details',
            message: 'Enter the Bulgarian city and exact address or pickup office to determine the shipping coverage.',
            payer: 'pending',
            source: 'details',
        };
    }

    if (normalizedBenefit === 'sender_covers') {
        return {
            amount: 0,
            status: 'sender_covers',
            label: 'Covered by sender',
            message: 'This code marks the domestic shipping as atelier-covered.',
            payer: 'sender',
            source: 'discount_code',
        };
    }

    if (normalizedBenefit === 'receiver_covers') {
        return {
            amount: 0,
            status: 'receiver_covers',
            label: 'Covered by receiver',
            message: 'Domestic shipping is payable by the receiver on delivery or pickup.',
            payer: 'receiver',
            source: 'discount_code',
        };
    }

    if (normalizedSubtotal >= FREE_DOMESTIC_SHIPPING_THRESHOLD) {
        return {
            amount: 0,
            status: 'sender_covers',
            label: 'Free shipping',
            message: `Domestic orders above €${FREE_DOMESTIC_SHIPPING_THRESHOLD.toFixed(2)} qualify for atelier-covered shipping.`,
            payer: 'sender',
            source: 'threshold',
        };
    }

    return {
        amount: 0,
        status: 'receiver_covers',
        label: 'Covered by receiver',
        message: 'Domestic shipping is payable by the receiver once the route is confirmed.',
        payer: 'receiver',
        source: 'default',
    };
}

function hashOrderSeed(value = '') {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36).toUpperCase();
}

export function buildOrderCode(seed = '') {
    const compactSeed = String(seed || Date.now())
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
    const prefix = compactSeed.slice(0, 4).padEnd(4, '0');
    const suffix = hashOrderSeed(compactSeed || String(Date.now()))
        .padStart(8, '0')
        .slice(-8);

    return `VA-${prefix}${suffix}`;
}

export function normalizeCheckoutPayload(payload = {}) {
    const shippingScope = normalizeShippingScope(payload?.shippingScope);
    const deliveryMethod = normalizeDeliveryMethod(shippingScope, payload?.deliveryMethod);
    const shippingCountry = shippingScope === 'domestic_bg'
        ? 'Bulgaria'
        : toText(payload?.shippingCountry, 120);

    return {
        customer: {
            fullName: toText(payload?.fullName, 120),
            email: toText(payload?.email, 160),
            phone: toText(payload?.phone, 60),
            location: toText(payload?.location, 120),
            notes: toText(payload?.customerNotes, 800),
        },
        delivery: {
            shippingScope,
            deliveryMethod,
            shippingCountry,
            shippingCity: toText(payload?.shippingCity, 120),
            shippingRegion: toText(payload?.shippingRegion, 120),
            shippingPostalCode: toText(payload?.shippingPostalCode, 40),
            shippingAddressLine1: toText(payload?.shippingAddressLine1, 160),
            shippingAddressLine2: toText(payload?.shippingAddressLine2, 160),
            shippingOfficeCode: toText(payload?.shippingOfficeCode, 80),
            shippingOfficeLabel: toText(payload?.shippingOfficeLabel, 160),
            shippingMapUrl: toText(payload?.shippingMapUrl, 500),
        },
        pricing: {
            subtotal: toAmount(payload?.subtotal),
            shippingAmount: toAmount(payload?.shippingAmount),
            discountAmount: toAmount(payload?.discountAmount),
            total: toAmount(payload?.total),
            discountCode: toText(payload?.discountCode, 64).toUpperCase(),
            affiliateCode: toText(payload?.affiliateCode, 64).toUpperCase(),
            affiliateCommissionType: toText(payload?.affiliateCommissionType, 32),
            affiliateCommissionValue: toAmount(payload?.affiliateCommissionValue),
        },
    };
}

export function buildDeliveryMethodLabel(value = '') {
    return deliveryMethodLabelMap[value] || 'Delivery details pending';
}

export function buildShippingScopeLabel(value = '') {
    return shippingScopeOptions.find((option) => option.value === value)?.label || 'Worldwide';
}

export function buildOrderReference(order = {}) {
    if (order?.order_code) {
        return order.order_code;
    }

    if (order?.id) {
        return `VA-${String(order.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
    }

    return 'VA-PENDING';
}

export function buildOrderCustomerLabel(order = {}) {
    return order?.customer_name || order?.customer_email || order?.customer_snapshot?.email || 'Client request';
}

export function buildOrderDeliverySummary(order = {}) {
    const scopeLabel = buildShippingScopeLabel(order?.shipping_scope);
    const methodLabel = buildDeliveryMethodLabel(order?.delivery_method);

    if (!order?.delivery_method && !order?.shipping_scope) {
        return 'Delivery details still need to be confirmed.';
    }

    return `${scopeLabel} / ${methodLabel}`;
}

export function buildOrderAddressSummary(order = {}) {
    const addressParts = [
        order?.shipping_address_line1,
        order?.shipping_address_line2,
        order?.shipping_city,
        order?.shipping_region,
        order?.shipping_postal_code,
        order?.shipping_country,
    ].filter(Boolean);

    if (addressParts.length > 0) {
        return addressParts.join(', ');
    }

    const officeParts = [order?.shipping_office_label, order?.shipping_office_code].filter(Boolean);

    if (officeParts.length > 0) {
        return officeParts.join(' / ');
    }

    if (buildOrderMapUrl(order)) {
        return 'Pinned map location shared by the client.';
    }

    return 'Delivery destination will be confirmed by the atelier.';
}

export function buildOrderDiscountSummary(order = {}) {
    const discountCode = toText(order?.discount_code || order?.pricing_snapshot?.discount_code, 64);
    const discountLabel = toText(order?.pricing_snapshot?.discount_label, 120);
    const affiliateCode = toText(order?.affiliate_code || order?.pricing_snapshot?.affiliate_code, 64);
    const affiliatePartnerName = toText(order?.pricing_snapshot?.affiliate_partner_name, 120);
    const totalSavings = toAmount(order?.discount_amount ?? order?.pricing_snapshot?.discount_amount ?? 0);
    const segments = [];

    if (discountCode) {
        segments.push(discountLabel ? `Discount ${discountCode} (${discountLabel})` : `Discount ${discountCode}`);
    }

    if (affiliateCode) {
        segments.push(affiliatePartnerName ? `Affiliate ${affiliateCode} (${affiliatePartnerName})` : `Affiliate ${affiliateCode}`);
    }

    if (totalSavings > 0) {
        segments.push(`Saved €${totalSavings.toFixed(2)}`);
    }

    return segments.join(' / ');
}

export function buildOrderShippingSummary(order = {}) {
    const shippingLabel = toText(order?.pricing_snapshot?.shipping_label, 120);

    if (shippingLabel) {
        return shippingLabel;
    }

    const shippingAmount = toAmount(order?.shipping_amount ?? order?.pricing_snapshot?.shipping_amount ?? 0);

    if (shippingAmount > 0) {
        return `€${shippingAmount.toFixed(2)}`;
    }

    return 'Quote pending';
}

export function buildOrderShippingMessage(order = {}) {
    return toText(order?.pricing_snapshot?.shipping_message, 240);
}

export function buildOrderMapUrl(order = {}) {
    return toText(order?.delivery_snapshot?.shipping_map_url, 500);
}