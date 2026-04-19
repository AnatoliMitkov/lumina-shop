import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { ADMIN_ATTENTION_STATUS_OPTIONS } from '../../../../utils/admin-attention';

export const dynamic = 'force-dynamic';

const inquiryStatusOptions = new Set(['new', 'in_progress', 'closed']);
const attentionStatusOptions = new Set(ADMIN_ATTENTION_STATUS_OPTIONS.map((option) => option.value));

function isInquirySetupError(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === '42703'
        || error?.code === 'PGRST204'
        || error?.code === 'PGRST205'
        || message.toLowerCase().includes('contact_inquiries')
        || message.toLowerCase().includes('admin_attention_status')
        || message.toLowerCase().includes('is_admin')
        || message.toLowerCase().includes('schema cache');
}

function toErrorResponse(error) {
    if (isInquirySetupError(error)) {
        return NextResponse.json({ error: 'Inquiry admin schema is missing. Run supabase/cart-orders.sql before using inbox attention states.' }, { status: 503 });
    }

    return NextResponse.json({ error: error?.message || 'Unable to update the inquiry right now.' }, { status: 500 });
}

async function getAdminContext() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'You must be signed in to manage inquiries.' }, { status: 401 }),
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
            errorResponse: NextResponse.json({ error: 'Admin access is required for inquiry maintenance.' }, { status: 403 }),
        };
    }

    return { supabase, user };
}

export async function PATCH(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const payload = await request.json();
        const inquiryId = typeof payload?.id === 'string' ? payload.id.trim() : '';
        const status = typeof payload?.status === 'string' ? payload.status.trim() : '';
        const attentionStatus = typeof payload?.attentionStatus === 'string' ? payload.attentionStatus.trim() : '';
        const updatePayload = {};

        if (!inquiryId) {
            return NextResponse.json({ error: 'An inquiry id is required.' }, { status: 400 });
        }

        if (!status && !attentionStatus) {
            return NextResponse.json({ error: 'Choose at least one inquiry field to update.' }, { status: 400 });
        }

        if (status) {
            if (!inquiryStatusOptions.has(status)) {
                return NextResponse.json({ error: 'Choose a valid inquiry status.' }, { status: 400 });
            }

            updatePayload.status = status;
        }

        if (attentionStatus) {
            if (!attentionStatusOptions.has(attentionStatus)) {
                return NextResponse.json({ error: 'Choose a valid attention status.' }, { status: 400 });
            }

            updatePayload.admin_attention_status = attentionStatus;
        }

        const { data, error } = await context.supabase
            .from('contact_inquiries')
            .update(updatePayload)
            .eq('id', inquiryId)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ inquiry: data });
    } catch (error) {
        return toErrorResponse(error);
    }
}