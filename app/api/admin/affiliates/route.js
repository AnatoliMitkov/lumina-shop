import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import {
    buildAffiliateCodeMutationInput,
    hasValidPromotionWindow,
    isPromotionSetupError,
} from '../../../../utils/promotions';

export const dynamic = 'force-dynamic';

function toErrorResponse(error) {
    if (isPromotionSetupError(error)) {
        return NextResponse.json({ error: 'Promotion tables are missing. Run supabase/cart-orders.sql first.' }, { status: 503 });
    }

    if (error?.code === '23505') {
        return NextResponse.json({ error: 'That affiliate code already exists.' }, { status: 409 });
    }

    return NextResponse.json({ error: error?.message || 'Unable to complete this affiliate request.' }, { status: 500 });
}

async function getAdminContext() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'You must be signed in to manage affiliate codes.' }, { status: 401 }),
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
            errorResponse: NextResponse.json({ error: 'Admin access is required for affiliate maintenance.' }, { status: 403 }),
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
            .from('affiliate_codes')
            .select('*')
            .order('is_active', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ affiliateCodes: data ?? [] });
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
        const input = buildAffiliateCodeMutationInput(payload);

        if (!input.code) {
            return NextResponse.json({ error: 'An affiliate code is required.' }, { status: 400 });
        }

        if (!hasValidPromotionWindow(input)) {
            return NextResponse.json({ error: 'The affiliate start date must be earlier than the end date.' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('affiliate_codes')
            .insert(input)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ affiliateCode: data });
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
        const affiliateId = typeof payload?.id === 'string' ? payload.id.trim() : '';
        const input = buildAffiliateCodeMutationInput(payload);

        if (!affiliateId) {
            return NextResponse.json({ error: 'An affiliate id is required for updates.' }, { status: 400 });
        }

        if (!input.code) {
            return NextResponse.json({ error: 'An affiliate code is required.' }, { status: 400 });
        }

        if (!hasValidPromotionWindow(input)) {
            return NextResponse.json({ error: 'The affiliate start date must be earlier than the end date.' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('affiliate_codes')
            .update(input)
            .eq('id', affiliateId)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ affiliateCode: data });
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
        const affiliateId = (requestUrl.searchParams.get('id') || '').trim();

        if (!affiliateId) {
            return NextResponse.json({ error: 'An affiliate id is required for deletion.' }, { status: 400 });
        }

        const { error } = await context.supabase
            .from('affiliate_codes')
            .delete()
            .eq('id', affiliateId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, deletedId: affiliateId });
    } catch (error) {
        return toErrorResponse(error);
    }
}