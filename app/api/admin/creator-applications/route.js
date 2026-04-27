import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { isMissingCreatorApplicationsTableError } from '../../../../utils/creator-program';
import { createAdminClient, isAdminConfigured } from '../../../../utils/supabase/admin';

export const dynamic = 'force-dynamic';

const STATUS_VALUES = ['pending', 'reviewing', 'approved', 'declined', 'archived'];

function toErrorResponse(error) {
    if (isMissingCreatorApplicationsTableError(error)) {
        return NextResponse.json({ error: 'Creator applications table is missing. Run supabase/creator-applications.sql first.' }, { status: 503 });
    }

    if (error?.code === '42P01' || error?.code === 'PGRST205') {
        return NextResponse.json({ error: 'Admin creator review setup is incomplete in this Supabase project.' }, { status: 503 });
    }

    return NextResponse.json({ error: error?.message || 'Unable to complete creator application request.' }, { status: 500 });
}

async function getAdminContext() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'You must be signed in to review creator applications.' }, { status: 401 }),
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
            errorResponse: NextResponse.json({ error: 'Admin access is required for creator application review.' }, { status: 403 }),
        };
    }

    return { supabase, user };
}

function sanitizeStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return STATUS_VALUES.includes(normalized) ? normalized : '';
}

function sanitizeText(value, maxLength = 1000) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().slice(0, maxLength);
}

export async function GET() {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const { data, error } = await context.supabase
            .from('creator_applications')
            .select('id, user_id, full_name, email, phone, profile_url, social_links, motivation, status, affiliate_code_id, affiliate_code, admin_note, reviewed_at, reviewed_by, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ creatorApplications: data ?? [] });
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function PATCH(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    try {
        const payload = await request.json();
        const applicationId = sanitizeText(payload?.id, 80);
        const nextStatus = sanitizeStatus(payload?.status);
        const affiliateCodeId = sanitizeText(payload?.affiliateCodeId, 80);
        const adminNote = sanitizeText(payload?.adminNote, 2000);

        if (!applicationId) {
            return NextResponse.json({ error: 'An application id is required.' }, { status: 400 });
        }

        if (!nextStatus) {
            return NextResponse.json({ error: 'A valid application status is required.' }, { status: 400 });
        }

        let affiliateCode = null;
        let resolvedAffiliateCodeId = null;

        if (nextStatus === 'approved') {
            if (!affiliateCodeId) {
                return NextResponse.json({ error: 'An affiliate code selection is required before approval.' }, { status: 400 });
            }

            const { data: affiliateRecord, error: affiliateError } = await context.supabase
                .from('affiliate_codes')
                .select('id, code')
                .eq('id', affiliateCodeId)
                .maybeSingle();

            if (affiliateError) {
                throw affiliateError;
            }

            if (!affiliateRecord?.id || !affiliateRecord?.code) {
                return NextResponse.json({ error: 'The selected affiliate code could not be found.' }, { status: 404 });
            }

            affiliateCode = affiliateRecord.code;
            resolvedAffiliateCodeId = affiliateRecord.id;
        }

        const updateInput = {
            status: nextStatus,
            admin_note: adminNote || null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: context.user.id,
            affiliate_code_id: resolvedAffiliateCodeId,
            affiliate_code: affiliateCode,
        };

        if (nextStatus !== 'approved') {
            updateInput.approval_email_sent_at = null;
        }

        const { data, error } = await context.supabase
            .from('creator_applications')
            .update(updateInput)
            .eq('id', applicationId)
            .select('id, user_id, full_name, email, phone, profile_url, social_links, motivation, status, affiliate_code_id, affiliate_code, admin_note, reviewed_at, reviewed_by, created_at, updated_at')
            .single();

        if (error) {
            throw error;
        }

        if (data?.user_id && isAdminConfigured()) {
            const admin = createAdminClient();
            const normalizedProfileStatus = nextStatus === 'pending' ? 'pending' : nextStatus;

            const { error: profileError } = await admin
                .from('profiles')
                .upsert({
                    id: data.user_id,
                    email: data.email || null,
                    full_name: data.full_name || null,
                    creator_status: normalizedProfileStatus,
                    creator_affiliate_code: nextStatus === 'approved' ? affiliateCode : null,
                    creator_application_id: data.id,
                    creator_approved_at: nextStatus === 'approved' ? new Date().toISOString() : null,
                });

            if (profileError) {
                console.error('Creator profile sync failed after admin review update.', profileError);
            }
        }

        return NextResponse.json({ creatorApplication: data });
    } catch (error) {
        return toErrorResponse(error);
    }
}
