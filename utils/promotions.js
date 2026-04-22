import { evaluateCheckoutShipping, normalizeShippingBenefit } from './checkout';

const PROMOTION_ERROR_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

export const discountTypeOptions = [
    { value: 'percentage', label: 'Percentage' },
    { value: 'fixed_amount', label: 'Fixed Amount' },
];

export const affiliateCustomerDiscountOptions = [
    { value: 'none', label: 'Tracking Only (No Shopper Discount)' },
    { value: 'percentage', label: 'Percentage Shopper Discount' },
    { value: 'fixed_amount', label: 'Fixed Amount Shopper Discount' },
];

export const affiliateCommissionOptions = [
    { value: 'percentage', label: 'Percentage Commission' },
    { value: 'fixed_amount', label: 'Fixed Amount Commission' },
];

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

function toPositiveIntegerOrNull(value) {
    const normalizedValue = typeof value === 'string' ? value.trim() : value;

    if (normalizedValue === '' || normalizedValue == null) {
        return null;
    }

    const parsedValue = Number.parseInt(String(normalizedValue), 10);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}

function toBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalizedValue = value.trim().toLowerCase();
        return normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes' || normalizedValue === 'on';
    }

    return Boolean(value);
}

function toIsoDateTime(value, boundary = 'start') {
    const normalizedValue = toText(value, 64);

    if (!normalizedValue) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
        return boundary === 'end'
            ? `${normalizedValue}T23:59:59.999Z`
            : `${normalizedValue}T00:00:00.000Z`;
    }

    const parsedValue = new Date(normalizedValue);

    if (Number.isNaN(parsedValue.getTime())) {
        return null;
    }

    return parsedValue.toISOString();
}

function clampAmount(value, maxValue) {
    return Math.max(0, Math.min(toAmount(value), toAmount(maxValue)));
}

function normalizeDiscountType(value) {
    return discountTypeOptions.some((option) => option.value === value) ? value : 'percentage';
}

function normalizeAffiliateCustomerDiscountType(value) {
    return affiliateCustomerDiscountOptions.some((option) => option.value === value) ? value : 'none';
}

function normalizeAffiliateCommissionType(value) {
    return affiliateCommissionOptions.some((option) => option.value === value) ? value : 'percentage';
}

export function isPromotionWindowOpen(record, now = new Date()) {
    const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
    const startsAt = record?.starts_at ? new Date(record.starts_at).getTime() : null;
    const endsAt = record?.ends_at ? new Date(record.ends_at).getTime() : null;

    if (Number.isFinite(startsAt) && currentTime < startsAt) {
        return false;
    }

    if (Number.isFinite(endsAt) && currentTime > endsAt) {
        return false;
    }

    return true;
}

export function hasUsageCapacity(record) {
    const usageLimit = Number(record?.usage_limit ?? 0);

    if (!Number.isFinite(usageLimit) || usageLimit <= 0) {
        return true;
    }

    return Number(record?.usage_count ?? 0) < usageLimit;
}

function calculateAdjustment(baseAmount, adjustmentType, adjustmentValue) {
    const normalizedBaseAmount = toAmount(baseAmount);

    if (normalizedBaseAmount <= 0) {
        return 0;
    }

    if (adjustmentType === 'percentage') {
        const normalizedPercentage = Math.min(100, Math.max(0, toAmount(adjustmentValue)));
        return clampAmount((normalizedBaseAmount * normalizedPercentage) / 100, normalizedBaseAmount);
    }

    return clampAmount(adjustmentValue, normalizedBaseAmount);
}

function calculateCommission(baseAmount, commissionType, commissionValue) {
    const normalizedBaseAmount = toAmount(baseAmount);

    if (normalizedBaseAmount <= 0) {
        return 0;
    }

    if (commissionType === 'percentage') {
        const normalizedPercentage = Math.min(100, Math.max(0, toAmount(commissionValue)));
        return toAmount((normalizedBaseAmount * normalizedPercentage) / 100);
    }

    return toAmount(commissionValue);
}

export function formatPromotionCurrency(value) {
    return `€${toAmount(value).toFixed(2)}`;
}

export function toPromotionDateInputValue(value) {
    if (!value) {
        return '';
    }

    const parsedValue = new Date(value);

    if (Number.isNaN(parsedValue.getTime())) {
        return '';
    }

    const year = parsedValue.getUTCFullYear();
    const month = String(parsedValue.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsedValue.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function normalizePromotionCode(value) {
    return toText(value, 64).replace(/\s+/g, '').toUpperCase();
}

export function isPromotionSetupError(error) {
    const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

    return PROMOTION_ERROR_CODES.has(error?.code)
        || message.includes('discount_codes')
        || message.includes('affiliate_codes')
        || message.includes('schema cache');
}

export function buildDiscountCodeMutationInput(payload = {}) {
    const discountType = normalizeDiscountType(payload?.discount_type);
    const discountValue = discountType === 'percentage'
        ? Math.min(100, Math.max(0, toAmount(payload?.discount_value)))
        : Math.max(0, toAmount(payload?.discount_value));

    return {
        code: normalizePromotionCode(payload?.code),
        label: toText(payload?.label, 120),
        description: toText(payload?.description, 500),
        discount_type: discountType,
        discount_value: discountValue,
        shipping_benefit: normalizeShippingBenefit(payload?.shipping_benefit),
        minimum_subtotal: Math.max(0, toAmount(payload?.minimum_subtotal)),
        usage_limit: toPositiveIntegerOrNull(payload?.usage_limit),
        is_active: toBoolean(payload?.is_active),
        starts_at: toIsoDateTime(payload?.starts_at, 'start'),
        ends_at: toIsoDateTime(payload?.ends_at, 'end'),
    };
}

export function buildAffiliateCodeMutationInput(payload = {}) {
    const customerDiscountType = normalizeAffiliateCustomerDiscountType(payload?.customer_discount_type);
    const commissionType = normalizeAffiliateCommissionType(payload?.commission_type);
    const customerDiscountValue = customerDiscountType === 'percentage'
        ? Math.min(100, Math.max(0, toAmount(payload?.customer_discount_value)))
        : customerDiscountType === 'none'
            ? 0
            : Math.max(0, toAmount(payload?.customer_discount_value));
    const commissionValue = commissionType === 'percentage'
        ? Math.min(100, Math.max(0, toAmount(payload?.commission_value)))
        : Math.max(0, toAmount(payload?.commission_value));

    return {
        code: normalizePromotionCode(payload?.code),
        partner_name: toText(payload?.partner_name, 120),
        notes: toText(payload?.notes, 500),
        customer_discount_type: customerDiscountType,
        customer_discount_value: customerDiscountValue,
        commission_type: commissionType,
        commission_value: commissionValue,
        minimum_subtotal: Math.max(0, toAmount(payload?.minimum_subtotal)),
        usage_limit: toPositiveIntegerOrNull(payload?.usage_limit),
        is_active: toBoolean(payload?.is_active),
        starts_at: toIsoDateTime(payload?.starts_at, 'start'),
        ends_at: toIsoDateTime(payload?.ends_at, 'end'),
    };
}

export function hasValidPromotionWindow(input = {}) {
    if (!input.starts_at || !input.ends_at) {
        return true;
    }

    return new Date(input.starts_at).getTime() < new Date(input.ends_at).getTime();
}

export function createBaseCheckoutPricing({ subtotal = 0, shippingAmount = 0, shippingInput = null, shippingBenefit = 'none' } = {}) {
    const normalizedSubtotal = toAmount(subtotal);
    const normalizedShippingAmount = toAmount(shippingAmount);
    const defaultShipping = {
        amount: normalizedShippingAmount,
        status: normalizedShippingAmount > 0 ? 'priced' : 'idle',
        label: normalizedShippingAmount > 0 ? formatPromotionCurrency(normalizedShippingAmount) : 'Quote pending',
        message: '',
        payer: normalizedShippingAmount > 0 ? 'sender' : 'pending',
        source: normalizedShippingAmount > 0 ? 'fixed' : 'pending',
    };
    const resolvedShipping = shippingInput
        ? evaluateCheckoutShipping({
            subtotal: normalizedSubtotal,
            ...shippingInput,
            shippingBenefit: normalizeShippingBenefit(shippingBenefit),
        })
        : defaultShipping;
    const shipping = {
        amount: toAmount(resolvedShipping?.amount ?? normalizedShippingAmount),
        status: toText(resolvedShipping?.status, 40) || defaultShipping.status,
        label: toText(resolvedShipping?.label, 120) || defaultShipping.label,
        message: toText(resolvedShipping?.message, 240),
        payer: toText(resolvedShipping?.payer, 32) || defaultShipping.payer,
        source: toText(resolvedShipping?.source, 40) || defaultShipping.source,
    };

    return {
        pricingReady: true,
        message: '',
        subtotal: normalizedSubtotal,
        shippingAmount: shipping.amount,
        discountAmount: 0,
        totalSavings: 0,
        total: toAmount(normalizedSubtotal + shipping.amount),
        shipping,
        discount: {
            id: '',
            code: '',
            label: '',
            type: '',
            value: 0,
            shippingBenefit: 'none',
            status: 'idle',
            message: '',
            appliedAmount: 0,
        },
        affiliate: {
            id: '',
            code: '',
            partnerName: '',
            customerDiscountType: 'none',
            customerDiscountValue: 0,
            customerDiscountAmount: 0,
            commissionType: '',
            commissionValue: 0,
            commissionAmount: 0,
            status: 'idle',
            message: '',
        },
    };
}

export function evaluateDiscountRecord({ codeInput = '', subtotal = 0, record = null, now = new Date() } = {}) {
    const normalizedCode = normalizePromotionCode(codeInput);
    const normalizedSubtotal = toAmount(subtotal);

    if (!normalizedCode) {
        return createBaseCheckoutPricing({ subtotal: normalizedSubtotal }).discount;
    }

    if (!record) {
        return {
            ...createBaseCheckoutPricing({ subtotal: normalizedSubtotal }).discount,
            code: normalizedCode,
            status: 'invalid',
            message: 'This discount code is not active.',
        };
    }

    if (!record.is_active) {
        return {
            ...createBaseCheckoutPricing({ subtotal: normalizedSubtotal }).discount,
            id: record.id,
            code: normalizedCode,
            label: record.label || normalizedCode,
            type: record.discount_type,
            value: toAmount(record.discount_value),
            shippingBenefit: normalizeShippingBenefit(record.shipping_benefit),
            status: 'invalid',
            message: 'This discount code is currently disabled.',
        };
    }

    if (!isPromotionWindowOpen(record, now)) {
        return {
            ...createBaseCheckoutPricing({ subtotal: normalizedSubtotal }).discount,
            id: record.id,
            code: normalizedCode,
            label: record.label || normalizedCode,
            type: record.discount_type,
            value: toAmount(record.discount_value),
            shippingBenefit: normalizeShippingBenefit(record.shipping_benefit),
            status: 'invalid',
            message: 'This discount code is outside its active schedule.',
        };
    }

    if (!hasUsageCapacity(record)) {
        return {
            ...createBaseCheckoutPricing({ subtotal: normalizedSubtotal }).discount,
            id: record.id,
            code: normalizedCode,
            label: record.label || normalizedCode,
            type: record.discount_type,
            value: toAmount(record.discount_value),
            shippingBenefit: normalizeShippingBenefit(record.shipping_benefit),
            status: 'invalid',
            message: 'This discount code has reached its usage limit.',
        };
    }

    if (normalizedSubtotal < toAmount(record.minimum_subtotal)) {
        return {
            ...createBaseCheckoutPricing({ subtotal: normalizedSubtotal }).discount,
            id: record.id,
            code: normalizedCode,
            label: record.label || normalizedCode,
            type: record.discount_type,
            value: toAmount(record.discount_value),
            shippingBenefit: normalizeShippingBenefit(record.shipping_benefit),
            status: 'invalid',
            message: `This discount requires at least ${formatPromotionCurrency(record.minimum_subtotal)} in the cart.`,
        };
    }

    const appliedAmount = calculateAdjustment(normalizedSubtotal, record.discount_type, record.discount_value);

    return {
        id: record.id,
        code: normalizedCode,
        label: record.label || normalizedCode,
        type: record.discount_type,
        value: toAmount(record.discount_value),
        shippingBenefit: normalizeShippingBenefit(record.shipping_benefit),
        status: 'applied',
        message: `${normalizedCode} is active.`,
        appliedAmount,
    };
}

export function evaluateAffiliateRecord({ codeInput = '', subtotal = 0, record = null, now = new Date() } = {}) {
    const normalizedCode = normalizePromotionCode(codeInput);
    const normalizedSubtotal = toAmount(subtotal);
    const baseAffiliate = createBaseCheckoutPricing({ subtotal: normalizedSubtotal }).affiliate;

    if (!normalizedCode) {
        return baseAffiliate;
    }

    if (!record) {
        return {
            ...baseAffiliate,
            code: normalizedCode,
            status: 'invalid',
            message: 'This affiliate code is not active.',
        };
    }

    if (!record.is_active) {
        return {
            ...baseAffiliate,
            id: record.id,
            code: normalizedCode,
            partnerName: record.partner_name || normalizedCode,
            customerDiscountType: record.customer_discount_type,
            customerDiscountValue: toAmount(record.customer_discount_value),
            commissionType: record.commission_type,
            commissionValue: toAmount(record.commission_value),
            status: 'invalid',
            message: 'This affiliate code is currently disabled.',
        };
    }

    if (!isPromotionWindowOpen(record, now)) {
        return {
            ...baseAffiliate,
            id: record.id,
            code: normalizedCode,
            partnerName: record.partner_name || normalizedCode,
            customerDiscountType: record.customer_discount_type,
            customerDiscountValue: toAmount(record.customer_discount_value),
            commissionType: record.commission_type,
            commissionValue: toAmount(record.commission_value),
            status: 'invalid',
            message: 'This affiliate code is outside its active schedule.',
        };
    }

    if (!hasUsageCapacity(record)) {
        return {
            ...baseAffiliate,
            id: record.id,
            code: normalizedCode,
            partnerName: record.partner_name || normalizedCode,
            customerDiscountType: record.customer_discount_type,
            customerDiscountValue: toAmount(record.customer_discount_value),
            commissionType: record.commission_type,
            commissionValue: toAmount(record.commission_value),
            status: 'invalid',
            message: 'This affiliate code has reached its usage limit.',
        };
    }

    if (normalizedSubtotal < toAmount(record.minimum_subtotal)) {
        return {
            ...baseAffiliate,
            id: record.id,
            code: normalizedCode,
            partnerName: record.partner_name || normalizedCode,
            customerDiscountType: record.customer_discount_type,
            customerDiscountValue: toAmount(record.customer_discount_value),
            commissionType: record.commission_type,
            commissionValue: toAmount(record.commission_value),
            status: 'invalid',
            message: `This affiliate code requires at least ${formatPromotionCurrency(record.minimum_subtotal)} in the cart.`,
        };
    }

    const customerDiscountAmount = record.customer_discount_type === 'none'
        ? 0
        : calculateAdjustment(normalizedSubtotal, record.customer_discount_type, record.customer_discount_value);
    const commissionBase = Math.max(0, normalizedSubtotal - customerDiscountAmount);
    const commissionAmount = calculateCommission(commissionBase, record.commission_type, record.commission_value);

    return {
        id: record.id,
        code: normalizedCode,
        partnerName: record.partner_name || normalizedCode,
        customerDiscountType: record.customer_discount_type,
        customerDiscountValue: toAmount(record.customer_discount_value),
        customerDiscountAmount,
        commissionType: record.commission_type,
        commissionValue: toAmount(record.commission_value),
        commissionAmount,
        status: customerDiscountAmount > 0 ? 'applied' : 'tracked',
        message: customerDiscountAmount > 0 ? `${normalizedCode} is active.` : `${normalizedCode} is tracking the referral.`,
    };
}

export function createCheckoutPricingPreview({ subtotal = 0, shippingAmount = 0, shippingInput = null, discountCode = '', affiliateCode = '', discountRecord = null, affiliateRecord = null } = {}) {
    const normalizedSubtotal = toAmount(subtotal);
    const discount = evaluateDiscountRecord({ codeInput: discountCode, subtotal: normalizedSubtotal, record: discountRecord });
    const subtotalAfterDiscount = Math.max(0, normalizedSubtotal - discount.appliedAmount);
    const affiliate = evaluateAffiliateRecord({ codeInput: affiliateCode, subtotal: subtotalAfterDiscount, record: affiliateRecord });
    const shippingBenefit = discount.status === 'applied' ? discount.shippingBenefit : 'none';
    const basePricing = createBaseCheckoutPricing({
        subtotal: normalizedSubtotal,
        shippingAmount,
        shippingInput,
        shippingBenefit,
    });
    const totalSavings = toAmount(discount.appliedAmount + affiliate.customerDiscountAmount);
    const total = toAmount(Math.max(0, normalizedSubtotal - totalSavings) + basePricing.shipping.amount);

    return {
        ...basePricing,
        discountAmount: totalSavings,
        totalSavings,
        total,
        discount,
        affiliate,
    };
}

export async function fetchPromotionRecords(supabase, { discountCode = '', affiliateCode = '' } = {}) {
    const normalizedDiscountCode = normalizePromotionCode(discountCode);
    const normalizedAffiliateCode = normalizePromotionCode(affiliateCode);

    const [discountResult, affiliateResult] = await Promise.all([
        normalizedDiscountCode
            ? supabase.from('discount_codes').select('*').eq('code', normalizedDiscountCode).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        normalizedAffiliateCode
            ? supabase.from('affiliate_codes').select('*').eq('code', normalizedAffiliateCode).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ]);

    if (discountResult.error) {
        throw discountResult.error;
    }

    if (affiliateResult.error) {
        throw affiliateResult.error;
    }

    return {
        discountRecord: discountResult.data || null,
        affiliateRecord: affiliateResult.data || null,
    };
}