import { NextResponse } from 'next/server';
import { createAdminClient, isAdminConfigured } from '../../../../utils/supabase/admin';
import {
    createBaseCheckoutPricing,
    createCheckoutPricingPreview,
    fetchPromotionRecords,
    isPromotionSetupError,
} from '../../../../utils/promotions';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const payload = await request.json();
        const subtotal = Number(payload?.subtotal || 0);
        const discountCode = typeof payload?.discountCode === 'string' ? payload.discountCode : '';
        const affiliateCode = typeof payload?.affiliateCode === 'string' ? payload.affiliateCode : '';
        const shippingInput = {
            shippingScope: payload?.shippingScope,
            deliveryMethod: payload?.deliveryMethod,
            shippingCountry: payload?.shippingCountry,
            shippingCity: payload?.shippingCity,
            shippingAddressLine1: payload?.shippingAddressLine1,
            shippingOfficeLabel: payload?.shippingOfficeLabel,
            shippingOfficeCode: payload?.shippingOfficeCode,
        };
        const basePricing = createBaseCheckoutPricing({ subtotal, shippingInput });

        if (!discountCode && !affiliateCode) {
            return NextResponse.json({ pricing: basePricing });
        }

        if (!isAdminConfigured()) {
            return NextResponse.json({
                pricing: {
                    ...basePricing,
                    pricingReady: false,
                    message: 'Promotion validation is not configured in this environment yet.',
                },
            });
        }

        try {
            const supabase = createAdminClient();
            const { discountRecord, affiliateRecord } = await fetchPromotionRecords(supabase, { discountCode, affiliateCode });
            const pricing = createCheckoutPricingPreview({
                subtotal,
                shippingInput,
                discountCode,
                affiliateCode,
                discountRecord,
                affiliateRecord,
            });

            return NextResponse.json({ pricing });
        } catch (error) {
            if (isPromotionSetupError(error)) {
                return NextResponse.json({
                    pricing: {
                        ...basePricing,
                        pricingReady: false,
                        message: 'Promotion tables are not ready yet. Run supabase/cart-orders.sql to enable discount and affiliate pricing.',
                    },
                });
            }

            throw error;
        }
    } catch (error) {
        return NextResponse.json({ error: error?.message || 'Unable to validate codes right now.' }, { status: 500 });
    }
}