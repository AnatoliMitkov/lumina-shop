import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createAdminClient, isAdminConfigured } from '../../../utils/supabase/admin';
import { notifyCreatorProgramAdmin } from '../../../utils/creator-program-admin';
import {
    buildCreatorApplicationInsert,
    firstCreatorApplicationError,
    getCreatorProgramText,
    isMissingCreatorApplicationsTableError,
    validateCreatorApplicationPayload,
} from '../../../utils/creator-program';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, detectPreferredLanguageFromHeader, normalizeLanguage } from '../../../utils/language';
import { createClient } from '../../../utils/supabase/server';

export const dynamic = 'force-dynamic';

function createCreatorProgramError(message, statusCode, fields) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.fields = fields;
    return error;
}

function getCreatorProgramErrorStatus(error) {
    return error?.statusCode || 503;
}

function isMissingCreatorApplicationExtendedColumnsError(error) {
    const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

    return error?.code === 'PGRST204'
        || message.includes("'phone' column")
        || message.includes('column "phone"')
        || message.includes("'social_links' column")
        || message.includes('column "social_links"');
}

function isMissingCreatorProfileColumnsError(error) {
    const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

    return error?.code === 'PGRST204'
        || message.includes("'creator_status' column")
        || message.includes('column "creator_status"')
        || message.includes("'creator_application_id' column")
        || message.includes('column "creator_application_id"')
        || message.includes("'creator_affiliate_code' column")
        || message.includes('column "creator_affiliate_code"');
}

function resolveRequestLanguage(cookieStore, headerStore) {
    return normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value)
        || detectPreferredLanguageFromHeader(headerStore.get('accept-language'))
        || DEFAULT_LANGUAGE;
}

function formatCreatorProgramError(error, language) {
    if (isMissingCreatorApplicationsTableError(error)) {
        return getCreatorProgramText(
            language,
            'Creator Program storage is missing. Run supabase/creator-applications.sql before using this form.',
            'Липсва таблицата за Creator Program. Стартирайте supabase/creator-applications.sql, преди да използвате формата.'
        );
    }

    return error?.message || getCreatorProgramText(language, 'Unable to submit your application right now.', 'Не успяхме да изпратим кандидатурата ви в момента.');
}

export async function POST(request) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const language = resolveRequestLanguage(cookieStore, headerStore);
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            {
                error: getCreatorProgramText(
                    language,
                    'Sign in or create an account before submitting a creator application.',
                    'Влезте или създайте профил, преди да изпратите кандидатура за creator програмата.'
                ),
            },
            { status: 401 }
        );
    }

    try {
        if (!isAdminConfigured()) {
            throw createCreatorProgramError(
                getCreatorProgramText(
                    language,
                    'Creator partnership persistence is not configured yet. Add the Supabase service role key to .env.local.',
                    'Записът за creator partnership още не е настроен. Добавете Supabase service role key в .env.local.'
                ),
                503
            );
        }

        const payload = await request.json();
        const validation = validateCreatorApplicationPayload(payload, { language });

        if (!validation.isValid) {
            throw createCreatorProgramError(
                firstCreatorApplicationError(validation.errors)
                || getCreatorProgramText(language, 'Please review your application and try again.', 'Прегледайте кандидатурата и опитайте отново.'),
                400,
                validation.errors
            );
        }

        const admin = createAdminClient();
        const record = buildCreatorApplicationInsert(validation.normalized, { userId: user.id });
        const legacyCompatibleRecord = { ...record };
        delete legacyCompatibleRecord.phone;
        delete legacyCompatibleRecord.social_links;
        let applicationRecord = null;
        let insertError = null;

        ({ data: applicationRecord, error: insertError } = await admin
            .from('creator_applications')
            .insert(record)
            .select('id, full_name, email, profile_url, motivation, terms_accepted, status, created_at')
            .single());

        if (insertError && isMissingCreatorApplicationExtendedColumnsError(insertError)) {
            ({ data: applicationRecord, error: insertError } = await admin
                .from('creator_applications')
                .insert(legacyCompatibleRecord)
                .select('id, full_name, email, profile_url, motivation, terms_accepted, status, created_at')
                .single());
        }

        if (insertError) {
            throw insertError;
        }

        const responseApplication = {
            id: applicationRecord.id,
            fullName: applicationRecord.full_name,
            email: applicationRecord.email,
            phone: validation.normalized.phone,
            profileUrl: applicationRecord.profile_url,
            socialLinks: validation.normalized.socialLinks,
            motivation: applicationRecord.motivation,
            agreedToTerms: applicationRecord.terms_accepted,
            status: applicationRecord.status,
            createdAt: applicationRecord.created_at,
        };

        const creatorProfileInput = {
            id: user.id,
            email: user.email ?? responseApplication.email,
            full_name: responseApplication.fullName,
            creator_status: 'pending',
            creator_application_id: responseApplication.id,
            creator_affiliate_code: null,
            creator_approved_at: null,
        };
        let profileError = null;

        ({ error: profileError } = await admin
            .from('profiles')
            .upsert(creatorProfileInput));

        if (profileError && isMissingCreatorProfileColumnsError(profileError)) {
            ({ error: profileError } = await admin
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email ?? responseApplication.email,
                    full_name: responseApplication.fullName,
                }));
        }

        if (profileError) {
            console.error('Creator profile status update failed.', profileError);
        }

        try {
            await notifyCreatorProgramAdmin(responseApplication, { language });
        } catch (notificationError) {
            console.error('Creator Program email confirmation failed.', notificationError);
        }

        return NextResponse.json({
            message: getCreatorProgramText(
                language,
                'Your THE VA STORE creator partnership application is in review. A confirmation email with your contract PDF has been sent automatically.',
                'Кандидатурата ви за партньорство с THE VA STORE е получена. Автоматично изпратихме потвърждение по имейл с вашия договор в PDF.'
            ),
            application: responseApplication,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: formatCreatorProgramError(error, language),
                errors: error?.fields || undefined,
            },
            { status: getCreatorProgramErrorStatus(error) }
        );
    }
}