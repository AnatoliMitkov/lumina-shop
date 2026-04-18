import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import {
    buildDiscountCodeMutationInput,
    hasValidPromotionWindow,
    isPromotionSetupError,
} from '../../../../utils/promotions';

export const dynamic = 'force-dynamic';

function toErrorResponse(error) {
    if (isPromotionSetupError(error)) {
        return NextResponse.json({ error: 'Promotion tables are missing. Run supabase/cart-orders.sql first.' }, { status: 503 });
    }

    if (error?.code === '23505') {
        return NextResponse.json({ error: 'That discount code already exists.' }, { status: 409 });
    }

    return NextResponse.json({ error: error?.message || 'Unable to complete this discount request.' }, { status: 500 });
}

async function getAdminContext() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'You must be signed in to manage discount codes.' }, { status: 401 }),
        };
    }

    const profileResult = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

    if (profileResult.error) {
        return {
            errorResponse: toErrorResponse(profileResult.error),
        };
    }

    if (!profileResult.data?.is_admin) {
        return {
            errorResponse: NextResponse.json({ error: 'Admin access is required for discount maintenance.' }, { status: 403 }),
        };
    }

    return { supabase };
}

export async function GET() {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const { data, error } = await context.supabase
            .from('discount_codes')
            .select('*')
            .order('is_active', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ discountCodes: data ?? [] });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function POST(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const payload = await request.json();
        const input = buildDiscountCodeMutationInput(payload);

        if (!input.code) {
            return NextResponse.json({ error: 'A discount code is required.' }, { status: 400 });
        }

        if (!hasValidPromotionWindow(input)) {
            return NextResponse.json({ error: 'The discount start date must be earlier than the end date.' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('discount_codes')
            .insert(input)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ discountCode: data });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function PUT(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const payload = await request.json();
        const discountId = typeof payload?.id === 'string' ? payload.id.trim() : '';
        const input = buildDiscountCodeMutationInput(payload);

        if (!discountId) {
            return NextResponse.json({ error: 'A discount id is required for updates.' }, { status: 400 });
        }

        if (!input.code) {
            return NextResponse.json({ error: 'A discount code is required.' }, { status: 400 });
        }

        if (!hasValidPromotionWindow(input)) {
            return NextResponse.json({ error: 'The discount start date must be earlier than the end date.' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('discount_codes')
            .update(input)
            .eq('id', discountId)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ discountCode: data });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function DELETE(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const requestUrl = new URL(request.url);
        const discountId = (requestUrl.searchParams.get('id') || '').trim();

        if (!discountId) {
            return NextResponse.json({ error: 'A discount id is required for deletion.' }, { status: 400 });
        }

        const { error } = await context.supabase
            .from('discount_codes')
            .delete()
            .eq('id', discountId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, deletedId: discountId });
    } catch (error) {
        return toErrorResponse(error);
    }
}