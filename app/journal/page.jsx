import { cookies } from 'next/headers';
import {
    createLocalizedValue as localizedFallback,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    normalizeLanguage,
    resolveLocalizedValue,
} from '../../utils/language';

export const dynamic = 'force-dynamic';

const journalMetadataTitle = localizedFallback('Journal', 'Дневник');
const journalMetadataDescription = localizedFallback(
    'A home for future blog and vlog entries from The VA Store: atelier notes, behind-the-scenes process, fittings, launches, and visual diaries.',
    'Място за бъдещи блог и влог публикации от The VA Store: бележки от ателието, поглед зад кулисите, проби, представяния и визуални дневници.'
);

const journalPanels = [
    {
        title: localizedFallback('Written notes', 'Писмени бележки'),
        body: localizedFallback(
            'Collection thoughts, fittings, process notes, and atelier reflections will live here in a slower written format.',
            'Тук ще живеят размисли за колекциите, проби, бележки от процеса и ателиерни наблюдения в по-бавен писмен формат.'
        ),
    },
    {
        title: localizedFallback('Video diary', 'Видео дневник'),
        body: localizedFallback(
            'Short moving-image stories can sit beside the written posts so blog and vlog stay in one calm destination instead of competing for attention.',
            'Кратките истории във видео формат могат да стоят до писмените публикации, така че блогът и влогът да съществуват на едно спокойно място, вместо да се конкурират за внимание.'
        ),
    },
    {
        title: localizedFallback('Coming soon', 'Очаквайте скоро'),
        body: localizedFallback(
            'The first entries are not published yet, but this page is now ready to become the editorial archive for releases, atelier moments, and behind-the-scenes material.',
            'Първите публикации все още не са качени, но тази страница вече е готова да стане редакционният архив за представяния, моменти от ателието и съдържание зад кулисите.'
        ),
    },
];

export async function generateMetadata() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return {
        title: getText(journalMetadataTitle),
        description: getText(journalMetadataDescription),
        alternates: {
            canonical: '/journal',
        },
    };
}

export default async function JournalPage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const getText = (value) => resolveLocalizedValue(value, currentLanguage);

    return (
        <div className="shell-page-pad">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
                <section className="border-b border-[#1C1C1C]/10 pb-10">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45">{getText(localizedFallback('Journal / Editorial', 'Дневник / Редакционно'))}</p>
                    <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] font-light uppercase leading-[0.9] tracking-[0.06em] text-[#1C1C1C]">{getText(localizedFallback('Blog / Vlog', 'Блог / Влог'))}</h1>
                    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#1C1C1C]/65 md:text-base">
                        {getText(localizedFallback(
                            'For now, blog and vlog live together here in one journal page. It keeps the destination cleaner while the first stories, process clips, fittings, and launch notes are prepared.',
                            'Засега блогът и влогът живеят заедно тук, в една обща journal страница. Така дестинацията остава по-чиста, докато се подготвят първите истории, клипове от процеса, проби и бележки около новите представяния.'
                        ))}
                    </p>
                </section>

                <section className="grid gap-5 md:grid-cols-3">
                    {journalPanels.map((panel) => (
                        <article key={getText(panel.title)} className="rounded-[1.6rem] border border-[#1C1C1C]/10 bg-white/55 p-6 md:p-8">
                            <h2 className="font-serif text-2xl font-light uppercase tracking-[0.06em] text-[#1C1C1C] md:text-[2rem]">{getText(panel.title)}</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/66 md:text-base">{getText(panel.body)}</p>
                        </article>
                    ))}
                </section>

                <section className="rounded-[1.8rem] border border-[#1C1C1C]/10 bg-[#1C1C1C] px-6 py-8 text-[#EFECE8] md:px-8 md:py-10">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/42">{getText(localizedFallback('Editorial archive', 'Редакционен архив'))}</p>
                    <h2 className="mt-4 font-serif text-2xl font-light uppercase tracking-[0.06em] text-white md:text-3xl">{getText(localizedFallback('When the first entries land, this page is ready', 'Когато излязат първите публикации, тази страница е готова'))}</h2>
                    <div className="mt-6 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.22em]">
                        <a href="/contact" className="hover-target transition-link inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-white/80 transition-colors hover:bg-white/[0.08]">{getText(localizedFallback('Contact the atelier', 'Свържете се с ателието'))}</a>
                        <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-white/80 transition-colors hover:bg-white/[0.08]">{getText(localizedFallback('See the collections', 'Вижте колекциите'))}</a>
                    </div>
                </section>
            </div>
        </div>
    );
}