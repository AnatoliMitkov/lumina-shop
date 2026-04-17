import { cookies } from 'next/headers';
import { createClient } from '../../utils/supabase/server';
import ContactForm from '../../components/ContactForm';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    let profile = null;

    if (user) {
        const { data } = await supabase.from('profiles').select('full_name, phone, location').eq('id', user.id).maybeSingle();
        profile = data;
    }

    const initialValues = {
        fullName: profile?.full_name || user?.user_metadata?.full_name || '',
        email: user?.email || '',
        phone: profile?.phone || '',
        location: profile?.location || '',
    };

    return (
        <div className="pt-32 md:pt-40 pb-24 md:pb-28 px-6 md:px-12 max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-12 md:gap-20 items-start">
                <section className="flex flex-col gap-8 md:gap-10">
                    <div>
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-6">Atelier Contact / Ruse, Bulgaria</p>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full">Personal</h1></div>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display storefront-hero-shift font-serif font-light uppercase translate-y-full">Touch</h1></div>
                    </div>

                    <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/65 font-light max-w-xl">Handmade fashion often needs a conversation: fit, timing, custom details, or styling direction. Send the atelier your information and question here, and keep the interaction personal.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
                        {[
                            {
                                label: 'Email',
                                value: 'sales@stylingbyva.com',
                                valueClassName: 'text-[clamp(1rem,1.95vw,2rem)] font-light leading-tight normal-case tracking-[-0.02em] whitespace-nowrap',
                            },
                            {
                                label: 'Location',
                                value: 'Ruse, Bulgaria',
                                valueClassName: 'text-2xl md:text-[1.9rem] font-light leading-tight',
                            },
                        ].map(({ label, value, valueClassName }) => (
                            <div key={label} className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 p-5 md:p-6 rounded-sm">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">{label}</p>
                                <p className={`font-serif ${valueClassName}`}>{value}</p>
                            </div>
                        ))}

                        <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 p-5 md:p-6 rounded-sm md:col-span-2">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Slogan</p>
                            <p className="font-serif text-2xl md:text-[2.35rem] font-light leading-tight">Beautiful People Smile More</p>
                        </div>
                    </div>
                </section>

                <section className="xl:pt-6">
                    <ContactForm initialValues={initialValues} />
                </section>
            </div>
        </div>
    );
}