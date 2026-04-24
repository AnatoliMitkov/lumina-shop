import { cookies } from 'next/headers';
import {
    createLocalizedValue as localizedFallback,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    normalizeLanguage,
    resolveLocalizedValue,
} from '../../utils/language';

export const dynamic = 'force-dynamic';

const privacyMetadataTitle = localizedFallback('Privacy Policy', 'Политика за поверителност');
const privacyMetadataDescription = localizedFallback(
    'Read how The VA Store collects, uses, and protects personal information for orders, newsletter subscriptions, contact requests, and account services.',
    'Вижте как The VA Store събира, използва и защитава личната информация за поръчки, абонаменти, контактни запитвания и услуги, свързани с профила.'
);

const privacySections = [
    {
        title: localizedFallback('What we collect', 'Какво събираме'),
        body: localizedFallback(
            'We collect the information you submit directly to us when you place an order, create an account, request a password reset, join the newsletter, submit a contact form, or communicate with the atelier. This can include your name, email address, phone number, delivery location, order details, custom measurements, and any message you choose to provide.',
            'Събираме информацията, която ни предоставяте директно, когато правите поръчка, създавате профил, заявявате нова парола, абонирате се за бюлетина, изпращате контактна форма или се свързвате с ателието. Това може да включва име, имейл адрес, телефонен номер, местоположение за доставка, детайли по поръчката, индивидуални мерки и всяко съобщение, което решите да изпратите.'
        ),
    },
    {
        title: localizedFallback('How we use it', 'Как използваме информацията'),
        body: localizedFallback(
            'We use your information to run the store, process and deliver orders, provide customer support, respond to inquiries, manage your account, send essential service messages, deliver newsletter updates only when you subscribe to them, and protect the website against abuse or fraudulent activity. We also use limited technical information to understand storefront performance and reliability.',
            'Използваме информацията ви, за да управляваме магазина, да обработваме и доставяме поръчки, да предоставяме клиентска поддръжка, да отговаряме на запитвания, да поддържаме профила ви, да изпращаме необходими служебни съобщения, да изпращаме новини само когато сте се абонирали за тях и да защитаваме сайта от злоупотреба или измамна активност. Използваме и ограничени технически данни, за да следим надеждността и работата на сайта.'
        ),
    },
    {
        title: localizedFallback('Payments and service providers', 'Плащания и доставчици на услуги'),
        body: localizedFallback(
            'Payments are processed through Stripe, and account or order data may be stored through Supabase and other infrastructure providers that support this website. Those providers only receive the information needed to perform their services and process it under their own security and privacy obligations.',
            'Плащанията се обработват чрез Stripe, а данни за акаунти и поръчки могат да се съхраняват чрез Supabase и други инфраструктурни доставчици, които поддържат този сайт. Тези доставчици получават само информацията, необходима за изпълнение на услугите им, и я обработват съгласно собствените си задължения за сигурност и поверителност.'
        ),
    },
    {
        title: localizedFallback('Cookies, sessions, and technical data', 'Бисквитки, сесии и технически данни'),
        body: localizedFallback(
            'The website uses essential session technologies to keep your cart working, maintain sign-in state, and support core storefront functionality. We may also process device, browser, and interaction data needed for security, diagnostics, analytics, and performance monitoring.',
            'Сайтът използва основни сесийни технологии, за да поддържа количката ви, да пази състоянието на вход в профила и да осигурява основната функционалност на магазина. Възможно е също да обработваме данни за устройство, браузър и взаимодействия, необходими за сигурност, диагностика, анализ и наблюдение на производителността.'
        ),
    },
    {
        title: localizedFallback('How long we keep data', 'Колко дълго пазим данните'),
        body: localizedFallback(
            'We keep personal information for as long as it is reasonably necessary to fulfill orders, provide customer support, maintain business records, comply with legal obligations, resolve disputes, and protect the store from misuse. Retention periods can vary depending on the type of record and the reason it was collected.',
            'Пазим личната информация толкова дълго, колкото е разумно необходимо, за да изпълним поръчки, да предоставим клиентска поддръжка, да поддържаме бизнес записи, да спазим законови задължения, да разрешаваме спорове и да защитаваме магазина от злоупотреба. Срокът на съхранение може да се различава според вида на записа и причината, поради която е събран.'
        ),
    },
    {
        title: localizedFallback('Your rights', 'Вашите права'),
        body: localizedFallback(
            'Depending on your location, you may have rights to request access to, correction of, or deletion of your personal information, and to object to or restrict certain processing. You can contact us if you want to make a privacy request or have questions about how your information is handled.',
            'В зависимост от местоположението ви може да имате право да поискате достъп, корекция или изтриване на личната си информация, както и да възразите срещу определена обработка или да поискате нейното ограничаване. Можете да се свържете с нас, ако искате да подадете искане, свързано с поверителността, или имате въпроси как се обработват данните ви.'
        ),
    },
    {
        title: localizedFallback('Contact', 'Контакт'),
        body: localizedFallback(
            'For privacy questions or requests, contact The VA Store at sales@stylingbyva.com. If the business contact details change, this page should be updated to reflect the latest support address.',
            'За въпроси или искания, свързани с поверителността, се свържете с The VA Store на sales@stylingbyva.com. Ако бизнес контактите се променят, тази страница трябва да бъде обновена с актуалния адрес за връзка.'
        ),
    },
];

export async function generateMetadata() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return {
        title: getText(privacyMetadataTitle),
        description: getText(privacyMetadataDescription),
        alternates: {
            canonical: '/privacy-policy',
        },
    };
}

export default async function PrivacyPolicyPage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return (
        <div className="shell-page-pad">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
                <section className="border-b border-[#1C1C1C]/10 pb-10">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45">{getText(localizedFallback('Legal / Privacy', 'Правни / Поверителност'))}</p>
                    <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] font-light uppercase leading-[0.9] tracking-[0.06em] text-[#1C1C1C]">{getText(privacyMetadataTitle)}</h1>
                    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#1C1C1C]/65 md:text-base">
                        {getText(localizedFallback(
                            'This policy explains how The VA Store and Styling by VA handle personal information collected through this website. It is written to cover storefront browsing, customer contact, checkout, and account-related activity.',
                            'Тази политика обяснява как The VA Store и Styling by VA обработват личната информация, събрана чрез този сайт. Тя обхваща разглеждането на магазина, клиентската комуникация, процеса по поръчка и активността, свързана с профила.'
                        ))}
                    </p>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/38">{getText(localizedFallback('Last updated: April 24, 2026', 'Последна актуализация: 24 април 2026'))}</p>
                </section>

                <section className="grid gap-5">
                    {privacySections.map((section) => (
                        <article key={getText(section.title)} className="rounded-[1.6rem] border border-[#1C1C1C]/10 bg-white/55 p-6 md:p-8">
                            <h2 className="font-serif text-2xl font-light uppercase tracking-[0.06em] text-[#1C1C1C] md:text-3xl">{getText(section.title)}</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/66 md:text-base">{getText(section.body)}</p>
                        </article>
                    ))}
                </section>
            </div>
        </div>
    );
}