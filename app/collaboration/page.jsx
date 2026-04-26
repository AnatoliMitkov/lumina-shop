import { cookies } from 'next/headers';
import CollaborationStageExperience from '../../components/CollaborationStageExperience';
import { FALLBACK_PRODUCTS, normalizeStageProduct } from '../../_archive/fifth-avenue-prototype/src/lib/catalog.js';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, normalizeLanguage } from '../../utils/language';
import { filterProductsByLanguage } from '../../utils/products';
import { COLLABORATION_PATH, COLLABORATION_POLICY_PATH } from '../../utils/site-routes';
import { createClient, isSupabaseConfigured } from '../../utils/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Creator Partnership',
    description: 'A fixed-viewport creator partnership experience for THE VA STORE with cinematic stage transitions, direct benefit framing, and a final apply-now CTA.',
    alternates: {
        canonical: COLLABORATION_PATH,
    },
};

function toStageMedia(products = []) {
    return products
        .slice(0, 5)
        .map((product, index) => ({
            id: product.id || `stage-${index + 1}`,
            src: product.primaryMedia,
            alt: product.name || `Collaboration stage image ${index + 1}`,
            name: product.name || 'THE VA STORE',
            subtitle: product.subtitle || '',
            collection: product.collection || 'THE VA STORE',
        }))
        .filter((entry) => entry.src);
}

async function loadStageMedia(supabase, language) {
    const fallbackMedia = toStageMedia(FALLBACK_PRODUCTS);

    if (!isSupabaseConfigured()) {
        return fallbackMedia;
    }

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, subtitle, collection, image_main, image_detail, gallery, featured, sort_order, status, language_visibility, created_at')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) {
        return fallbackMedia;
    }

    const stageProducts = filterProductsByLanguage(products ?? [], language)
        .map(normalizeStageProduct)
        .filter(Boolean);

    const liveMedia = toStageMedia(stageProducts.length > 0 ? stageProducts : FALLBACK_PRODUCTS);

    if (liveMedia.length >= 5) {
        return liveMedia;
    }

    const missingFallbackMedia = fallbackMedia.filter((entry) => !liveMedia.some((liveEntry) => liveEntry.src === entry.src));

    return [...liveMedia, ...missingFallbackMedia].slice(0, 5);
}

export default async function CollaborationPage() {
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const supabase = createClient(cookieStore);
    const [{ data: { user } }, stageMedia] = await Promise.all([
        supabase.auth.getUser(),
        loadStageMedia(supabase, currentLanguage),
    ]);
    let profile = null;

    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

        profile = data;
    }

    return (
        <CollaborationStageExperience
            initialLanguage={currentLanguage}
            initialValues={{
                fullName: profile?.full_name || user?.user_metadata?.full_name || '',
                email: user?.email || '',
                phone: '',
                socialLinks: [''],
                profileUrl: '',
                motivation: '',
            }}
            policyHref={COLLABORATION_POLICY_PATH}
            stageMedia={stageMedia}
        />
    );
}