import { cookies } from 'next/headers';
import CollectionsArchive from '../../components/CollectionsArchive';
import { createClient } from '../../utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products } = await supabase.from('products').select('*');

    return (
        <div className="pt-32 md:pt-40 pb-24 md:pb-28 px-6 md:px-12 max-w-[1800px] mx-auto">
            <div className="mb-10 md:mb-14 grid grid-cols-1 xl:grid-cols-[1.02fr_0.98fr] gap-6 md:gap-10 items-end border-b border-[#1C1C1C]/12 pb-8 md:pb-10">
                <div>
                    <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-5">Collections / Archive</p>
                    <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full">Archive</h1></div>
                    <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display storefront-hero-shift font-serif font-light uppercase translate-y-full">Edit</h1></div>
                </div>

                <div className="flex flex-col gap-4 md:pb-2">
                    <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">The archive should stay easy to scan as the catalog grows, with space for lead pieces, quieter essentials, and private-client directions.</p>
                    <p className="hero-sub opacity-0 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">Built for a larger Supabase-backed catalog and ongoing admin updates.</p>
                </div>
            </div>

            <CollectionsArchive products={products ?? []} />
        </div>
    );
}
