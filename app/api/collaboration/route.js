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
        const record = buildCreatorApplicationInsert(validation.normalized, { userId: user?.id ?? null });
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

        try {
            await notifyCreatorProgramAdmin(responseApplication);
        } catch (notificationError) {
            console.error('Creator Program admin notification placeholder failed.', notificationError);
        }

        return NextResponse.json({
            message: getCreatorProgramText(
                language,
                'Your THE VA STORE creator partnership application is in review. Keep the downloaded PDF as confirmation of the agreed terms.',
                'Кандидатурата ви за партньорство с THE VA STORE е получена. Запазете изтегления PDF като потвърждение за приетите условия.'
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