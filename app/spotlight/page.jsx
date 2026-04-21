import { cookies } from 'next/headers';
import SpotlightRunwayExperience from './SpotlightRunwayExperience';
import { createClient } from '../../utils/supabase/server';
import { buildCollectionsHref, resolveProductGallery, sortProducts } from '../../utils/products';

export const dynamic = 'force-dynamic';

const fallbackCollectionStory = {
    name: 'Editorial Avenue',
    href: '/collections',
    lookCount: 1,
    featuredCount: 1,
    categories: ['Atelier Piece'],
    palettes: ['Onyx', 'Gold'],
    leadProductName: 'The VA Signature',
    intro: 'A collection staged like the brightest window on a midnight avenue.',
    story: 'Spotlight becomes a virtual Fifth Avenue walkthrough: a lead showcase in glass, supporting windows in motion, and a direct line into the filtered archive once a collection catches the eye.',
    note: 'The strongest collection should feel unforgettable before the archive steps in with the detail.',
    frames: [
        'https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=2000',
        'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1800',
        'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=1800',
    ],
    frameKeys: [
        'spotlight.fallback.frame_one',
        'spotlight.fallback.frame_two',
        'spotlight.fallback.frame_three',
    ],
};

function normalizeValue(value) {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (value == null) {
        return '';
    }

    return String(value).trim();
}

function trimCopy(value, maxLength = 180) {
    const normalizedValue = normalizeValue(value);

    if (!normalizedValue) {
        return '';
    }

    if (normalizedValue.length <= maxLength) {
        return normalizedValue;
    }

    return `${normalizedValue.slice(0, maxLength - 3).trimEnd()}...`;
}

function uniqueValues(values = []) {
    return [...new Set(values.map((value) => normalizeValue(value)).filter(Boolean))];
}

function resolveCollectionFrames(products = []) {
    const frames = [];

    products.forEach((product) => {
        resolveProductGallery(product).forEach((image) => {
            if (image && !frames.includes(image)) {
                frames.push(image);
            }
        });
    });

    return frames.slice(0, 3);
}

function buildCollectionIntro(collectionName, leadProduct, categories = [], lookCount = 0) {
    const categoryCopy = categories.length > 0 ? categories.slice(0, 3).join(' / ') : 'atelier silhouettes';

    return trimCopy(
        leadProduct?.subtitle
        || leadProduct?.description
        || `${collectionName} steps onto the avenue with ${lookCount || 1} looks, ${categoryCopy}, and enough attitude to feel like its own private window story.`,
        180,
    );
}

function buildCollectionStory(collectionName, leadProduct, categories = [], lookCount = 0) {
    const categoryCopy = categories.length > 0 ? categories.join(', ') : 'atelier silhouettes';

    return trimCopy(
        leadProduct?.story
        || leadProduct?.description
        || `${collectionName} is built like a catwalk sequence through the house: ${lookCount || 1} looks, a controlled silhouette mix of ${categoryCopy}, and a storefront mood designed to pull the shopper deeper into the archive.`,
        320,
    );
}

function buildCollectionNote(leadProduct, collectionName) {
    return trimCopy(
        leadProduct?.artisan_note || `${collectionName} should feel like the kind of window you stop for, even before you know exactly why.`,
        170,
    );
}

function buildCollectionStories(products = []) {
    const collectionMap = new Map();

    products.forEach((product) => {
        const collectionName = normalizeValue(product.collection);

        if (!collectionName) {
            return;
        }

        if (!collectionMap.has(collectionName)) {
            collectionMap.set(collectionName, []);
        }

        collectionMap.get(collectionName).push(product);
    });

    return Array.from(collectionMap.entries()).map(([collectionName, collectionProducts]) => {
        const leadProduct = collectionProducts.find((product) => product.featured) || collectionProducts[0] || null;
        const categories = uniqueValues(collectionProducts.map((product) => product.category));
        const palettes = uniqueValues(collectionProducts.flatMap((product) => product.palette || [])).slice(0, 4);
        const frames = resolveCollectionFrames(collectionProducts);

        return {
            name: collectionName,
            href: buildCollectionsHref({ collection: collectionName }),
            lookCount: collectionProducts.length,
            featuredCount: collectionProducts.filter((product) => product.featured).length,
            categories,
            palettes,
            leadProductName: leadProduct?.name || collectionName,
            intro: buildCollectionIntro(collectionName, leadProduct, categories, collectionProducts.length),
            story: buildCollectionStory(collectionName, leadProduct, categories, collectionProducts.length),
            note: buildCollectionNote(leadProduct, collectionName),
            frames: frames.length > 0 ? frames : fallbackCollectionStory.frames,
        };
    });
}

export default async function SpotlightPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: products } = await supabase.from('products').select('*');

    const activeProducts = sortProducts(products ?? []).filter((product) => product.status === 'active');
    const collections = buildCollectionStories(activeProducts);
    const spotlightCollections = collections.length > 0 ? collections : [fallbackCollectionStory];

    return <SpotlightRunwayExperience collections={spotlightCollections} />;
}