import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const HOME_PAGE_BUCKET = 'Home Page';
const DEFAULT_LANGUAGE = 'en';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.heic', '.heif']);
const EXECUTE = process.argv.includes('--execute');
const SITE_COPY_KEYS = [
  { key: 'home.hero.media.video', targetPath: 'hero/hero-background', label: 'Home hero media' },
  { key: 'home.category_showcase.atelier-archive.image', targetPath: 'category-showcase/atelier-archive', label: 'Atelier archive showcase' },
  { key: 'home.category_showcase.evening-structures.image', targetPath: 'category-showcase/evening-structures', label: 'Evening structures showcase' },
  { key: 'home.category_showcase.private-commission.image', targetPath: 'category-showcase/private-commission', label: 'Private commission showcase' },
  { key: 'home.brand.image', targetPath: 'brand/brand-story', label: 'Home brand image' },
];

function parseEnvFile(text) {
  const env = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const match = trimmedLine.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    let value = match[2].trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[match[1]] = value;
  }

  return env;
}

async function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envText = await fs.readFile(envPath, 'utf8');
  return parseEnvFile(envText);
}

function toText(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value == null) {
    return fallback;
  }

  return String(value).trim() || fallback;
}

function slugify(value, fallback = 'asset') {
  const normalizedValue = toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedValue || fallback;
}

function uniqueList(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeLanguage(value) {
  const normalizedValue = toText(value, DEFAULT_LANGUAGE).toLowerCase();
  return normalizedValue === 'bg' ? 'bg' : DEFAULT_LANGUAGE;
}

function normalizeLanguageVisibility(value) {
  const normalizedValue = toText(value, 'both').toLowerCase();
  return ['both', 'en', 'bg'].includes(normalizedValue) ? normalizedValue : 'both';
}

function isProductVisibleInLanguage(product, language) {
  const visibility = normalizeLanguageVisibility(product.language_visibility);
  const currentLanguage = normalizeLanguage(language);
  return visibility === 'both' || visibility === currentLanguage;
}

function normalizeGallery(value) {
  if (Array.isArray(value)) {
    return uniqueList(value.map((entry) => toText(entry)).filter(Boolean));
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(trimmedValue);
      if (Array.isArray(parsedValue)) {
        return normalizeGallery(parsedValue);
      }
    } catch {
      // Fall through to delimiter parsing.
    }

    return uniqueList(
      trimmedValue
        .split(/[\n,]+/)
        .map((entry) => toText(entry))
        .filter(Boolean)
    );
  }

  return [];
}

function compareProducts(leftProduct, rightProduct) {
  if (Boolean(leftProduct.featured) !== Boolean(rightProduct.featured)) {
    return leftProduct.featured ? -1 : 1;
  }

  const leftSortOrder = Number.isFinite(Number(leftProduct.sort_order)) ? Number(leftProduct.sort_order) : 0;
  const rightSortOrder = Number.isFinite(Number(rightProduct.sort_order)) ? Number(rightProduct.sort_order) : 0;

  if (leftSortOrder !== rightSortOrder) {
    return leftSortOrder - rightSortOrder;
  }

  const leftCollection = toText(leftProduct.collection);
  const rightCollection = toText(rightProduct.collection);

  if (leftCollection !== rightCollection) {
    return leftCollection.localeCompare(rightCollection);
  }

  return toText(leftProduct.name, 'Untitled Piece').localeCompare(toText(rightProduct.name, 'Untitled Piece'));
}

function resolveFeaturedProductImages(product) {
  const gallery = uniqueList([
    toText(product.image_main),
    toText(product.image_detail),
    ...normalizeGallery(product.gallery),
  ]).filter(Boolean);

  const primaryImage = gallery[0] || toText(product.image_main);
  const secondaryImage = gallery[1] || primaryImage;

  return [
    { role: 'primary', url: primaryImage },
    { role: 'secondary', url: secondaryImage },
  ].filter((entry, index, collection) => {
    if (!entry.url) {
      return false;
    }

    return collection.findIndex((candidate) => candidate.url === entry.url) === index;
  });
}

function parsePossibleJsonObject(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith('{') || !trimmedValue.endsWith('}')) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(trimmedValue);
    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function parseSiteCopyMediaValue(value) {
  const parsedObject = parsePossibleJsonObject(value);

  if (parsedObject) {
    return {
      kind: 'json',
      parsed: parsedObject,
      src: toText(parsedObject.src),
    };
  }

  return {
    kind: 'text',
    parsed: null,
    src: toText(value),
  };
}

function serializeSiteCopyMediaValue(entry, nextSrc) {
  if (entry.kind === 'json') {
    return JSON.stringify({
      ...entry.parsed,
      src: nextSrc,
    });
  }

  return nextSrc;
}

function parseStorageUrl(urlValue, projectHost) {
  try {
    const parsedUrl = new URL(urlValue);
    const publicPrefix = '/storage/v1/object/public/';
    const markerIndex = parsedUrl.pathname.indexOf(publicPrefix);

    if (markerIndex < 0) {
      return null;
    }

    if (projectHost && parsedUrl.host !== projectHost) {
      return null;
    }

    const relativePath = decodeURIComponent(parsedUrl.pathname.slice(markerIndex + publicPrefix.length));
    const firstSlashIndex = relativePath.indexOf('/');

    if (firstSlashIndex <= 0) {
      return null;
    }

    return {
      origin: `${parsedUrl.protocol}//${parsedUrl.host}`,
      host: parsedUrl.host,
      bucket: relativePath.slice(0, firstSlashIndex),
      path: relativePath.slice(firstSlashIndex + 1),
    };
  } catch {
    return null;
  }
}

function isImageStoragePath(filePath) {
  const extension = path.posix.extname(filePath || '').toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
}

function buildCanonicalSourceId(storageInfo) {
  return `${storageInfo.host}|${storageInfo.bucket}|${storageInfo.path}`;
}

function buildProductTargetBase(product, role) {
  const productSlug = slugify(product.slug || product.name || product.id, 'featured-product');
  return `featured-products/${productSlug}-${role}`;
}

function chooseTargetBase(asset) {
  const siteCopyUsage = asset.usages.find((usage) => usage.type === 'site_copy');

  if (siteCopyUsage) {
    return siteCopyUsage.targetBase;
  }

  const productUsage = asset.usages.find((usage) => usage.type === 'product');
  return productUsage ? buildProductTargetBase(productUsage.product, productUsage.role) : `misc/${slugify(path.posix.basename(asset.source.path, path.posix.extname(asset.source.path)))}`;
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function summariseUsage(usage) {
  if (usage.type === 'site_copy') {
    return `${usage.key}`;
  }

  return `product:${usage.product.slug || usage.product.id}:${usage.role}`;
}

async function ensureBucketExists(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    throw error;
  }

  const existingBucket = (buckets || []).find((bucket) => bucket.name === HOME_PAGE_BUCKET || bucket.id === HOME_PAGE_BUCKET);

  if (existingBucket) {
    return existingBucket;
  }

  if (!EXECUTE) {
    return null;
  }

  const { data, error: createError } = await supabase.storage.createBucket(HOME_PAGE_BUCKET, { public: true });

  if (createError) {
    throw createError;
  }

  return data;
}

async function buildHomepageAssetPlan(supabase, projectHost) {
  const siteCopyKeyList = SITE_COPY_KEYS.map((entry) => entry.key);
  const [{ data: siteCopyEntries, error: siteCopyError }, { data: products, error: productError }] = await Promise.all([
    supabase.from('site_copy_entries').select('key, value').in('key', siteCopyKeyList),
    supabase
      .from('products')
      .select('id, slug, name, collection, featured, sort_order, status, language_visibility, image_main, image_detail, gallery')
      .eq('status', 'active'),
  ]);

  if (siteCopyError) {
    throw siteCopyError;
  }

  if (productError) {
    throw productError;
  }

  const assetMap = new Map();
  const externalReferences = [];
  const skippedReferences = [];

  function addAsset(urlValue, usage) {
    const trimmedUrl = toText(urlValue);

    if (!trimmedUrl) {
      skippedReferences.push({ usage: summariseUsage(usage), reason: 'empty' });
      return;
    }

    const storageInfo = parseStorageUrl(trimmedUrl, projectHost);

    if (!storageInfo) {
      externalReferences.push({ usage: summariseUsage(usage), url: trimmedUrl });
      return;
    }

    if (!isImageStoragePath(storageInfo.path)) {
      skippedReferences.push({ usage: summariseUsage(usage), reason: 'not-image', url: trimmedUrl });
      return;
    }

    const assetId = buildCanonicalSourceId(storageInfo);
    const extension = path.posix.extname(storageInfo.path).toLowerCase() || '.jpg';
    const existingAsset = assetMap.get(assetId);

    if (existingAsset) {
      existingAsset.usages.push(usage);
      return;
    }

    assetMap.set(assetId, {
      sourceUrl: trimmedUrl,
      source: storageInfo,
      extension,
      usages: [usage],
    });
  }

  for (const siteCopyConfig of SITE_COPY_KEYS) {
    const row = (siteCopyEntries || []).find((entry) => entry.key === siteCopyConfig.key);

    if (!row) {
      continue;
    }

    const mediaEntry = parseSiteCopyMediaValue(row.value);
    addAsset(mediaEntry.src, {
      type: 'site_copy',
      key: row.key,
      targetBase: siteCopyConfig.targetPath,
      originalValue: row.value,
      label: siteCopyConfig.label,
    });
  }

  const sortedProducts = [...(products || [])].sort(compareProducts);
  const homepageProducts = uniqueList(
    ['en', 'bg']
      .flatMap((language) => sortedProducts.filter((product) => isProductVisibleInLanguage(product, language)).slice(0, 4).map((product) => product.id))
  )
    .map((productId) => sortedProducts.find((product) => product.id === productId))
    .filter(Boolean);

  for (const product of homepageProducts) {
    for (const image of resolveFeaturedProductImages(product)) {
      addAsset(image.url, {
        type: 'product',
        product,
        role: image.role,
      });
    }
  }

  const usedTargetPaths = new Set();
  const homepageAssets = [...assetMap.values()].map((asset) => {
    const basePath = chooseTargetBase(asset);
    let targetPath = `${basePath}${asset.extension}`;
    let collisionIndex = 2;

    while (usedTargetPaths.has(targetPath)) {
      targetPath = `${basePath}-${collisionIndex}${asset.extension}`;
      collisionIndex += 1;
    }

    usedTargetPaths.add(targetPath);

    return {
      ...asset,
      targetPath,
    };
  });

  return {
    homepageAssets,
    externalReferences,
    skippedReferences,
    featuredProducts: homepageProducts,
  };
}

async function downloadAsset(supabase, asset) {
  const { data, error } = await supabase.storage.from(asset.source.bucket).download(asset.source.path);

  if (error) {
    throw error;
  }

  return data;
}

async function copyAssetToHomeBucket(supabase, asset) {
  const fileBlob = await downloadAsset(supabase, asset);
  const arrayBuffer = await fileBlob.arrayBuffer();
  const contentType = fileBlob.type || undefined;
  const uploadData = new Uint8Array(arrayBuffer);
  const { error } = await supabase.storage.from(HOME_PAGE_BUCKET).upload(asset.targetPath, uploadData, {
    contentType,
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(HOME_PAGE_BUCKET).getPublicUrl(asset.targetPath);
  return data.publicUrl;
}

async function updateDatabaseReferences(supabase, assets, allSiteCopyEntries, allProducts) {
  const replacements = new Map(assets.map((asset) => [asset.sourceUrl, asset.newUrl]));
  let updatedSiteCopyCount = 0;
  let updatedProductCount = 0;

  for (const row of allSiteCopyEntries) {
    const mediaEntry = parseSiteCopyMediaValue(row.value);
    const nextUrl = replacements.get(mediaEntry.src);

    if (!nextUrl) {
      continue;
    }

    const nextValue = serializeSiteCopyMediaValue(mediaEntry, nextUrl);

    if (nextValue === row.value) {
      continue;
    }

    const { error } = await supabase.from('site_copy_entries').update({ value: nextValue }).eq('key', row.key);

    if (error) {
      throw error;
    }

    updatedSiteCopyCount += 1;
  }

  for (const product of allProducts) {
    const gallery = normalizeGallery(product.gallery);
    const nextImageMain = replacements.get(toText(product.image_main)) || toText(product.image_main);
    const nextImageDetail = replacements.get(toText(product.image_detail)) || toText(product.image_detail);
    const nextGallery = gallery.map((entry) => replacements.get(entry) || entry);
    const galleryChanged = JSON.stringify(nextGallery) !== JSON.stringify(gallery);

    if (!galleryChanged && nextImageMain === toText(product.image_main) && nextImageDetail === toText(product.image_detail)) {
      continue;
    }

    const { error } = await supabase
      .from('products')
      .update({
        image_main: nextImageMain,
        image_detail: nextImageDetail,
        gallery: nextGallery,
      })
      .eq('id', product.id);

    if (error) {
      throw error;
    }

    updatedProductCount += 1;
  }

  return { updatedSiteCopyCount, updatedProductCount };
}

async function removeOriginalAssets(supabase, assets) {
  const assetsByBucket = new Map();

  for (const asset of assets) {
    if (asset.source.bucket === HOME_PAGE_BUCKET && asset.source.path === asset.targetPath) {
      continue;
    }

    if (!assetsByBucket.has(asset.source.bucket)) {
      assetsByBucket.set(asset.source.bucket, []);
    }

    assetsByBucket.get(asset.source.bucket).push(asset.source.path);
  }

  for (const [bucket, paths] of assetsByBucket.entries()) {
    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      throw error;
    }
  }
}

async function validateMigration(supabase, projectHost) {
  const plan = await buildHomepageAssetPlan(supabase, projectHost);
  const remainingExternalStorageAssets = plan.homepageAssets.filter((asset) => asset.source.bucket !== HOME_PAGE_BUCKET);

  return {
    remainingExternalStorageAssets,
    skippedReferences: plan.skippedReferences,
    externalReferences: plan.externalReferences,
  };
}

async function main() {
  const env = await loadEnv();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  }

  const projectHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const plan = await buildHomepageAssetPlan(supabase, projectHost);
  const totalAssetBytes = plan.homepageAssets.reduce((sum, asset) => sum + Number(asset.size || 0), 0);

  for (const asset of plan.homepageAssets) {
    const { data, error } = await supabase.storage.from(asset.source.bucket).list(path.posix.dirname(asset.source.path) === '.' ? '' : path.posix.dirname(asset.source.path), {
      limit: 100,
      search: path.posix.basename(asset.source.path),
    });

    if (error) {
      throw error;
    }

    const matchedFile = (data || []).find((entry) => entry.name === path.posix.basename(asset.source.path));
    asset.size = matchedFile?.metadata?.size || 0;
  }

  const planSummary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    bucket: HOME_PAGE_BUCKET,
    assetCount: plan.homepageAssets.length,
    totalSize: formatBytes(plan.homepageAssets.reduce((sum, asset) => sum + Number(asset.size || 0), 0)),
    featuredProducts: plan.featuredProducts.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      language_visibility: product.language_visibility,
    })),
    assets: plan.homepageAssets.map((asset) => ({
      sourceBucket: asset.source.bucket,
      sourcePath: asset.source.path,
      targetBucket: HOME_PAGE_BUCKET,
      targetPath: asset.targetPath,
      size: formatBytes(asset.size || 0),
      usages: asset.usages.map(summariseUsage),
    })),
    skippedReferences: plan.skippedReferences,
    externalReferences: plan.externalReferences,
  };

  if (!EXECUTE) {
    console.log(JSON.stringify(planSummary, null, 2));
    return;
  }

  await ensureBucketExists(supabase);

  for (const asset of plan.homepageAssets) {
    asset.newUrl = await copyAssetToHomeBucket(supabase, asset);
  }

  const [{ data: siteCopyEntries, error: siteCopyError }, { data: allProducts, error: productsError }] = await Promise.all([
    supabase.from('site_copy_entries').select('key, value'),
    supabase.from('products').select('id, image_main, image_detail, gallery'),
  ]);

  if (siteCopyError) {
    throw siteCopyError;
  }

  if (productsError) {
    throw productsError;
  }

  const updateSummary = await updateDatabaseReferences(supabase, plan.homepageAssets, siteCopyEntries || [], allProducts || []);
  await removeOriginalAssets(supabase, plan.homepageAssets);
  const validation = await validateMigration(supabase, projectHost);

  console.log(JSON.stringify({
    ...planSummary,
    mode: 'executed',
    updatedSiteCopyCount: updateSummary.updatedSiteCopyCount,
    updatedProductCount: updateSummary.updatedProductCount,
    migratedAssets: plan.homepageAssets.map((asset) => ({
      from: `${asset.source.bucket}/${asset.source.path}`,
      to: `${HOME_PAGE_BUCKET}/${asset.targetPath}`,
      url: asset.newUrl,
    })),
    validation: {
      remainingExternalStorageAssets: validation.remainingExternalStorageAssets.map((asset) => ({
        sourceBucket: asset.source.bucket,
        sourcePath: asset.source.path,
      })),
      skippedReferences: validation.skippedReferences,
      externalReferences: validation.externalReferences,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});