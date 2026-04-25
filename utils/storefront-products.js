import { normalizeProductLanguageVisibility } from './products';
import { getStockProductGallery } from './storefront-media';

const PRODUCT_DEFAULTS = {
  id: '',
  slug: '',
  name: '',
  subtitle: '',
  language_visibility: 'both',
  category: 'Atelier Piece',
  collection: 'Atelier Archive',
  status: 'draft',
  featured: false,
  price: 0,
  compare_at_price: null,
  description: '',
  story: '',
  materials: '',
  care: '',
  fit_notes: '',
  artisan_note: '',
  image_main: '',
  image_detail: '',
  gallery: [],
  highlights: [],
  tags: [],
  palette: [],
  inventory_count: 0,
  lead_time_days: 14,
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

const LEGACY_PRODUCT_IMAGE_PATTERN = /images\.pexels\.com\/photos\/(291762|1036623|3317434|1926769|1126993)\//i;

function toText(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value == null) {
    return fallback;
  }

  return String(value).trim() || fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? ''));

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Number(parsed.toFixed(2));
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function toNullablePrice(value) {
  if (value == null || value === '') {
    return null;
  }

  return toNumber(value, 0);
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  const normalized = toText(value).toLowerCase();

  return normalized === 'true'
    || normalized === '1'
    || normalized === 'yes'
    || normalized === 'on';
}

function parseJsonArrayString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith('[')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedValue);

    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function uniqueList(values = []) {
  const seen = new Set();

  return values.filter((value) => {
    const normalizedValue = toText(value);

    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
}

function normalizeTextList(value) {
  if (Array.isArray(value)) {
    return uniqueList(value.map((entry) => toText(entry)).filter(Boolean));
  }

  const parsedJson = parseJsonArrayString(value);

  if (parsedJson) {
    return uniqueList(parsedJson.map((entry) => toText(entry)).filter(Boolean));
  }

  if (typeof value === 'string') {
    return uniqueList(
      value
        .split(/[\n,]+/)
        .map((entry) => toText(entry))
        .filter(Boolean)
    );
  }

  return [];
}

function normalizeGalleryList(value) {
  if (Array.isArray(value)) {
    return uniqueList(
      value
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry;
          }

          if (entry && typeof entry === 'object') {
            return entry.url || entry.src || '';
          }

          return '';
        })
        .filter(Boolean)
    );
  }

  const parsedJson = parseJsonArrayString(value);

  if (parsedJson) {
    return normalizeGalleryList(parsedJson);
  }

  if (typeof value === 'string') {
    return uniqueList(
      value
        .split(/[\n,]+/)
        .map((entry) => toText(entry))
        .filter(Boolean)
    );
  }

  return [];
}

function slugifyProductName(value = '') {
  const normalized = toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'atelier-piece';
}

function normalizeRouteSlugSegment(value = '') {
  return toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildProductRouteSlug(product = {}) {
  const normalizedProduct = normalizeProductRecord(product);
  const existingSlug = toText(normalizedProduct.slug).toLowerCase();

  if (existingSlug && normalizeRouteSlugSegment(existingSlug) === existingSlug) {
    return existingSlug;
  }

  const nameSlug = normalizeRouteSlugSegment(normalizedProduct.name);

  if (nameSlug) {
    return nameSlug;
  }

  const legacySlug = normalizeRouteSlugSegment(existingSlug);

  if (legacySlug) {
    return legacySlug;
  }

  const idSlug = normalizeRouteSlugSegment(normalizedProduct.id);

  return idSlug || existingSlug || normalizedProduct.id || 'atelier-piece';
}

function normalizeProductRecord(product = {}) {
  return {
    id: toText(product.id, PRODUCT_DEFAULTS.id),
    slug: toText(product.slug) || slugifyProductName(product.name || product.id || 'atelier-piece'),
    name: toText(product.name, 'Untitled Piece'),
    subtitle: toText(product.subtitle, PRODUCT_DEFAULTS.subtitle),
    language_visibility: normalizeProductLanguageVisibility(product.language_visibility),
    category: toText(product.category, PRODUCT_DEFAULTS.category),
    collection: toText(product.collection || product.category, PRODUCT_DEFAULTS.collection),
    status: toText(product.status, PRODUCT_DEFAULTS.status).toLowerCase(),
    featured: toBoolean(product.featured),
    price: toNumber(product.price, PRODUCT_DEFAULTS.price),
    compare_at_price: toNullablePrice(product.compare_at_price),
    description: toText(product.description, PRODUCT_DEFAULTS.description),
    story: toText(product.story, PRODUCT_DEFAULTS.story),
    materials: toText(product.materials, PRODUCT_DEFAULTS.materials),
    care: toText(product.care, PRODUCT_DEFAULTS.care),
    fit_notes: toText(product.fit_notes, PRODUCT_DEFAULTS.fit_notes),
    artisan_note: toText(product.artisan_note, PRODUCT_DEFAULTS.artisan_note),
    image_main: toText(product.image_main, PRODUCT_DEFAULTS.image_main),
    image_detail: toText(product.image_detail, PRODUCT_DEFAULTS.image_detail),
    gallery: normalizeGalleryList(product.gallery),
    highlights: normalizeTextList(product.highlights),
    tags: normalizeTextList(product.tags),
    palette: normalizeTextList(product.palette),
    inventory_count: Math.max(0, toInteger(product.inventory_count, PRODUCT_DEFAULTS.inventory_count)),
    lead_time_days: Math.max(1, toInteger(product.lead_time_days, PRODUCT_DEFAULTS.lead_time_days)),
    sort_order: toInteger(product.sort_order, PRODUCT_DEFAULTS.sort_order),
    created_at: toText(product.created_at, PRODUCT_DEFAULTS.created_at),
    updated_at: toText(product.updated_at, PRODUCT_DEFAULTS.updated_at),
  };
}

function isLegacyProductImage(value = '') {
  return LEGACY_PRODUCT_IMAGE_PATTERN.test(String(value || ''));
}

function buildStorefrontFallbackGallery(product = {}) {
  return getStockProductGallery(product, 5);
}

function shouldUseStorefrontFallbackMedia(product = {}) {
  const media = [product.image_main, product.image_detail, ...product.gallery].filter(Boolean);

  if (media.length === 0) {
    return true;
  }

  return media.every((entry) => isLegacyProductImage(entry));
}

export function resolveStorefrontProduct(product = {}) {
  const normalizedProduct = normalizeProductRecord(product);

  if (!shouldUseStorefrontFallbackMedia(normalizedProduct)) {
    return normalizedProduct;
  }

  const storefrontGallery = buildStorefrontFallbackGallery(normalizedProduct);

  return {
    ...normalizedProduct,
    image_main: storefrontGallery[0],
    image_detail: storefrontGallery[1],
    gallery: storefrontGallery.slice(2),
  };
}

export function resolveStorefrontGallery(product = {}) {
  const storefrontProduct = resolveStorefrontProduct(product);

  return uniqueList([
    storefrontProduct.image_main,
    storefrontProduct.image_detail,
    ...storefrontProduct.gallery,
  ]).filter(Boolean);
}

export function sortProducts(products = []) {
  return [...products]
    .map((product) => normalizeProductRecord(product))
    .sort((leftProduct, rightProduct) => {
      if (leftProduct.featured !== rightProduct.featured) {
        return leftProduct.featured ? -1 : 1;
      }

      if (leftProduct.sort_order !== rightProduct.sort_order) {
        return leftProduct.sort_order - rightProduct.sort_order;
      }

      if (leftProduct.collection !== rightProduct.collection) {
        return leftProduct.collection.localeCompare(rightProduct.collection);
      }

      return leftProduct.name.localeCompare(rightProduct.name);
    });
}

export function buildProductHref(product = {}) {
  const slugOrId = buildProductRouteSlug(product);

  return `/product/${encodeURIComponent(slugOrId)}`;
}

export function formatProductCurrency(value) {
  return `€${toNumber(value, 0).toFixed(2)}`;
}