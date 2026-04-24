import { cookies } from 'next/headers';
import { createClient, isSupabaseConfigured } from '../../utils/supabase/server';
import CheckoutExperience from '../../components/CheckoutExperience';
import EditableText from '../../components/site-copy/EditableText';
import { isStripeConfigured } from '../../utils/stripe/server';

export const dynamic = 'force-dynamic';

function isProfilesTableMissing(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === 'PGRST205'
        || message.includes('public.profiles')
        || message.toLowerCase().includes('schema cache');
}

function readSchemaMessage(error) {
    if (!error) {
        return '';
    }

    if (isProfilesTableMissing(error)) {
        return 'Checkout is using your account metadata for prefills because the dedicated profiles table is not available yet.';
    }

    return 'Some saved account details could not be loaded, so checkout is falling back to manual entry.';
}

export default async function CheckoutPage() {
    let initialProfile = {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        notes: '',
    };
    let isSignedIn = false;
    let schemaMessage = '';
    const stripeReady = isStripeConfigured();

    if (isSupabaseConfigured()) {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        const { data: { user } } = await supabase.auth.getUser();

        isSignedIn = Boolean(user);

        if (user) {
            const profileResult = await supabase
                .from('profiles')
                .select('full_name, phone, location, notes')
                .eq('id', user.id)
                .maybeSingle();

            initialProfile = {
                fullName: profileResult.data?.full_name || user?.user_metadata?.full_name || '',
                email: user?.email || '',
                phone: profileResult.data?.phone || user?.user_metadata?.phone || '',
                location: profileResult.data?.location || user?.user_metadata?.location || '',
                notes: profileResult.data?.notes || user?.user_metadata?.notes || '',
            };
            schemaMessage = readSchemaMessage(profileResult.error);
        }
    }

    return (
        <div className="shell-page-pad max-w-[1800px] mx-auto">
            <div className="mb-12 md:mb-16 border-b border-[#1C1C1C]/10 pb-8 md:pb-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
                <div>
                    <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="checkout.hero.eyebrow" fallback="Checkout / The VA Store" editorLabel="Checkout hero eyebrow" /></p>
                    <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full"><EditableText contentKey="checkout.hero.title" fallback="Checkout" editorLabel="Checkout hero title" /></h1></div>
                </div>

                <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base max-w-xl text-[#1C1C1C]/60 leading-relaxed">
                    <EditableText contentKey="checkout.hero.copy" fallback="This is where the order becomes operational: customer details, delivery structure, and any codes move together so the atelier can review one complete request instead of reconstructing it later." editorLabel="Checkout hero copy" />
                </p>
            </div>

            <CheckoutExperience initialProfile={initialProfile} isSignedIn={isSignedIn} schemaMessage={schemaMessage} stripeReady={stripeReady} />
        </div>
    );
}
