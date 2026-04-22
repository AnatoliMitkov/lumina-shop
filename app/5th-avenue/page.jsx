import { SPOTLIGHT_PATH } from '../../utils/site-routes';
import { cookies } from 'next/headers';
import { createClient, isSupabaseConfigured } from '../../utils/supabase/server';
import { isSiteCopySetupError } from '../../utils/site-copy';
import { getCollectionMediaKeyPrefix, toCollectionMediaMap } from '../../utils/fifth-avenue-stage-media';
import FifthAvenuePrototypePageClient from './FifthAvenuePrototypePageClient';

export const metadata = {
    title: '5th Avenue',
    description: 'Experience the cinematic collection spotlight and explore featured windows from The VA Store.',
    alternates: {
        canonical: SPOTLIGHT_PATH,
    },
};

async function loadCollectionStageMediaOverrides() {
    if (!isSupabaseConfigured()) {
        return {};
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const keyPrefix = getCollectionMediaKeyPrefix();
    const { data, error } = await supabase
        .from('site_copy_entries')
        .select('key, value')
        .ilike('key', `${keyPrefix}%`);

    if (error) {
        if (isSiteCopySetupError(error)) {
            return {};
        }

        return {};
    }

    return toCollectionMediaMap(data || []);
}

export default async function FifthAvenuePage() {
    const collectionStageMediaOverrides = await loadCollectionStageMediaOverrides();

    return <FifthAvenuePrototypePageClient collectionStageMediaOverrides={collectionStageMediaOverrides} />;
}