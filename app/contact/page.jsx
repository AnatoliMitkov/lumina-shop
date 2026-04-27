import { cookies } from 'next/headers';
import { createClient, getUserSafely } from '../../utils/supabase/server';
import ContactForm from '../../components/ContactForm';
import EditableText from '../../components/site-copy/EditableText';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, normalizeLanguage } from '../../utils/language';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Contact',
    description: 'Contact The VA Store for bespoke requests, order questions, fittings, and atelier support.',
    alternates: {
        canonical: '/contact',
    },
};

export default async function ContactPage({ searchParams }) {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const supabase = createClient(cookieStore);
    const { data: { user } } = await getUserSafely(supabase);
    let profile = null;

    if (user) {
        const { data } = await supabase.from('profiles').select('full_name, phone, location').eq('id', user.id).maybeSingle();
        profile = data;
    }

    const params = await searchParams;
    const productName = params?.product || '';
    const selectedSize = params?.size || '';
    const selectedTone = params?.tone || '';
    const sizeLabel = currentLanguage === 'bg' ? 'Размер' : 'Size';

    const productContext = productName || selectedSize || selectedTone
        ? `${productName}${selectedSize ? ` / ${sizeLabel} ${selectedSize}` : ''}${selectedTone ? ` / ${selectedTone}` : ''}`
        : '';

    const initialValues = {
        fullName: profile?.full_name || user?.user_metadata?.full_name || '',
        email: user?.email || '',
        phone: profile?.phone || '',
        location: profile?.location || '',
        productContext,
    };

    const contactCards = [
        {
            key: 'email',
            label: localizedFallback('Email', 'Имейл'),
            value: 'sales@stylingbyva.com',
            valueClassName: 'text-[clamp(1rem,1.95vw,2rem)] font-light leading-tight normal-case tracking-[-0.02em] whitespace-nowrap',
        },
        {
            key: 'location',
            label: localizedFallback('Location', 'Локация'),
            value: localizedFallback('Ruse, Bulgaria', 'Русе, България'),
            valueClassName: 'text-2xl md:text-[1.9rem] font-light leading-tight',
        },
    ];

    return (
        <div className="shell-page-pad max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-12 md:gap-20 items-start">
                <section className="flex flex-col gap-8 md:gap-10">
                    <div>
                        <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-6"><EditableText contentKey="contact.hero.eyebrow" fallback={localizedFallback('Atelier Contact / Ruse, Bulgaria', 'Контакт с ателието / Русе, България')} editorLabel="Contact hero eyebrow" /></p>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full"><EditableText contentKey="contact.hero.title.line_one" fallback={localizedFallback('Personal', 'Личен')} editorLabel="Contact hero title line one" /></h1></div>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display storefront-hero-shift font-serif font-light uppercase translate-y-full"><EditableText contentKey="contact.hero.title.line_two" fallback={localizedFallback('Touch', 'Контакт')} editorLabel="Contact hero title line two" /></h1></div>
                    </div>

                    <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/65 font-light max-w-xl"><EditableText contentKey="contact.hero.copy" fallback={localizedFallback('Handmade fashion often needs a conversation: fit, timing, custom details, or styling direction. Send the atelier your information and question here, and keep the interaction personal.', 'Ръчно изработената мода често започва с разговор: за размер, срок, персонални детайли или стайлинг насока. Изпратете ни информацията и въпроса си тук, за да запазим общуването лично.')} editorLabel="Contact hero copy" /></p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
                        {contactCards.map(({ key, label, value, valueClassName }) => (
                            <div key={key} className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 p-5 md:p-6 rounded-sm">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey={`contact.cards.${key}.label`} fallback={label} editorLabel={`Contact ${key} card label`} /></p>
                                <p className={`font-serif ${valueClassName}`}><EditableText contentKey={`contact.cards.${key}.value`} fallback={value} editorLabel={`Contact ${key} card value`} /></p>
                            </div>
                        ))}

                        <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 p-5 md:p-6 rounded-sm md:col-span-2">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3"><EditableText contentKey="contact.cards.slogan.label" fallback={localizedFallback('Slogan', 'Мото')} editorLabel="Contact slogan label" /></p>
                            <p className="font-serif text-2xl md:text-[2.35rem] font-light leading-tight"><EditableText contentKey="contact.cards.slogan.value" fallback={localizedFallback('Beautiful People Smile More', 'Красивите хора се усмихват повече')} editorLabel="Contact slogan value" /></p>
                        </div>
                    </div>
                </section>

                <section className="xl:pt-6">
                    <ContactForm initialValues={initialValues} hasProductContext={Boolean(productName)} />
                </section>
            </div>
        </div>
    );
}