import { NextResponse } from 'next/server';
import { createContactCaptchaChallenge } from '../../../../utils/contact-captcha';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json(createContactCaptchaChallenge());
}