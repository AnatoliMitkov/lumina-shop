import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '../../../utils/supabase/server';

function resolveNextUrl(nextValue, requestUrl, fallbackPath) {
    const fallbackUrl = new URL(fallbackPath, requestUrl);

    if (!nextValue) {
        return fallbackUrl;
    }

    try {
        const candidateUrl = nextValue.startsWith('/')
            ? new URL(nextValue, requestUrl)
            : new URL(nextValue);

        if (candidateUrl.origin !== fallbackUrl.origin) {
            return fallbackUrl;
        }

        return candidateUrl;
    } catch {
        return fallbackUrl;
    }
}

function buildNotice(type) {
    switch (type) {
        case 'recovery':
            return 'recovery-confirmed';
        case 'magiclink':
            return 'magic-link-confirmed';
        case 'invite':
            return 'invite-accepted';
        case 'email_change':
        case 'email_change_current':
        case 'email_change_new':
            return 'email-change-confirmed';
        case 'email':
        default:
            return 'email-confirmed';
    }
}

function buildError(type) {
    if (type === 'recovery') {
        return 'recovery-invalid';
    }

    return 'auth-link-invalid';
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'email';
    const tokenHash = searchParams.get('token_hash');
    const fallbackPath = type === 'recovery' ? '/account/reset-password' : '/account';
    const nextUrl = resolveNextUrl(searchParams.get('next'), request.url, fallbackPath);

    if (!isSupabaseConfigured() || !tokenHash) {
        nextUrl.searchParams.set('error', buildError(type));
        return NextResponse.redirect(nextUrl);
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
    });

    if (error) {
        nextUrl.searchParams.set('error', buildError(type));
        return NextResponse.redirect(nextUrl);
    }

    nextUrl.searchParams.set('notice', buildNotice(type));
    return NextResponse.redirect(nextUrl);
}