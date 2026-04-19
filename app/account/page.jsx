import { cookies } from 'next/headers';
import { createClient, isSupabaseConfigured } from '../../utils/supabase/server';
import AuthPanel from '../../components/AuthPanel';
import AccountDashboard from '../../components/AccountDashboard';

export const dynamic = 'force-dynamic';

function readAuthMessage(searchParams) {
    const notice = searchParams?.notice;
    const error = searchParams?.error;

    if (notice === 'email-confirmed') {
        return { type: 'success', message: 'Your email is confirmed. You can sign in to your account now.' };
    }

    if (notice === 'magic-link-confirmed') {
        return { type: 'success', message: 'You are signed in. Your secure email link was accepted.' };
    }

    if (notice === 'invite-accepted') {
        return { type: 'success', message: 'Your invitation was accepted. Continue in your account.' };
    }

    if (notice === 'email-change-confirmed') {
        return { type: 'success', message: 'Your email change is confirmed.' };
    }

    if (notice === 'password-reset') {
        return { type: 'success', message: 'Your password was updated successfully.' };
    }

    if (error === 'auth-link-invalid') {
        return { type: 'error', message: 'This email link is invalid or expired. Request a fresh one and try again.' };
    }

    return null;
}

function isProfilesTableMissing(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === 'PGRST205'
        || message.includes("public.profiles")
        || message.toLowerCase().includes('schema cache');
}

function readErrorMessage(error) {
    if (!error) {
        return '';
    }

    if (isProfilesTableMissing(error)) {
        return 'Profile details are using your account metadata for now while the dedicated profiles table is still unavailable.';
    }

    if (error.code === '42P01' || error.code === '42703' || error.code === 'PGRST205') {
        return 'Account tables are not in Supabase yet. Re-run supabase/cart-orders.sql to enable saved profiles and order tracking.';
    }

    return 'Some account data is not available yet.';
}

export default async function AccountPage({ searchParams = {} }) {
    const authMessage = readAuthMessage(searchParams);

    if (!isSupabaseConfigured()) {
        return (
            <div className="pt-28 md:pt-36 pb-24 md:pb-28 px-6 md:px-12 max-w-[1800px] mx-auto">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-10 md:gap-14 items-start">
                    <section className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4">Client Access / The VA Store</p>
                            <h1 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.12em] leading-none">Account</h1>
                        </div>

                        <p className="text-sm md:text-base leading-relaxed text-[#1C1C1C]/62 max-w-2xl">The local account area needs Supabase public environment variables before it can create the auth client. Production is already fine; your local workspace is missing the values.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                ['1', 'Create .env.local', 'Copy .env.example to .env.local in the project root.'],
                                ['2', 'Add Supabase keys', 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase or Vercel.'],
                                ['3', 'Restart Next.js', 'Stop and restart npm run dev so Next reloads the env values.'],
                            ].map(([step, title, copy]) => (
                                <div key={step} className="border border-[#1C1C1C]/10 bg-white/75 rounded-sm p-4 md:p-5">
                                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">Step {step}</p>
                                    <p className="mt-3 font-serif text-2xl font-light uppercase tracking-[0.1em] text-[#1C1C1C]">{title}</p>
                                    <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/58">{copy}</p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-sm border border-[#1C1C1C]/10 bg-[#EFECE8] px-4 py-4 md:px-5 md:py-5">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">Quick Option</p>
                            <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/62">If the Vercel project already has the right variables, run vercel env pull after linking the project locally. Otherwise copy the same two public values from Supabase Dashboard → Project Settings → API.</p>
                        </div>
                    </section>

                    <section className="xl:pt-6">
                        <AuthPanel />
                    </section>
                </div>
            </div>
        );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="pt-32 md:pt-40 pb-24 md:pb-28 px-6 md:px-12 max-w-[1800px] mx-auto">
                {authMessage && (
                    <div className={`mb-8 rounded-sm border px-4 py-4 text-sm leading-relaxed ${authMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-[#EFECE8] text-[#1C1C1C]/70'}`}>
                        {authMessage.message}
                    </div>
                )}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-12 md:gap-20 items-start">
                    <section className="flex flex-col gap-8 md:gap-10">
                        <div>
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-6">Client Access / The VA Store</p>
                            <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full">Your</h1></div>
                            <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display storefront-hero-shift font-serif font-light uppercase translate-y-full">Account</h1></div>
                        </div>

                        <p className="hero-sub storefront-copy-measure opacity-0 max-w-xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/65 font-light">Create an account to track orders, keep your atelier details saved, and move faster when you want a spotlight piece or personal support.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            {[
                                ['Track', 'See archived orders in one place.'],
                                ['Save', 'Keep your contact and delivery details ready.'],
                                ['Reach', 'Submit atelier requests with a personal touch.'],
                            ].map(([title, copy]) => (
                                <div key={title} className="storefront-stat-card reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 p-4 md:p-5 rounded-sm">
                                    <p className="font-serif text-xl md:text-2xl font-light uppercase tracking-widest mb-3">{title}</p>
                                    <p className="text-sm text-[#1C1C1C]/60 leading-relaxed">{copy}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="xl:pt-8">
                        <AuthPanel />
                    </section>
                </div>
            </div>
        );
    }

    const [profileResult, ordersResult, inquiriesResult] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, location, notes, is_admin').eq('id', user.id).maybeSingle(),
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('contact_inquiries').select('id, query_type, message, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const profile = {
        full_name: profileResult.data?.full_name || user?.user_metadata?.full_name || '',
        phone: profileResult.data?.phone || user?.user_metadata?.phone || '',
        location: profileResult.data?.location || user?.user_metadata?.location || '',
        notes: profileResult.data?.notes || user?.user_metadata?.notes || '',
    };
    const isAdmin = Boolean(profileResult.data?.is_admin);
    const profileStorageMode = isProfilesTableMissing(profileResult.error) ? 'metadata' : 'table';
    const schemaMessage = readErrorMessage(profileResult.error) || readErrorMessage(ordersResult.error) || readErrorMessage(inquiriesResult.error);

    return (
        <div className="pt-28 md:pt-36 pb-24 md:pb-28 px-6 md:px-12 max-w-[1800px] mx-auto">
            {authMessage && (
                <div className={`mb-8 rounded-sm border px-4 py-4 text-sm leading-relaxed ${authMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-[#EFECE8] text-[#1C1C1C]/70'}`}>
                    {authMessage.message}
                </div>
            )}
            <div className="mb-10 md:mb-12 grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-5 md:gap-6 items-stretch">
                <section className="account-surface reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4">Client Room / The VA Store</p>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-section-display font-serif font-light uppercase translate-y-full">Account</h1></div>
                    </div>
                    <p className="hero-sub opacity-0 text-sm md:text-base max-w-2xl text-[#1C1C1C]/62 leading-relaxed">Signed in as {user.email}. Keep your profile sharp, save atelier-ready details faster, and review orders and requests without the oversized empty intro.</p>
                    <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                        <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/70 rounded-full">Verified account</span>
                        <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/70 rounded-full">{profileStorageMode === 'metadata' ? 'Metadata-backed profile' : 'Supabase profile table'}</span>
                        {isAdmin && <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/70 rounded-full">Studio admin access</span>}
                    </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                    {[
                        ['Orders', String(ordersResult.data?.length || 0).padStart(2, '0'), 'Submitted orders stored in your account.'],
                        ['Requests', String(inquiriesResult.data?.length || 0).padStart(2, '0'), 'Recent atelier conversations.'],
                        ['Profile', profile.full_name ? 'Ready' : 'Open', profile.full_name ? 'Details are available for faster support.' : 'Add your details for smoother follow-up.'],
                    ].map(([label, value, copy]) => (
                        <div key={label} className="account-metric-card account-surface storefront-stat-card reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 rounded-sm p-4 md:p-5 flex flex-col justify-between">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">{label}</p>
                            <p className="storefront-stat-display font-serif font-light text-[#1C1C1C]">{value}</p>
                            <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{copy}</p>
                        </div>
                    ))}
                </section>
            </div>

            <AccountDashboard user={user} profile={profile} orders={ordersResult.data ?? []} inquiries={inquiriesResult.data ?? []} schemaMessage={schemaMessage} profileStorageMode={profileStorageMode} isAdmin={isAdmin} />
        </div>
    );
}