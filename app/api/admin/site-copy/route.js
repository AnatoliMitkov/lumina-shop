import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { isSiteCopySetupError } from '../../../../utils/site-copy';

export const dynamic = 'force-dynamic';

function toErrorResponse(error) {
    if (isSiteCopySetupError(error)) {
        return NextResponse.json({ error: 'Site copy schema is missing. Run supabase/cart-orders.sql before editing storefront text inline.' }, { status: 503 });
    }

    return NextResponse.json({ error: error?.message || 'Unable to save the text right now.' }, { status: 500 });
}

async function getAdminContext() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'You must be signed in to edit storefront text.' }, { status: 401 }),
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
            errorResponse: NextResponse.json({ error: 'Admin access is required for inline text editing.' }, { status: 403 }),
        };
    }

    return { supabase };
}

export async function PATCH(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const payload = await request.json();
        const key = typeof payload?.key === 'string' ? payload.key.trim() : '';
        const value = typeof payload?.value === 'string' ? payload.value : '';

        if (!key) {
            return NextResponse.json({ error: 'A site copy key is required.' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('site_copy_entries')
            .upsert({ key, value }, { onConflict: 'key' })
            .select('key, value, updated_at')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ entry: data });
    } catch (error) {
        return toErrorResponse(error);
    }
}