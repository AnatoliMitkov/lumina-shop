import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../utils/supabase/server';
import { validatePhoneNumber } from '../../../../utils/contact';

export const dynamic = 'force-dynamic';

function toText(value, maxLength = 160) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().slice(0, maxLength);
}

function formatProfileError(error) {
    if (isProfilesTableMissing(error)) {
        return 'Saved to your account metadata, but the profiles table is still not available.';
    }

    return error?.message || 'Unable to save profile details.';
}

function isProfilesTableMissing(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === 'PGRST205'
        || message.includes("public.profiles")
        || message.toLowerCase().includes('schema cache');
}

export async function PUT(request) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'You must be signed in to save your account details.' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const phone = toText(payload?.phone, 40);
        const normalizedPhone = phone ? validatePhoneNumber(phone) : { isValid: true, normalized: '' };

        if (phone && !normalizedPhone.isValid) {
            return NextResponse.json({ error: 'Please provide a valid phone number, including the correct country code.' }, { status: 400 });
        }

        const profileInput = {
            id: user.id,
            email: user.email ?? null,
            full_name: toText(payload?.fullName, 120),
            phone: normalizedPhone.normalized || '',
            location: toText(payload?.location, 120),
            notes: toText(payload?.notes, 600),
        };

        const { error: authUpdateError } = await supabase.auth.updateUser({
            data: {
                full_name: profileInput.full_name,
                phone: profileInput.phone,
                location: profileInput.location,
                notes: profileInput.notes,
            },
        });

        if (authUpdateError) {
            throw authUpdateError;
        }

        const { data, error } = await supabase
            .from('profiles')
            .upsert(profileInput)
            .select('full_name, phone, location, notes')
            .single();

        if (error) {
            if (isProfilesTableMissing(error)) {
                return NextResponse.json({
                    profile: {
                        full_name: profileInput.full_name,
                        phone: profileInput.phone,
                        location: profileInput.location,
                        notes: profileInput.notes,
                    },
                    message: 'Account details saved to your verified account profile.',
                    warning: 'The dedicated profiles table is still missing, so these details are currently being stored in your auth metadata.',
                });
            }

            throw error;
        }

        return NextResponse.json({
            profile: data,
            message: 'Account details saved.',
        });
    } catch (error) {
        return NextResponse.json({ error: formatProfileError(error) }, { status: 503 });
    }
}