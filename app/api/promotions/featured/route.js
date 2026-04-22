import { NextResponse } from 'next/server';
import { createAdminClient, isAdminConfigured } from '../../../../utils/supabase/admin';
import {
    formatPromotionCurrency,
    hasUsageCapacity,
    isPromotionSetupError,
    isPromotionWindowOpen,
    normalizePromotionCode,
} from '../../../../utils/promotions';

export const dynamic = 'force-dynamic';

function buildDiscountSummary(record) {
    if (record?.discount_type === 'percentage') {
        return `${Number(record.discount_value ?? 0)}% off`;
    }

    return `${formatPromotionCurrency(record?.discount_value ?? 0)} off`;
}

function buildFeaturedPromoPayload(record) {
    const usageLimit = Number(record?.usage_limit ?? 0);
    const usageCount = Math.max(0, Number(record?.usage_count ?? 0));
    const hasLimitedUses = Number.isFinite(usageLimit) && usageLimit > 0;

    return {
        id: record.id,
        code: record.code,
        label: record.label || record.code,
        description: record.description || '',
        discountType: record.discount_type,
        discountValue: Number(record.discount_value ?? 0),
        discountSummary: buildDiscountSummary(record),
        minimumSubtotal: Number(record.minimum_subtotal ?? 0),
        minimumSubtotalDisplay: formatPromotionCurrency(record.minimum_subtotal ?? 0),
        shippingBenefit: record.shipping_benefit || 'none',
        usageCount,
        usageLimit: hasLimitedUses ? usageLimit : null,
        remainingUses: hasLimitedUses ? Math.max(usageLimit - usageCount, 0) : null,
        startsAt: record.starts_at || null,
        endsAt: record.ends_at || null,
    };
}

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = normalizePromotionCode(requestUrl.searchParams.get('code') || '');

    if (!code || !isAdminConfigured()) {
        return NextResponse.json({ promo: null });
    }

    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('discount_codes')
            .select('id, code, label, description, discount_type, discount_value, shipping_benefit, minimum_subtotal, usage_limit, usage_count, is_active, starts_at, ends_at')
            .eq('code', code)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data || !data.is_active || !isPromotionWindowOpen(data) || !hasUsageCapacity(data)) {
            return NextResponse.json({ promo: null });
        }

        return NextResponse.json({ promo: buildFeaturedPromoPayload(data) });
    } catch (error) {
        if (isPromotionSetupError(error)) {
            return NextResponse.json({ promo: null });
        }

        return NextResponse.json({ error: error?.message || 'Unable to load featured promo details.' }, { status: 500 });
    }
}