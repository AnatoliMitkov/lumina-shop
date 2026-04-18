export const shippingScopeOptions = [
    {
        value: 'domestic_bg',
        label: 'Domestic Bulgaria',
        copy: 'For deliveries inside Bulgaria, including future Speedy and ECONT routing.',
    },
    {
        value: 'worldwide',
        label: 'Worldwide',
        copy: 'For clients outside Bulgaria while shipping quotes and routing are confirmed manually.',
    },
];

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
            copy: 'The atelier confirms the best carrier and final shipping total after review.',
        },
    ],
};

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

export function getDeliveryMethodOptions(shippingScope = 'worldwide') {
    return deliveryMethodOptionsByScope[normalizeShippingScope(shippingScope)] || deliveryMethodOptionsByScope.worldwide;
}

export function normalizeDeliveryMethod(shippingScope, value) {
    const options = getDeliveryMethodOptions(shippingScope);
    const matchingOption = options.find((option) => option.value === value);

    return matchingOption?.value || options[0]?.value || 'worldwide_quote';
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

    return 'Delivery destination will be confirmed by the atelier.';
}

export function buildOrderDiscountSummary(order = {}) {
    const discountCode = toText(order?.discount_code, 64);
    const affiliateCode = toText(order?.affiliate_code, 64);
    const segments = [];

    if (discountCode) {
        segments.push(`Discount ${discountCode}`);
    }

    if (affiliateCode) {
        segments.push(`Affiliate ${affiliateCode}`);
    }

    return segments.join(' / ');
}