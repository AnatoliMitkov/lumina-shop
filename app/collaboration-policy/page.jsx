import { cookies } from 'next/headers';
import {
    createLocalizedValue as localizedFallback,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    normalizeLanguage,
    resolveLocalizedValue,
} from '../../utils/language';
import { COLLABORATION_POLICY_PATH } from '../../utils/site-routes';

export const dynamic = 'force-dynamic';

const collaborationPolicyMetadataTitle = localizedFallback('Collaboration Policy', 'Политика за партньорство');
const collaborationPolicyMetadataDescription = localizedFallback(
    'Read the creator collaboration working terms for THE VA STORE, including approval, deliverables, affiliate rules, usage rights, and review conditions.',
    'Прочетете работните условия за creator collaboration с THE VA STORE, включително одобрение, deliverables, affiliate правила, права за използване и условия за преглед.'
);

const collaborationPolicySections = [
    {
        title: localizedFallback('Approval and eligibility', 'Одобрение и допустимост'),
        body: localizedFallback(
            'Applications are reviewed manually. Approval is not guaranteed and depends on aesthetic fit, content quality, audience alignment, and whether the creator profile matches the visual direction of THE VA STORE. Follower count alone does not guarantee approval.',
            'Кандидатурите се преглеждат ръчно. Одобрението не е гарантирано и зависи от естетически fit, качество на съдържанието, съвпадение с аудиторията и това дали профилът отговаря на визуалната посока на THE VA STORE. Самият брой последователи не гарантира одобрение.'
        ),
    },
    {
        title: localizedFallback('Creator pricing and refund review', 'Creator pricing и refund review'),
        body: localizedFallback(
            'Approved creators may receive creator pricing on eligible orders. Any remaining refund review is performance-based and only considered after all required deliverables are completed on time and at the requested visual standard. A refund is not automatic and remains subject to brand review.',
            'Одобрените профили могат да получат creator pricing за допустими поръчки. Всеки последващ refund review е обвързан с резултата и се разглежда едва след изпълнение на всички изисквани deliverables в срок и в поискан визуален стандарт. Refund не е автоматичен и остава предмет на преглед от бранда.'
        ),
    },
    {
        title: localizedFallback('Deliverables and deadline', 'Deliverables и срок'),
        body: localizedFallback(
            'Unless the brand agrees otherwise in writing, creators are expected to publish the required content within 7 days of receiving the approved order. Deliverables include a premium video post, brand tagging, collaborator invitation where supported, raw-footage handoff, and a sequence of 3 consecutive stories with a direct link sticker.',
            'Освен ако брандът не се съгласи писмено на друго, от създателите се очаква да публикуват изискваното съдържание до 7 дни след получаване на одобрената поръчка. Deliverables включват premium видео публикация, тагване на бранда, покана като collaborator където е възможно, предаване на raw footage и поредица от 3 последователни stories с директен sticker link.'
        ),
    },
    {
        title: localizedFallback('Content standard and reuse rights', 'Стандарт за съдържанието и права за използване'),
        body: localizedFallback(
            'Content should be clean, well-lit, watermark-free, and suitable for premium brand use. By submitting the application and accepting the collaboration terms, the creator confirms that THE VA STORE may reuse the delivered content and raw footage for marketing, website placement, paid ads, and brand social media, unless a separate written agreement states otherwise.',
            'Съдържанието трябва да бъде чисто, добре осветено, без watermark и подходящо за premium използване от бранда. С подаването на кандидатурата и приемането на условията създателят потвърждава, че THE VA STORE може да използва предаденото съдържание и raw footage за маркетинг, позициониране в сайта, paid ads и социалните мрежи на бранда, освен ако отделно писмено споразумение не предвижда друго.'
        ),
    },
    {
        title: localizedFallback('Affiliate code and audience discount', 'Affiliate код и отстъпка за аудиторията'),
        body: localizedFallback(
            'When an affiliate code is issued, commission applies only to tracked, completed orders that comply with the current collaboration and affiliate terms. Audience discount availability and stackability remain subject to the active store rules at the time of purchase. The brand may suspend, update, or remove a code if misuse, inaccurate promotion, or policy breaches are detected.',
            'Когато бъде издаден affiliate код, комисионата се прилага само за проследени и завършени поръчки, които отговарят на действащите collaboration и affiliate условия. Наличието на отстъпка за аудиторията и възможността за комбиниране остават предмет на активните правила на магазина към момента на покупката. Брандът може да спре, промени или премахне код при злоупотреба, неточно промотиране или нарушение на политиката.'
        ),
    },
    {
        title: localizedFallback('Policy changes and contact', 'Промени по политиката и контакт'),
        body: localizedFallback(
            'THE VA STORE may update this policy when the collaboration structure changes. For questions about collaboration eligibility, deliverables, approvals, or policy interpretation, contact sales@stylingbyva.com before publishing content or completing a purchase under creator terms.',
            'THE VA STORE може да актуализира тази policy страница, когато структурата на collaboration програмата се променя. За въпроси относно допустимост, deliverables, одобрение или тълкуване на политиката се свържете с sales@stylingbyva.com преди публикуване на съдържание или завършване на покупка по creator условия.'
        ),
    },
];

export async function generateMetadata() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return {
        title: getText(collaborationPolicyMetadataTitle),
        description: getText(collaborationPolicyMetadataDescription),
        alternates: {
            canonical: COLLABORATION_POLICY_PATH,
        },
    };
}

export default async function CollaborationPolicyPage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return (
        <div className="shell-page-pad">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
                <section className="border-b border-[#1C1C1C]/10 pb-10">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45">{getText(localizedFallback('Legal / Collaboration', 'Правни / Партньорство'))}</p>
                    <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] font-light uppercase leading-[0.9] tracking-[0.06em] text-[#1C1C1C]">{getText(collaborationPolicyMetadataTitle)}</h1>
                    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#1C1C1C]/65 md:text-base">
                        {getText(localizedFallback(
                            'This page holds the fuller working terms for the THE VA STORE collaboration prototype: approvals, content obligations, creator pricing logic, affiliate handling, and brand usage rights.',
                            'Тази страница съдържа по-пълните работни условия за THE VA STORE collaboration prototype: одобрение, задължения за съдържание, логика за creator pricing, affiliate условия и права за използване от бранда.'
                        ))}
                    </p>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/38">{getText(localizedFallback('Last updated: April 26, 2026', 'Последна актуализация: 26 април 2026'))}</p>
                </section>

                <section className="grid gap-5">
                    {collaborationPolicySections.map((section) => (
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