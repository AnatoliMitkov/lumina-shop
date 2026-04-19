import { cookies } from 'next/headers';
import Link from 'next/link';
import ResetPasswordPanel from '../../../components/ResetPasswordPanel';
import { createClient, isSupabaseConfigured } from '../../../utils/supabase/server';

export const dynamic = 'force-dynamic';

function readRecoveryMessage(searchParams) {
    const notice = searchParams?.notice;
    const error = searchParams?.error;

    if (notice === 'recovery-confirmed') {
        return {
            type: 'success',
            message: 'Your recovery link is verified. Set a new password below.',
        };
    }

    if (error === 'recovery-invalid') {
        return {
            type: 'error',
            message: 'This password reset link is invalid or expired. Request a fresh reset email from the account page.',
        };
    }

    return null;
}

export default async function ResetPasswordPage({ searchParams = {} }) {
    const message = readRecoveryMessage(searchParams);

    if (!isSupabaseConfigured()) {
        return (
            <div className="pt-28 md:pt-36 pb-24 md:pb-28 px-6 md:px-12 max-w-[960px] mx-auto">
                <section className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm p-6 md:p-8">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4">Account Recovery / The VA Store</p>
                    <h1 className="font-serif text-4xl md:text-5xl font-light uppercase tracking-[0.12em] leading-none">Reset Password</h1>
                    <p className="mt-6 text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">Supabase auth is not configured in this environment yet, so password recovery cannot run here.</p>
                </section>
            </div>
        );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="pt-28 md:pt-36 pb-24 md:pb-28 px-6 md:px-12 max-w-[960px] mx-auto">
                <section className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm p-6 md:p-8">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4">Account Recovery / The VA Store</p>
                    <h1 className="font-serif text-4xl md:text-5xl font-light uppercase tracking-[0.12em] leading-none">Reset Password</h1>
                    {message && (
                        <div className={`mt-6 rounded-sm border px-4 py-4 text-sm leading-relaxed ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-[#EFECE8] text-[#1C1C1C]/70'}`}>
                            {message.message}
                        </div>
                    )}
                    <p className="mt-6 text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">This recovery session is not active anymore. Go back to the account page and request a new password reset email.</p>
                    <Link href="/account" className="mt-8 inline-flex h-12 px-6 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] items-center justify-center transition-colors hover:bg-[#1C1C1C] hover:text-[#EFECE8]">Return to Account</Link>
                </section>
            </div>
        );
    }

    return (
        <div className="pt-28 md:pt-36 pb-24 md:pb-28 px-6 md:px-12 max-w-[960px] mx-auto">
            <section className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm p-6 md:p-8">
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4">Account Recovery / The VA Store</p>
                <h1 className="font-serif text-4xl md:text-5xl font-light uppercase tracking-[0.12em] leading-none">Reset Password</h1>
                <p className="mt-6 max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">Choose a new password for {user.email}. After saving it, you will be sent back to your account.</p>
                {message && (
                    <div className={`mt-6 rounded-sm border px-4 py-4 text-sm leading-relaxed ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-[#EFECE8] text-[#1C1C1C]/70'}`}>
                        {message.message}
                    </div>
                )}
                <div className="mt-8">
                    <ResetPasswordPanel />
                </div>
            </section>
        </div>
    );
}