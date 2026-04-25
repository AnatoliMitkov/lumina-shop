import { DEFAULT_LANGUAGE, normalizeLanguage } from './language';

export const PRODUCT_STORAGE_BUCKET = 'product-media';

export const PRODUCT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

export const PRODUCT_LANGUAGE_VISIBILITY_OPTIONS = [
  { value: 'both', label: 'English + Bulgarian' },
  { value: 'en', label: 'English only' },
  { value: 'bg', label: 'Bulgarian only' },
];

export const PRODUCT_CATEGORY_OPTIONS = [
  'Vest',
  'Top',
  'Dress',
  'Layer',
  'Set',
  'Skirt',
  'Accessory',
  'Bespoke',
  'Atelier Piece',
];

export const PRODUCT_COLLECTION_OPTIONS = [
  'Signature Weaves',
  'Evening Structures',
  'Daylight Layers',
  'Resort Grid',
  'Atelier Editions',
  'Private Commission',
  'Atelier Archive',
];

export const PRODUCT_DEFAULTS = {
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

export function normalizeTextList(value) {
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

export function normalizeGalleryList(value) {
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

export function slugifyProductName(value = '') {
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

function normalizeStatus(value) {
  const normalizedValue = toText(value, PRODUCT_DEFAULTS.status).toLowerCase();
  const validValues = PRODUCT_STATUS_OPTIONS.map((option) => option.value);

  return validValues.includes(normalizedValue) ? normalizedValue : PRODUCT_DEFAULTS.status;
}

export function normalizeProductLanguageVisibility(value) {
  const normalizedValue = toText(value, PRODUCT_DEFAULTS.language_visibility).toLowerCase();
  const validValues = PRODUCT_LANGUAGE_VISIBILITY_OPTIONS.map((option) => option.value);

  return validValues.includes(normalizedValue) ? normalizedValue : PRODUCT_DEFAULTS.language_visibility;
}

export function isProductVisibleInLanguage(product = {}, language = DEFAULT_LANGUAGE) {
  const visibility = normalizeProductLanguageVisibility(product.language_visibility);
  const currentLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

  return visibility === 'both' || visibility === currentLanguage;
}

export function filterProductsByLanguage(products = [], language = DEFAULT_LANGUAGE) {
  return products
    .map((product) => normalizeProductRecord(product))
    .filter((product) => isProductVisibleInLanguage(product, language));
}

export function normalizeProductRecord(product = {}) {
  return {
    id: toText(product.id, PRODUCT_DEFAULTS.id),
    slug: toText(product.slug) || slugifyProductName(product.name || product.id || 'atelier-piece'),
    name: toText(product.name, 'Untitled Piece'),
    subtitle: toText(product.subtitle, PRODUCT_DEFAULTS.subtitle),
    language_visibility: normalizeProductLanguageVisibility(product.language_visibility),
    category: toText(product.category, PRODUCT_DEFAULTS.category),
    collection: toText(product.collection || product.category, PRODUCT_DEFAULTS.collection),
    status: normalizeStatus(product.status),
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

export function resolveProductGallery(product = {}) {
  const normalizedProduct = normalizeProductRecord(product);

  return uniqueList([
    normalizedProduct.image_main,
    normalizedProduct.image_detail,
    ...normalizedProduct.gallery,
  ]).filter(Boolean);
}

export function resolveStorefrontProduct(product = {}) {
  return normalizeProductRecord(product);
}

export function resolveStorefrontGallery(product = {}) {
  return resolveProductGallery(product);
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

export function buildCollectionsHref(filters = {}) {
  const searchParams = new URLSearchParams();
  const category = toText(filters.category);
  const collection = toText(filters.collection);

  if (category && category.toLowerCase() !== 'all') {
    searchParams.set('category', category);
  }

  if (collection && collection.toLowerCase() !== 'all') {
    searchParams.set('collection', collection);
  }

  const query = searchParams.toString();
  return query ? `/collections?${query}` : '/collections';
}

export function formatProductCurrency(value) {
  return `€${toNumber(value, 0).toFixed(2)}`;
}

export function createEmptyProductDraft(overrides = {}) {
  const nextDraft = {
    ...PRODUCT_DEFAULTS,
    ...overrides,
  };

  return {
    ...nextDraft,
    compare_at_price: nextDraft.compare_at_price == null ? '' : String(nextDraft.compare_at_price),
    slug: toText(nextDraft.slug),
    gallery: Array.isArray(nextDraft.gallery) ? nextDraft.gallery.join('\n') : toText(nextDraft.gallery),
    highlights: Array.isArray(nextDraft.highlights) ? nextDraft.highlights.join('\n') : toText(nextDraft.highlights),
    tags: Array.isArray(nextDraft.tags) ? nextDraft.tags.join(', ') : toText(nextDraft.tags),
    palette: Array.isArray(nextDraft.palette) ? nextDraft.palette.join(', ') : toText(nextDraft.palette),
  };
}

export function createProductEditorState(product = {}) {
  const normalizedProduct = normalizeProductRecord(product);

  return createEmptyProductDraft({
    ...normalizedProduct,
    compare_at_price: normalizedProduct.compare_at_price ?? '',
  });
}

export function buildProductMutationInput(product = {}) {
  const normalizedProduct = normalizeProductRecord({
    ...product,
    gallery: normalizeGalleryList(product.gallery),
    highlights: normalizeTextList(product.highlights),
    tags: normalizeTextList(product.tags),
    palette: normalizeTextList(product.palette),
  });

  return {
    slug: toText(product.slug) || slugifyProductName(normalizedProduct.name || normalizedProduct.id || 'atelier-piece'),
    name: normalizedProduct.name,
    subtitle: normalizedProduct.subtitle,
    language_visibility: normalizedProduct.language_visibility,
    category: normalizedProduct.category,
    collection: normalizedProduct.collection,
    status: normalizedProduct.status,
    featured: normalizedProduct.featured,
    price: normalizedProduct.price,
    compare_at_price: normalizedProduct.compare_at_price,
    description: normalizedProduct.description,
    story: normalizedProduct.story,
    materials: normalizedProduct.materials,
    care: normalizedProduct.care,
    fit_notes: normalizedProduct.fit_notes,
    artisan_note: normalizedProduct.artisan_note,
    image_main: normalizedProduct.image_main,
    image_detail: normalizedProduct.image_detail,
    gallery: normalizedProduct.gallery,
    highlights: normalizedProduct.highlights,
    tags: normalizedProduct.tags,
    palette: normalizedProduct.palette,
    inventory_count: normalizedProduct.inventory_count,
    lead_time_days: normalizedProduct.lead_time_days,
    sort_order: normalizedProduct.sort_order,
  };
}

export function buildProductBulkMutationInput(product = {}) {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(product, 'status')) {
    updates.status = normalizeStatus(product.status);
  }

  if (Object.prototype.hasOwnProperty.call(product, 'language_visibility')) {
    updates.language_visibility = normalizeProductLanguageVisibility(product.language_visibility);
  }

  if (Object.prototype.hasOwnProperty.call(product, 'category')) {
    updates.category = toText(product.category, PRODUCT_DEFAULTS.category);
  }

  if (Object.prototype.hasOwnProperty.call(product, 'collection')) {
    updates.collection = toText(product.collection, PRODUCT_DEFAULTS.collection);
  }

  if (Object.prototype.hasOwnProperty.call(product, 'featured')) {
    updates.featured = toBoolean(product.featured);
  }

  if (Object.prototype.hasOwnProperty.call(product, 'inventory_count')) {
    updates.inventory_count = Math.max(0, toInteger(product.inventory_count, PRODUCT_DEFAULTS.inventory_count));
  }

  if (Object.prototype.hasOwnProperty.call(product, 'lead_time_days')) {
    updates.lead_time_days = Math.max(1, toInteger(product.lead_time_days, PRODUCT_DEFAULTS.lead_time_days));
  }

  return updates;
}
