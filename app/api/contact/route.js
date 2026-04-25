import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createClient } from '../../../utils/supabase/server';
import { createAdminClient, isAdminConfigured } from '../../../utils/supabase/admin';
import { sendContactEmail, isContactMailConfigured } from '../../../utils/contact-mail';
import { validatePhoneNumber } from '../../../utils/contact';
import { isLikelyBotSubmission, verifyContactCaptcha } from '../../../utils/contact-captcha';
import { buildCartSnapshot } from '../../../utils/cart';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, detectPreferredLanguageFromHeader, normalizeLanguage } from '../../../utils/language';

export const dynamic = 'force-dynamic';

function toText(value, maxLength = 500) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().slice(0, maxLength);
}

function getContactMessage(language, englishValue, bulgarianValue) {
    return language === 'bg' ? bulgarianValue : englishValue;
}

function formatContactError(error, language) {
    if (error?.code === '42P01') {
        return getContactMessage(language, 'Contact inquiry tables are missing. Re-run supabase/cart-orders.sql before using the contact form.', 'Липсват таблиците за контактните запитвания. Стартирайте отново supabase/cart-orders.sql, преди да използвате формата.');
    }

    return error?.message || getContactMessage(language, 'Unable to send your message right now.', 'Не успяхме да изпратим съобщението ви в момента.');
}

function getContactErrorStatus(error) {
    return error?.statusCode || 503;
}

function createContactError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildSelectionSummary(selectionSnapshot) {
    if (!selectionSnapshot.itemCount) {
        return '';
    }

    const visibleItems = selectionSnapshot.items.slice(0, 6);
    const lines = [
        'Attached selection:',
        ...visibleItems.map((item, index) => `${String(index + 1).padStart(2, '0')}. ${item.name} - €${Number(item.price).toFixed(2)}`),
    ];

    if (selectionSnapshot.itemCount > visibleItems.length) {
        lines.push(`...and ${selectionSnapshot.itemCount - visibleItems.length} more piece(s).`);
    }

    lines.push(`Selection total: €${selectionSnapshot.total.toFixed(2)}`);

    return lines.join('\n');
}

function resolveRequestLanguage(cookieStore, headerStore) {
    return normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value)
        || detectPreferredLanguageFromHeader(headerStore.get('accept-language'))
        || DEFAULT_LANGUAGE;
}

export async function POST(request) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const language = resolveRequestLanguage(cookieStore, headerStore);
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const payload = await request.json();

        if (isLikelyBotSubmission({ honeypotValue: payload?.studio, startedAt: payload?.startedAt })) {
            return NextResponse.json({ message: getContactMessage(language, 'Your request is with the atelier. Expect a personal reply soon.', 'Запитването ви е при ателието. Очаквайте личен отговор скоро.') });
        }

        const captchaCheck = verifyContactCaptcha(payload?.captchaToken, payload?.captchaAnswer, language);

        if (!captchaCheck.isValid) {
            throw createContactError(captchaCheck.message, 400);
        }

        const selectionSnapshot = buildCartSnapshot(payload?.selectionItems);
        const selectionSummary = buildSelectionSummary(selectionSnapshot);
        const customerMessage = toText(payload?.message, selectionSummary ? 1500 : 2000);

        const inquiry = {
            user_id: user?.id ?? null,
            full_name: toText(payload?.fullName, 120),
            email: toText(payload?.email, 160),
            phone: toText(payload?.phone, 60),
            location: toText(payload?.location, 120),
            query_type: toText(payload?.queryType, 80) || 'Other',
            message: customerMessage,
        };
        const normalizedPhone = validatePhoneNumber(inquiry.phone);
        const persistedInquiry = {
            ...inquiry,
            message: [customerMessage, selectionSummary].filter(Boolean).join('\n\n').slice(0, 2000),
        };

        if (!inquiry.full_name || !inquiry.email || !inquiry.phone || !inquiry.message) {
            throw createContactError(getContactMessage(language, 'Please provide your name, email, phone number, and message.', 'Попълнете име, имейл, телефон и съобщение.'), 400);
        }

        if (!isValidEmail(inquiry.email)) {
            throw createContactError(getContactMessage(language, 'Please provide a valid email address.', 'Моля, въведете валиден имейл адрес.'), 400);
        }

        if (!normalizedPhone.isValid) {
            throw createContactError(getContactMessage(language, 'Please provide a valid phone number, including the correct country code.', 'Моля, въведете валиден телефонен номер с правилния код на държавата.'), 400);
        }

        inquiry.phone = normalizedPhone.normalized;

        const canSendEmail = isContactMailConfigured();
        const canPersistInquiry = isAdminConfigured();

        if (!canSendEmail && !canPersistInquiry) {
            throw createContactError(getContactMessage(language, 'Contact delivery is not configured yet. Add CONTACT_SMTP_PASSWORD to .env.local to send email requests.', 'Изпращането на контактната форма още не е настроено. Добавете CONTACT_SMTP_PASSWORD в .env.local, за да могат запитванията да се изпращат.'), 503);
        }

        let emailSent = false;

        if (canSendEmail) {
            await sendContactEmail({
                ...inquiry,
                selection_items: selectionSnapshot.items,
                selection_item_count: selectionSnapshot.itemCount,
                selection_total: selectionSnapshot.total,
                user_email: user?.email || '',
                submitted_at: new Date().toISOString(),
            });
            emailSent = true;
        }

        if (canPersistInquiry) {
            const admin = createAdminClient();
            const { error } = await admin.from('contact_inquiries').insert(persistedInquiry);

            if (error) {
                if (!emailSent) {
                    throw error;
                }

                console.error('Contact inquiry persistence failed after email delivery.', error);
            }
        }

        return NextResponse.json({
            message: emailSent
                ? getContactMessage(language, 'Your request landed in both inboxes: the atelier and yours.', 'Запитването ви вече е изпратено и до ателието, и до вашия имейл.')
                : getContactMessage(language, 'Your request has been recorded for the atelier.', 'Запитването ви е записано за ателието.'),
        });
    } catch (error) {
        return NextResponse.json({ error: formatContactError(error, language) }, { status: getContactErrorStatus(error) });
    }
}