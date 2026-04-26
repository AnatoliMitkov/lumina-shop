import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { createClient } from '@supabase/supabase-js';

const SOURCE_BUCKET = 'product-media';
const TARGET_BUCKET = 'Storefront Optimized';
const EXECUTE = process.argv.includes('--execute');
const DEFAULT_LANGUAGE = 'en';
const IMAGE_CONTENT_TYPE_PREFIX = 'image/';
const WEBP_QUALITY = 82;

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
  const envText = await fs.readFile(path.join(process.cwd(), '.env.local'), 'utf8');
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

function uniqueList(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function slugify(value, fallback = 'asset') {
  const normalizedValue = toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedValue || fallback;
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

function parseSiteCopyValue(value) {
  const parsedObject = parsePossibleJsonObject(value);

  if (parsedObject) {
    return {
      kind: 'json',
      parsed: parsedObject,
    };
  }

  return {
    kind: 'text',
    parsed: null,
  };
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
      host: parsedUrl.host,
      bucket: relativePath.slice(0, firstSlashIndex),
      path: relativePath.slice(firstSlashIndex + 1),
    };
  } catch {
    return null;
  }
}

function buildAssetId(storageInfo) {
  return `${storageInfo.host}|${storageInfo.bucket}|${storageInfo.path}`;
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

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function isImageContentType(contentType) {
  return toText(contentType).toLowerCase().startsWith(IMAGE_CONTENT_TYPE_PREFIX);
}

function buildProductSlug(product) {
  const directSlug = slugify(product.slug, '');

  if (directSlug) {
    return directSlug;
  }

  const nameSlug = slugify(product.name, '');

  if (nameSlug) {
    return nameSlug;
  }

  return slugify(product.id, 'product');
}

function summariseUsage(usage) {
  if (usage.type === 'product') {
    const suffix = usage.field === 'gallery' ? `gallery-${usage.index + 1}` : usage.field;
    return `product:${usage.product.slug || usage.product.id}:${suffix}`;
  }

  if (usage.type === 'site_copy') {
    return `site_copy:${usage.key}:${usage.property}`;
  }

  return usage.type;
}

function scoreUsage(usage) {
  if (usage.type === 'product') {
    if (usage.field === 'image_main') {
      return 0;
    }

    if (usage.field === 'image_detail') {
      return 1;
    }

    return 2 + usage.index;
  }

  return 100;
}

function buildTargetBase(asset) {
  const sortedUsages = [...asset.usages].sort((leftUsage, rightUsage) => scoreUsage(leftUsage) - scoreUsage(rightUsage));
  const preferredProductUsage = sortedUsages.find((usage) => usage.type === 'product' && buildProductSlug(usage.product));

  if (preferredProductUsage) {
    const productSlug = buildProductSlug(preferredProductUsage.product);

    if (preferredProductUsage.field === 'gallery') {
      return `products/${productSlug}/gallery-${preferredProductUsage.index + 1}`;
    }

    return `products/${productSlug}/${preferredProductUsage.field === 'image_main' ? 'main' : 'detail'}`;
  }

  const preferredSiteCopyUsage = sortedUsages.find((usage) => usage.type === 'site_copy');

  if (preferredSiteCopyUsage) {
    const suffix = preferredSiteCopyUsage.property === 'src' ? '' : `-${slugify(preferredSiteCopyUsage.property, 'media')}`;
    return `site-copy/${slugify(preferredSiteCopyUsage.key, 'entry')}${suffix}`;
  }

  return `assets/${slugify(path.posix.basename(asset.source.path, path.posix.extname(asset.source.path)), 'asset')}`;
}

function chooseMaxEdge(asset) {
  const siteCopyUsage = asset.usages.find((usage) => usage.type === 'site_copy');

  if (siteCopyUsage) {
    const key = `${siteCopyUsage.key}:${siteCopyUsage.property}`.toLowerCase();

    if (key.includes('hero') || key.includes('brand') || key.includes('spotlight') || key.includes('runway') || key.includes('collection-media')) {
      return 2200;
    }

    return 1800;
  }

  return 2000;
}

function serializeSiteCopyValue(siteCopyRow, replacements) {
  const parsed = parseSiteCopyValue(siteCopyRow.value);

  if (parsed.kind === 'text') {
    const nextValue = replacements.get(siteCopyRow.value);
    return nextValue || siteCopyRow.value;
  }

  const nextObject = { ...parsed.parsed };
  let hasChanged = false;

  for (const property of ['src', 'primaryMedia', 'secondaryMedia']) {
    const currentValue = toText(parsed.parsed[property]);
    const nextValue = replacements.get(currentValue);

    if (nextValue && nextValue !== currentValue) {
      nextObject[property] = nextValue;
      hasChanged = true;
    }
  }

  return hasChanged ? JSON.stringify(nextObject) : siteCopyRow.value;
}

async function ensureBucketExists(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    throw error;
  }

  const existingBucket = (buckets || []).find((bucket) => bucket.name === TARGET_BUCKET || bucket.id === TARGET_BUCKET);

  if (existingBucket) {
    return existingBucket;
  }

  if (!EXECUTE) {
    return null;
  }

  const { data, error: createError } = await supabase.storage.createBucket(TARGET_BUCKET, { public: true });

  if (createError) {
    throw createError;
  }

  return data;
}

async function readStorageMetadata(supabase, bucket, filePath) {
  const directory = path.posix.dirname(filePath);
  const prefix = directory === '.' ? '' : directory;
  const fileName = path.posix.basename(filePath);
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, search: fileName });

  if (error) {
    throw error;
  }

  return (data || []).find((entry) => entry.name === fileName) || null;
}

async function collectReferencedAssets(supabase, projectHost) {
  const [{ data: activeProducts, error: activeProductsError }, { data: siteCopyEntries, error: siteCopyError }] = await Promise.all([
    supabase
      .from('products')
      .select('id, slug, name, collection, featured, sort_order, status, language_visibility, image_main, image_detail, gallery')
      .eq('status', 'active'),
    supabase.from('site_copy_entries').select('key, value'),
  ]);

  if (activeProductsError) {
    throw activeProductsError;
  }

  if (siteCopyError) {
    throw siteCopyError;
  }

  const assets = new Map();

  function addAsset(urlValue, usage) {
    const trimmedUrl = toText(urlValue);

    if (!trimmedUrl) {
      return;
    }

    const storageInfo = parseStorageUrl(trimmedUrl, projectHost);

    if (!storageInfo || storageInfo.bucket !== SOURCE_BUCKET) {
      return;
    }

    const assetId = buildAssetId(storageInfo);

    if (!assets.has(assetId)) {
      assets.set(assetId, {
        sourceUrl: trimmedUrl,
        source: storageInfo,
        usages: [],
      });
    }

    assets.get(assetId).usages.push(usage);
  }

  const sortedProducts = [...(activeProducts || [])].sort(compareProducts);
  const storefrontProducts = uniqueList(
    ['en', 'bg']
      .flatMap((language) => sortedProducts.filter((product) => isProductVisibleInLanguage(product, language)).map((product) => product.id))
  )
    .map((productId) => sortedProducts.find((product) => product.id === productId))
    .filter(Boolean);

  for (const product of storefrontProducts) {
    addAsset(product.image_main, { type: 'product', product, field: 'image_main', index: 0 });
    addAsset(product.image_detail, { type: 'product', product, field: 'image_detail', index: 0 });

    normalizeGallery(product.gallery).forEach((urlValue, index) => {
      addAsset(urlValue, { type: 'product', product, field: 'gallery', index });
    });
  }

  for (const entry of siteCopyEntries || []) {
    const parsed = parseSiteCopyValue(entry.value);

    if (parsed.kind === 'text') {
      addAsset(entry.value, { type: 'site_copy', key: entry.key, property: 'text' });
      continue;
    }

    for (const property of ['src', 'primaryMedia', 'secondaryMedia']) {
      addAsset(parsed.parsed[property], { type: 'site_copy', key: entry.key, property });
    }
  }

  const collectedAssets = [];

  for (const asset of assets.values()) {
    const metadata = await readStorageMetadata(supabase, asset.source.bucket, asset.source.path);
    const contentType = metadata?.metadata?.mimetype || null;

    if (!isImageContentType(contentType)) {
      continue;
    }

    const targetBase = buildTargetBase(asset);
    collectedAssets.push({
      ...asset,
      contentType,
      originalSizeBytes: metadata?.metadata?.size || 0,
      maxEdge: chooseMaxEdge(asset),
      targetBase,
    });
  }

  const usedTargetPaths = new Set();

  for (const asset of collectedAssets) {
    let targetPath = `${asset.targetBase}.webp`;
    let collisionIndex = 2;

    while (usedTargetPaths.has(targetPath)) {
      targetPath = `${asset.targetBase}-${collisionIndex}.webp`;
      collisionIndex += 1;
    }

    usedTargetPaths.add(targetPath);
    asset.targetPath = targetPath;
  }

  return collectedAssets;
}

async function downloadAssetBuffer(supabase, asset) {
  const { data, error } = await supabase.storage.from(asset.source.bucket).download(asset.source.path);

  if (error) {
    throw error;
  }

  return Buffer.from(await data.arrayBuffer());
}

async function normalizeInputBuffer(asset, inputBuffer) {
  const extension = path.posix.extname(asset.source.path).toLowerCase();

  if (!['.heic', '.heif'].includes(extension)) {
    return inputBuffer;
  }

  try {
    return await sharp(inputBuffer).rotate().toBuffer();
  } catch {
    const jpegBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.92 });
    return Buffer.from(jpegBuffer);
  }
}

async function optimizeAssetBuffer(asset, inputBuffer) {
  const normalizedInput = await normalizeInputBuffer(asset, inputBuffer);
  const image = sharp(normalizedInput, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const outputBuffer = await image
    .resize({
      width: asset.maxEdge,
      height: asset.maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toBuffer();

  return {
    outputBuffer,
    metadata,
  };
}

async function uploadOptimizedAsset(supabase, asset, outputBuffer) {
  const { error } = await supabase.storage.from(TARGET_BUCKET).upload(asset.targetPath, outputBuffer, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(TARGET_BUCKET).getPublicUrl(asset.targetPath);
  return data.publicUrl;
}

async function updateReferences(supabase, assets) {
  const replacements = new Map(assets.map((asset) => [asset.sourceUrl, asset.optimizedUrl]));
  const [{ data: allProducts, error: productsError }, { data: siteCopyEntries, error: siteCopyError }] = await Promise.all([
    supabase.from('products').select('id, image_main, image_detail, gallery'),
    supabase.from('site_copy_entries').select('key, value'),
  ]);

  if (productsError) {
    throw productsError;
  }

  if (siteCopyError) {
    throw siteCopyError;
  }

  let updatedProductCount = 0;
  let updatedSiteCopyCount = 0;

  for (const product of allProducts || []) {
    const originalGallery = normalizeGallery(product.gallery);
    const nextImageMain = replacements.get(toText(product.image_main)) || toText(product.image_main);
    const nextImageDetail = replacements.get(toText(product.image_detail)) || toText(product.image_detail);
    const nextGallery = originalGallery.map((entry) => replacements.get(entry) || entry);
    const galleryChanged = JSON.stringify(nextGallery) !== JSON.stringify(originalGallery);

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

  for (const siteCopyRow of siteCopyEntries || []) {
    const nextValue = serializeSiteCopyValue(siteCopyRow, replacements);

    if (nextValue === siteCopyRow.value) {
      continue;
    }

    const { error } = await supabase.from('site_copy_entries').update({ value: nextValue }).eq('key', siteCopyRow.key);

    if (error) {
      throw error;
    }

    updatedSiteCopyCount += 1;
  }

  return { updatedProductCount, updatedSiteCopyCount };
}

async function validateCoverage(supabase, projectHost) {
  const remainingAssets = await collectReferencedAssets(supabase, projectHost);
  return remainingAssets;
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

  if (EXECUTE) {
    await ensureBucketExists(supabase);
  }

  const assets = await collectReferencedAssets(supabase, projectHost);

  for (const asset of assets) {
    const inputBuffer = await downloadAssetBuffer(supabase, asset);
    const { outputBuffer, metadata } = await optimizeAssetBuffer(asset, inputBuffer);
    asset.optimizedSizeBytes = outputBuffer.byteLength;
    asset.optimizationRatio = asset.originalSizeBytes > 0 ? ((asset.originalSizeBytes - asset.optimizedSizeBytes) / asset.originalSizeBytes) * 100 : 0;
    asset.pixelSize = {
      width: metadata.width || null,
      height: metadata.height || null,
    };

    if (EXECUTE) {
      asset.optimizedUrl = await uploadOptimizedAsset(supabase, asset, outputBuffer);
    }
  }

  const totalOriginalSize = assets.reduce((sum, asset) => sum + asset.originalSizeBytes, 0);
  const totalOptimizedSize = assets.reduce((sum, asset) => sum + asset.optimizedSizeBytes, 0);
  const totalSavingsBytes = Math.max(totalOriginalSize - totalOptimizedSize, 0);
  const totalSavingsPercent = totalOriginalSize > 0 ? (totalSavingsBytes / totalOriginalSize) * 100 : 0;

  const summary = {
    mode: EXECUTE ? 'executed' : 'dry-run',
    sourceBucket: SOURCE_BUCKET,
    targetBucket: TARGET_BUCKET,
    assetCount: assets.length,
    totalOriginalSize: formatBytes(totalOriginalSize),
    totalOptimizedSize: formatBytes(totalOptimizedSize),
    totalSavings: formatBytes(totalSavingsBytes),
    totalSavingsPercent: formatPercent(totalSavingsPercent),
    assets: assets
      .sort((leftAsset, rightAsset) => rightAsset.originalSizeBytes - leftAsset.originalSizeBytes)
      .map((asset) => ({
        sourcePath: asset.source.path,
        targetPath: asset.targetPath,
        originalSize: formatBytes(asset.originalSizeBytes),
        optimizedSize: formatBytes(asset.optimizedSizeBytes),
        savings: formatBytes(Math.max(asset.originalSizeBytes - asset.optimizedSizeBytes, 0)),
        savingsPercent: formatPercent(asset.optimizationRatio),
        maxEdge: asset.maxEdge,
        usages: asset.usages.map(summariseUsage),
      })),
  };

  if (!EXECUTE) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const updateSummary = await updateReferences(supabase, assets);
  const validation = await validateCoverage(supabase, projectHost);

  console.log(JSON.stringify({
    ...summary,
    updatedProductCount: updateSummary.updatedProductCount,
    updatedSiteCopyCount: updateSummary.updatedSiteCopyCount,
    migratedAssets: assets.map((asset) => ({
      from: `${SOURCE_BUCKET}/${asset.source.path}`,
      to: `${TARGET_BUCKET}/${asset.targetPath}`,
      url: asset.optimizedUrl,
    })),
    validation: {
      remainingSourceBucketAssets: validation.map((asset) => ({
        path: asset.source.path,
        refs: asset.usages.map(summariseUsage),
      })),
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});