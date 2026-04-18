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
            <CollectionsArchive products={products ?? []} />
        </div>
    );
}
