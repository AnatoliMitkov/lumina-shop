import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createContactCaptchaChallenge } from '../../../../utils/contact-captcha';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, detectPreferredLanguageFromHeader, normalizeLanguage } from '../../../../utils/language';

export const dynamic = 'force-dynamic';

function resolveRequestLanguage(cookieStore, headerStore) {
    return normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value)
        || detectPreferredLanguageFromHeader(headerStore.get('accept-language'))
        || DEFAULT_LANGUAGE;
}

export async function GET() {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const language = resolveRequestLanguage(cookieStore, headerStore);

    return NextResponse.json(createContactCaptchaChallenge(language));
}