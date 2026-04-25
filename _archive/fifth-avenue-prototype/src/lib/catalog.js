import { DEFAULT_LANGUAGE, normalizeLanguage } from '../../../../utils/language.js';
import { filterProductsByLanguage } from '../../../../utils/products.js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://hvkgcmgqelczdnvhxtrj.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2a2djbWdxZWxjemRudmh4dHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODUyMzcsImV4cCI6MjA5MTc2MTIzN30.ZAL2g033rRDN330ZkZh_MK8OkNZrZ50SOZH7UOjRwn0';

const PRODUCTS_ENDPOINT = `${SUPABASE_URL}/rest/v1/products?select=id,name,slug,price,subtitle,collection,image_main,image_detail,gallery,featured,sort_order,status,language_visibility,created_at&status=eq.active&order=featured.desc,sort_order.asc.nullslast,created_at.asc`;

const DISPLAYABLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

export const FALLBACK_PRODUCTS = [
  {
    id: '7cf0a8f1-d6aa-4a91-b60d-47ba3d5cfe12',
    name: 'The Ibiza — Sculptural Metallic Harness Top',
    slug: 'the-ibiza-metallic-sculptural-harness',
    collection: 'Evening Structures',
    subtitle: 'Metallic Cage & Corset Body Accessory',
    featured: true,
    sortOrder: 1,
    primaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776624216426-img-5581.jpg',
    secondaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/IMG_5581(1).JPG',
  },
  {
    id: 'a81a7349-93ae-4707-a05f-49e73e1d7a85',
    name: 'The Malibu — Long Beige Bamboo Fringe Layering Dress',
    slug: 'the-malibu-long-beige-bamboo-fringe-dress',
    collection: 'Resort Grid',
    subtitle: 'Eco-Conscious Luxury Fiber Piece',
    featured: false,
    sortOrder: 2,
    primaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776676873702-img-7511.jpeg',
    secondaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776676880065-facetune-01-02-2026-23-39-23.jpeg',
  },
  {
    id: '50c70f0c-987d-44ca-8593-ee5012d62d63',
    name: 'The Manhattan — Silver Multi-Layered Body Armor Harness',
    slug: 'the-manhattan-silver-layered-body-harness',
    collection: 'Accessories',
    subtitle: 'Architectural Metallic Statement Piece',
    featured: true,
    sortOrder: 3,
    primaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776691997589-img-5588-snapseedcopy.jpg',
    secondaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776691997589-img-5588-snapseedcopy.jpg',
  },
  {
    id: '3e9d2ee5-2554-4202-a651-660184690b10',
    name: 'The Tuscany — Deep Burgundy Loop-Knot Mini Skirt',
    slug: 'the-tuscany-burgundy-loop-knot-mini-skirt',
    collection: 'Casual',
    subtitle: 'High-Texture Sculptural Statement Mini',
    featured: true,
    sortOrder: 4,
    primaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776683493290-img-7894-snapseedcopy.jpeg',
    secondaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776683558912-20260413-180242-snapseedcopy.jpg',
  },
  {
    id: '39619540-3b6c-4348-bd73-06fecab99a22',
    name: 'The Sahara — Long Bronze Metallic Sculptural Fringe Gown',
    slug: 'the-sahara-long-bronze-metallic-fringe-gown',
    collection: 'Signature Weaves',
    subtitle: '3D-Knot Armor Statement Piece',
    featured: false,
    sortOrder: 5,
    primaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776687081042-img-5985-snapseedcopy-2.jpg',
    secondaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776668389979-img-5984-snapseedcopy.jpg',
  },
  {
    id: 'f2cf05b1-2d23-4923-8208-5661f52fc8f4',
    name: 'The Oasis — Luxury Bamboo Resort & Beach Set',
    slug: 'the-oasis-luxury-bamboo-resort-beach-set',
    collection: 'Resort Grid',
    subtitle: 'Ethereal Body Hardware & High-Shine Fringe Gown',
    featured: false,
    sortOrder: 5,
    primaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776793044782-img-6679-snapseedcopy.jpg',
    secondaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776793061134-img-6668-snapseedcopy.jpg',
  },
  {
    id: '86a93229-b3d2-4b08-a434-5846a1681e3f',
    name: 'The Paris — Hand-Sculpted Noir Maxi Gown',
    slug: 'the-paris-sculptural-noir-maxi',
    collection: 'Evening Structures',
    subtitle: 'Architectural Night Silhouette',
    featured: false,
    sortOrder: 6,
    primaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776686974414-img-6101-snapseedcopy.jpg',
    secondaryMedia:
      'https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/product-media/products/1776686974414-img-6101-snapseedcopy.jpg',
  },
];

function isDisplayableAsset(url) {
  if (!url) {
    return false;
  }

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return DISPLAYABLE_EXTENSIONS.some((extension) => pathname.endsWith(extension));
  } catch {
    return false;
  }
}

function getMediaList(product) {
  const gallery = Array.isArray(product.gallery) ? product.gallery : [];

  return [product.image_main, product.image_detail, ...gallery].filter(Boolean);
}

export function normalizeStageProduct(product) {
  const displayableMedia = getMediaList(product).filter(isDisplayableAsset);

  if (!displayableMedia.length) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    collection: product.collection || 'Collection',
    subtitle: product.subtitle || 'Editorial product selection',
    featured: Boolean(product.featured),
    sortOrder: product.sort_order ?? Number.MAX_SAFE_INTEGER,
    primaryMedia: displayableMedia[0],
    secondaryMedia: displayableMedia[1] ?? displayableMedia[0],
  };
}

export async function loadProducts({ signal, language = DEFAULT_LANGUAGE } = {}) {
  const currentLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
  const response = await fetch(PRODUCTS_ENDPOINT, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const normalizedProducts = filterProductsByLanguage(payload, currentLanguage)
    .map(normalizeStageProduct)
    .filter(Boolean);

  return normalizedProducts.length ? normalizedProducts : FALLBACK_PRODUCTS;
}