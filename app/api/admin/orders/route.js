import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { orderStatusOptions } from '../../../../utils/checkout';

export const dynamic = 'force-dynamic';

function isOrderSetupError(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === '42703'
        || error?.code === 'PGRST204'
        || error?.code === 'PGRST205'
        || message.toLowerCase().includes('orders')
        || message.toLowerCase().includes('order_code')
        || message.toLowerCase().includes('shipping_scope')
        || message.toLowerCase().includes('payment_status')
        || message.toLowerCase().includes('is_admin')
        || message.toLowerCase().includes('schema cache');
}

function toErrorResponse(error) {
    if (isOrderSetupError(error)) {
        return NextResponse.json({ error: 'Order admin schema is missing. Run supabase/cart-orders.sql before reviewing structured orders.' }, { status: 503 });
    }

    return NextResponse.json({ error: error?.message || 'Unable to update the order right now.' }, { status: 500 });
}

async function getAdminContext() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'You must be signed in to manage orders.' }, { status: 401 }),
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
            errorResponse: NextResponse.json({ error: 'Admin access is required for order maintenance.' }, { status: 403 }),
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
        const orderId = typeof payload?.id === 'string' ? payload.id.trim() : '';
        const status = typeof payload?.status === 'string' ? payload.status.trim() : '';
        const validStatuses = new Set(orderStatusOptions.map((option) => option.value));
        const updatePayload = { status };

        if (!orderId) {
            return NextResponse.json({ error: 'An order id is required.' }, { status: 400 });
        }

        if (!validStatuses.has(status)) {
            return NextResponse.json({ error: 'Choose a valid order status.' }, { status: 400 });
        }

        if (status === 'paid') {
            updatePayload.payment_status = 'paid';
            updatePayload.paid_at = new Date().toISOString();
        }

        if (status === 'cancelled') {
            updatePayload.payment_status = 'cancelled';
        }

        const { data, error } = await context.supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ order: data });
    } catch (error) {
        return toErrorResponse(error);
    }
}