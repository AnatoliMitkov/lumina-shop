import { cookies } from 'next/headers';
import CookiePolicyPreferencesPanel from '../../components/CookiePolicyPreferencesPanel';
import {
    createLocalizedValue as localizedFallback,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    normalizeLanguage,
    resolveLocalizedValue,
} from '../../utils/language';

export const dynamic = 'force-dynamic';

const cookieMetadataTitle = localizedFallback('Cookie Policy', 'Политика за бисквитките');
const cookieMetadataDescription = localizedFallback(
    'Read how The VA Store uses cookies, local storage, and similar technologies for cart, account, security, and performance features.',
    'Вижте как The VA Store използва бисквитки, local storage и сходни технологии за количката, профила, сигурността и производителността.'
);

const cookieSections = [
    {
        title: localizedFallback('Essential cookies', 'Необходими бисквитки'),
        body: localizedFallback(
            'The store uses essential cookies and similar session technologies to keep core features running. These may be used to preserve your cart session, maintain secure sign-in state, protect forms and checkout flows, and support other functionality that is required for the website to operate properly.',
            'Магазинът използва необходими бисквитки и сходни сесийни технологии, за да поддържа основните функции активни. Те могат да се използват за запазване на сесията на количката, за поддържане на защитен вход в профила, за защита на формите и процеса по поръчка, както и за друга функционалност, без която сайтът не може да работи коректно.'
        ),
    },
    {
        title: localizedFallback('Cart and account sessions', 'Сесии за количка и профил'),
        body: localizedFallback(
            'When you use the storefront, we may store a cart session identifier so your selected items can persist between visits. If you sign in, authentication-related cookies may also be used to keep your account session active and secure.',
            'Когато използвате сайта, е възможно да съхраняваме идентификатор на сесията на количката, така че избраните от вас артикули да се запазват между посещенията. Ако влезете в профила си, могат да се използват и бисквитки, свързани с удостоверяването, за да поддържат сесията ви активна и защитена.'
        ),
    },
    {
        title: localizedFallback('Preferences and local storage', 'Предпочитания и local storage'),
        body: localizedFallback(
            'The website may store non-cookie preferences in your browser, such as motion and experience settings, so the site can remember how you prefer it to behave on future visits.',
            'Сайтът може да съхранява в браузъра ви предпочитания, които не са бисквитки, например настройки за движение и изживяване, за да помни как предпочитате да се държи при следващи посещения.'
        ),
    },
    {
        title: localizedFallback('Performance and analytics', 'Производителност и анализ'),
        body: localizedFallback(
            'We may use privacy-conscious analytics, diagnostics, or performance tooling to understand storefront reliability and visitor interactions. When analytics cookies are offered through the consent banner, analytics only starts after you allow that category. These tools may process technical signals such as browser type, pages visited, approximate device data, and performance events.',
            'Възможно е да използваме аналитични, диагностични или performance инструменти, съобразени с поверителността, за да разбираме надеждността на сайта и начина, по който посетителите го използват. Когато аналитичните бисквитки се предлагат чрез банера за съгласие, анализът започва едва след като разрешите тази категория. Тези инструменти могат да обработват технически сигнали като тип браузър, посетени страници, приблизителни данни за устройството и събития, свързани с производителността.'
        ),
    },
    {
        title: localizedFallback('Third-party services', 'Услуги на трети страни'),
        body: localizedFallback(
            'If you use features supported by third parties, such as payment or embedded services, those providers may set their own cookies or process data according to their own policies. You should review the relevant third-party notices when using those services.',
            'Ако използвате функции, поддържани от трети страни, като плащания или вградени услуги, тези доставчици могат да задават собствени бисквитки или да обработват данни според собствените си политики. Добре е да прегледате съответните уведомления на тези доставчици, когато използвате услугите им.'
        ),
    },
    {
        title: localizedFallback('Managing cookies', 'Управление на бисквитките'),
        body: localizedFallback(
            'Most browsers let you block or delete cookies through their settings. You can also review or change the optional cookie choices directly on this page. Please note that disabling essential cookies can prevent parts of the store, including account, cart, and checkout features, from working correctly.',
            'Повечето браузъри ви позволяват да блокирате или изтривате бисквитки чрез настройките си. Можете също да прегледате или промените избора си за допълнителните бисквитки директно на тази страница. Имайте предвид, че изключването на необходимите бисквитки може да попречи части от магазина, включително профилът, количката и процесът по поръчка, да работят правилно.'
        ),
    },
    {
        title: localizedFallback('Contact', 'Контакт'),
        body: localizedFallback(
            'If you have questions about how cookies or similar technologies are used on this website, contact sales@stylingbyva.com.',
            'Ако имате въпроси как се използват бисквитките или сходните технологии на този сайт, свържете се с sales@stylingbyva.com.'
        ),
    },
];

export async function generateMetadata() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return {
        title: getText(cookieMetadataTitle),
        description: getText(cookieMetadataDescription),
        alternates: {
            canonical: '/cookie-policy',
        },
    };
}

export default async function CookiePolicyPage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return (
        <div className="shell-page-pad">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
                <section className="border-b border-[#1C1C1C]/10 pb-10">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45">{getText(localizedFallback('Legal / Cookies', 'Правни / Бисквитки'))}</p>
                    <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] font-light uppercase leading-[0.9] tracking-[0.06em] text-[#1C1C1C]">{getText(cookieMetadataTitle)}</h1>
                    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#1C1C1C]/65 md:text-base">
                        {getText(localizedFallback(
                            'This page explains how The VA Store uses cookies, local storage, and similar technologies across the storefront, account area, contact tools, and checkout flow.',
                            'Тази страница обяснява как The VA Store използва бисквитки, local storage и сходни технологии в магазина, профилната зона, контактните инструменти и процеса по поръчка.'
                        ))}
                    </p>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/38">{getText(localizedFallback('Last updated: April 26, 2026', 'Последна актуализация: 26 април 2026'))}</p>
                </section>

                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(19rem,0.95fr)] lg:items-start">
                    <article className="rounded-[1.6rem] border border-[#1C1C1C]/10 bg-white/55 p-6 md:p-8">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/42">{getText(localizedFallback('Second thoughts welcome', 'Промяната е възможна'))}</p>
                        <h2 className="mt-4 font-serif text-2xl font-light uppercase tracking-[0.06em] text-[#1C1C1C] md:text-3xl">{getText(localizedFallback('Cookie choices now live here', 'Изборът за бисквитки вече е тук'))}</h2>
                        <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/66 md:text-base">
                            {getText(localizedFallback(
                                'To keep the storefront visually clean after you accept or reject optional cookies, the floating cookie button is no longer pinned across the site. If you want to review or change that choice later, use the control panel on this page.',
                                'За да остане сайтът визуално чист след като приемете или откажете допълнителните бисквитки, плаващият бутон вече не стои закрепен навсякъде в магазина. Ако по-късно искате да прегледате или промените избора си, използвайте контролния панел на тази страница.'
                            ))}
                        </p>
                    </article>

                    <CookiePolicyPreferencesPanel language={currentLanguage} />
                </section>

                <section className="grid gap-5">
                    {cookieSections.map((section) => (
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