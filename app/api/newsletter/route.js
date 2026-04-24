import { NextResponse } from 'next/server';
import { createAdminClient, isAdminConfigured } from '../../../utils/supabase/admin';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../../../utils/language';

export const dynamic = 'force-dynamic';

const LEGACY_NEWSLETTER_QUERY_TYPE = 'Newsletter Subscription';

function isMissingNewsletterSubscribersTableError(error) {
    const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

    return error?.code === '42P01'
        || error?.code === 'PGRST204'
        || error?.code === 'PGRST205'
        || (message.includes('newsletter_subscribers') && message.includes('schema cache'))
        || message.includes("could not find the table 'public.newsletter_subscribers'");
}

function toText(value, maxLength = 200) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().slice(0, maxLength);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createNewsletterError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function getNewsletterErrorStatus(error) {
    return error?.statusCode || 503;
}

function formatNewsletterError(error, language = DEFAULT_LANGUAGE) {
    const isBulgarian = language === 'bg';

    if (isMissingNewsletterSubscribersTableError(error)) {
        return isBulgarian
            ? 'Newsletter записът още не е подготвен. Пуснете supabase/cart-orders.sql и supabase/newsletter-subscribers.sql, ако искате отделен newsletter списък.'
            : 'Newsletter storage is not ready yet. Run supabase/cart-orders.sql and supabase/newsletter-subscribers.sql if you want the dedicated newsletter list.';
    }

    return error?.message || (isBulgarian
        ? 'Не успяхме да запишем абонамента в момента.'
        : 'Unable to save your subscription right now.');
}

async function upsertDedicatedSubscriber(admin, payload) {
    return admin
        .from('newsletter_subscribers')
        .upsert(payload, {
            onConflict: 'email',
        });
}

async function persistViaLegacyInquiries(admin, email, language, source) {
    const { data: existingEntry, error: existingEntryError } = await admin
        .from('contact_inquiries')
        .select('id')
        .eq('email', email)
        .eq('query_type', LEGACY_NEWSLETTER_QUERY_TYPE)
        .limit(1)
        .maybeSingle();

    if (existingEntryError) {
        throw existingEntryError;
    }

    if (existingEntry?.id) {
        return { alreadySubscribed: true, storage: 'contact_inquiries' };
    }

    const { error } = await admin.from('contact_inquiries').insert({
        full_name: 'Newsletter Subscriber',
        email,
        phone: '',
        location: '',
        query_type: LEGACY_NEWSLETTER_QUERY_TYPE,
        message: `Homepage newsletter signup | language=${language} | source=${source}`,
    });

    if (error) {
        throw error;
    }

    return { alreadySubscribed: false, storage: 'contact_inquiries' };
}

export async function POST(request) {
    let requestLanguage = DEFAULT_LANGUAGE;

    try {
        if (!isAdminConfigured()) {
            throw createNewsletterError(
                'Newsletter storage is not configured yet. Add the Supabase service role key before using subscriptions.',
                503,
            );
        }

        const payload = await request.json();
        const email = toText(payload?.email, 160).toLowerCase();
        const source = toText(payload?.source, 80) || 'homepage';
        requestLanguage = normalizeLanguage(payload?.language) || DEFAULT_LANGUAGE;

        if (!email) {
            throw createNewsletterError(
                requestLanguage === 'bg'
                    ? 'Моля, въведете имейл адрес.'
                    : 'Please enter an email address.',
                400,
            );
        }

        if (!isValidEmail(email)) {
            throw createNewsletterError(
                requestLanguage === 'bg'
                    ? 'Моля, въведете валиден имейл адрес.'
                    : 'Please enter a valid email address.',
                400,
            );
        }

        const admin = createAdminClient();
        let alreadySubscribed = false;

        try {
            const { error } = await upsertDedicatedSubscriber(admin, {
                email,
                language: requestLanguage,
                source,
                status: 'active',
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            if (!isMissingNewsletterSubscribersTableError(error)) {
                throw error;
            }

            const legacyResult = await persistViaLegacyInquiries(admin, email, requestLanguage, source);
            alreadySubscribed = legacyResult.alreadySubscribed;
        }

        return NextResponse.json({
            message: requestLanguage === 'bg'
                ? (alreadySubscribed
                    ? 'Този имейл вече е записан за новини от ателието.'
                    : 'Абонаментът е записан. Ще получавате бъдещите новини от ателието.')
                : (alreadySubscribed
                    ? 'This email is already on the atelier list.'
                    : "You're on the atelier list. You'll receive future dispatches from the studio."),
        });
    } catch (error) {
        return NextResponse.json(
            { error: formatNewsletterError(error, requestLanguage) },
            { status: getNewsletterErrorStatus(error) },
        );
    }
}