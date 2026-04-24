import { cookies } from 'next/headers';
import CollectionsArchive from '../../components/CollectionsArchive';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, normalizeLanguage } from '../../utils/language';
import { filterProductsByLanguage } from '../../utils/products';
import { createClient } from '../../utils/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Collections',
    description: 'Browse The VA Store collections and discover handmade avant-garde macrame fashion by Styling by VA.',
    alternates: {
        canonical: '/collections',
    },
};

export default async function CollectionsPage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const supabase = createClient(cookieStore);
    const { data: products } = await supabase.from('products').select('*');
    const visibleProducts = filterProductsByLanguage(products ?? [], currentLanguage);

    return (
        <div className="shell-page-pad max-w-[1800px] mx-auto">
            <CollectionsArchive products={visibleProducts} />
        </div>
    );
}
