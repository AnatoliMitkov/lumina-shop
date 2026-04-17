import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../utils/supabase/server';
import { createAdminClient, isAdminConfigured } from '../../../utils/supabase/admin';
import { sendContactEmail, isContactMailConfigured } from '../../../utils/contact-mail';
import { validatePhoneNumber } from '../../../utils/contact';
import { isLikelyBotSubmission, verifyContactCaptcha } from '../../../utils/contact-captcha';
import { buildCartSnapshot } from '../../../utils/cart';

export const dynamic = 'force-dynamic';

function toText(value, maxLength = 500) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().slice(0, maxLength);
}

function formatContactError(error) {
    if (error?.code === '42P01') {
        return 'Contact inquiry tables are missing. Re-run supabase/cart-orders.sql before using the contact form.';
    }

    return error?.message || 'Unable to send your message right now.';
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

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const payload = await request.json();

        if (isLikelyBotSubmission({ honeypotValue: payload?.studio, startedAt: payload?.startedAt })) {
            return NextResponse.json({ message: 'Your request is with the atelier. Expect a personal reply soon.' });
        }

        const captchaCheck = verifyContactCaptcha(payload?.captchaToken, payload?.captchaAnswer);

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
            throw createContactError('Please provide your name, email, phone number, and message.', 400);
        }

        if (!isValidEmail(inquiry.email)) {
            throw createContactError('Please provide a valid email address.', 400);
        }

        if (!normalizedPhone.isValid) {
            throw createContactError('Please provide a valid phone number, including the correct country code.', 400);
        }

        inquiry.phone = normalizedPhone.normalized;

        const canSendEmail = isContactMailConfigured();
        const canPersistInquiry = isAdminConfigured();

        if (!canSendEmail && !canPersistInquiry) {
            throw createContactError('Contact delivery is not configured yet. Add CONTACT_SMTP_PASSWORD to .env.local to send email requests.', 503);
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
                ? 'Your request landed in both inboxes: the atelier and yours.'
                : 'Your request has been recorded for the atelier.',
        });
    } catch (error) {
        return NextResponse.json({ error: formatContactError(error) }, { status: getContactErrorStatus(error) });
    }
}