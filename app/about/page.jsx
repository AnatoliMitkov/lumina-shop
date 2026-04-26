import { cookies } from 'next/headers';
import {
    createLocalizedValue as localizedFallback,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    normalizeLanguage,
    resolveLocalizedValue,
} from '../../utils/language';

export const dynamic = 'force-dynamic';

const aboutMetadataTitle = localizedFallback('About', 'За ателието');
const aboutMetadataDescription = localizedFallback(
    'Learn more about Styling by VA, the atelier perspective behind The VA Store, and the hand-knotted approach shaping each piece.',
    'Научете повече за Styling by VA, гледната точка на ателието зад The VA Store и ръчно възлования подход, който оформя всеки модел.'
);

const aboutPanels = [
    {
        title: localizedFallback('The atelier point of view', 'Гледната точка на ателието'),
        body: localizedFallback(
            'The VA Store is built around a slower fashion rhythm: sculptural silhouettes, deliberate restraint, and a respect for handwork that remains visible in the final piece instead of being polished away.',
            'The VA Store следва по-бавен ритъм на мода: скулптурни силуети, премерено присъствие и уважение към ръчната работа, която остава видима в завършения модел, вместо да бъде изгладена до безличност.'
        ),
    },
    {
        title: localizedFallback('Made by hand, not by shortcut', 'Създадено на ръка, не по бързия начин'),
        body: localizedFallback(
            'Each look starts with material, tension, and proportion. Hand-knotting, fringe work, and careful finishing are treated as design language, not decoration added at the end.',
            'Всеки модел започва с материал, напрежение и пропорция. Ръчното възловане, ресните и внимателният завършек се третират като език на дизайна, а не като украса, добавена накрая.'
        ),
    },
    {
        title: localizedFallback('Designed for presence', 'Създадено за присъствие'),
        body: localizedFallback(
            'The intention is not nostalgia. The intention is presence: pieces that feel composed, strong, and unmistakably personal on the woman wearing them.',
            'Целта не е носталгия. Целта е присъствие: модели, които стоят събрано, силно и отчетливо лично върху жената, която ги носи.'
        ),
    },
];

export async function generateMetadata() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return {
        title: getText(aboutMetadataTitle),
        description: getText(aboutMetadataDescription),
        alternates: {
            canonical: '/about',
        },
    };
}

export default async function AboutPage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return (
        <div className="shell-page-pad">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
                <section className="border-b border-[#1C1C1C]/10 pb-10">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45">{getText(localizedFallback('About / Atelier', 'За ателието'))}</p>
                    <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] font-light uppercase leading-[0.9] tracking-[0.06em] text-[#1C1C1C]">{getText(aboutMetadataTitle)}</h1>
                    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#1C1C1C]/65 md:text-base">
                        {getText(localizedFallback(
                            'This page gathers the atelier perspective behind the store: the discipline of hand-knotting, the editorial sensibility, and the way each silhouette is shaped to feel strong rather than ornamental.',
                            'Тази страница събира гледната точка на ателието зад магазина: дисциплината на ръчното възловане, редакционната чувствителност и начинът, по който всеки силует е оформен да изглежда силен, а не просто декоративен.'
                        ))}
                    </p>
                </section>

                <section className="grid gap-5 md:grid-cols-3">
                    {aboutPanels.map((panel) => (
                        <article key={getText(panel.title)} className="rounded-[1.6rem] border border-[#1C1C1C]/10 bg-white/55 p-6 md:p-8">
                            <h2 className="font-serif text-2xl font-light uppercase tracking-[0.06em] text-[#1C1C1C] md:text-[2rem]">{getText(panel.title)}</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/66 md:text-base">{getText(panel.body)}</p>
                        </article>
                    ))}
                </section>

                <section className="rounded-[1.8rem] border border-[#1C1C1C]/10 bg-[#1C1C1C] px-6 py-8 text-[#EFECE8] md:px-8 md:py-10">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/42">{getText(localizedFallback('Next step', 'Следваща стъпка'))}</p>
                    <h2 className="mt-4 font-serif text-2xl font-light uppercase tracking-[0.06em] text-white md:text-3xl">{getText(localizedFallback('Explore the collections or contact the atelier', 'Разгледайте колекциите или се свържете с ателието'))}</h2>
                    <div className="mt-6 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.22em]">
                        <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-white/80 transition-colors hover:bg-white/[0.08]">{getText(localizedFallback('Collections', 'Колекции'))}</a>
                        <a href="/contact" className="hover-target transition-link inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-white/80 transition-colors hover:bg-white/[0.08]">{getText(localizedFallback('Contact', 'Контакт'))}</a>
                    </div>
                </section>
            </div>
        </div>
    );
}