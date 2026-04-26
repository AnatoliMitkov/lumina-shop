import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { createClient } from '@supabase/supabase-js';

const SOURCE_BUCKET = 'Home Page';
const TARGET_BUCKET = 'Home Page Optimized';
const DEFAULT_LANGUAGE = 'en';
const EXECUTE = process.argv.includes('--execute');
const DEFAULT_WEBP_QUALITY = 82;
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
  return toText(value, DEFAULT_LANGUAGE).toLowerCase() === 'bg' ? 'bg' : DEFAULT_LANGUAGE;
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

function buildCanonicalSourceId(storageInfo) {
  return `${storageInfo.host}|${storageInfo.bucket}|${storageInfo.path}`;
}

function chooseMaxWidth(asset) {
  if (asset.targetBase.startsWith('hero/')) {
    return 2200;
  }

  if (asset.targetBase.startsWith('brand/')) {
    return 1800;
  }

  if (asset.targetBase.startsWith('category-showcase/')) {
    return 1600;
  }

  return 1400;
}

function buildTargetPath(asset) {
  return `${asset.targetBase}.webp`;
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

function summariseUsage(usage) {
  if (usage.type === 'site_copy') {
    return usage.key;
  }

  return `product:${usage.product.slug || usage.product.id}:${usage.role}`;
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

async function listFileMetadata(supabase, bucket, filePath) {
  const directory = path.posix.dirname(filePath);
  const directoryPrefix = directory === '.' ? '' : directory;
  const fileName = path.posix.basename(filePath);
  const { data, error } = await supabase.storage.from(bucket).list(directoryPrefix, { limit: 100, search: fileName });

  if (error) {
    throw error;
  }

  return (data || []).find((entry) => entry.name === fileName) || null;
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

  function addAsset(urlValue, usage, targetBase) {
    const trimmedUrl = toText(urlValue);

    if (!trimmedUrl) {
      return;
    }

    const storageInfo = parseStorageUrl(trimmedUrl, projectHost);

    if (!storageInfo || storageInfo.bucket !== SOURCE_BUCKET) {
      return;
    }

    const assetId = buildCanonicalSourceId(storageInfo);
    const existingAsset = assetMap.get(assetId);

    if (existingAsset) {
      existingAsset.usages.push(usage);
      return;
    }

    assetMap.set(assetId, {
      sourceUrl: trimmedUrl,
      source: storageInfo,
      targetBase,
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
      originalValue: row.value,
    }, siteCopyConfig.targetPath);
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
      const productSlug = slugify(product.slug || product.name || product.id, 'featured-product');
      addAsset(image.url, {
        type: 'product',
        product,
        role: image.role,
      }, `featured-products/${productSlug}-${image.role}`);
    }
  }

  const homepageAssets = [];

  for (const asset of assetMap.values()) {
    const metadata = await listFileMetadata(supabase, asset.source.bucket, asset.source.path);
    homepageAssets.push({
      ...asset,
      originalSizeBytes: metadata?.metadata?.size || 0,
      sourceContentType: metadata?.metadata?.mimetype || null,
      targetPath: buildTargetPath(asset),
      maxWidth: chooseMaxWidth(asset),
    });
  }

  return {
    homepageAssets,
    featuredProducts: homepageProducts,
  };
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
  const nextWidth = metadata.width && metadata.width > asset.maxWidth ? asset.maxWidth : metadata.width;
  const transformedImage = nextWidth ? image.resize({ width: nextWidth, withoutEnlargement: true }) : image;
  const outputBuffer = await transformedImage.webp({ quality: DEFAULT_WEBP_QUALITY, effort: 6 }).toBuffer();

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

async function updateDatabaseReferences(supabase, assets, allSiteCopyEntries, allProducts) {
  const replacements = new Map(assets.map((asset) => [asset.sourceUrl, asset.optimizedUrl]));
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

async function validateOptimization(supabase, projectHost) {
  const plan = await buildHomepageAssetPlan(supabase, projectHost);
  return {
    remainingUnoptimizedAssets: plan.homepageAssets.filter((asset) => asset.source.bucket !== TARGET_BUCKET),
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

  if (EXECUTE) {
    await ensureBucketExists(supabase);
  }

  const plan = await buildHomepageAssetPlan(supabase, projectHost);

  for (const asset of plan.homepageAssets) {
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

  const totalOriginalSize = plan.homepageAssets.reduce((sum, asset) => sum + asset.originalSizeBytes, 0);
  const totalOptimizedSize = plan.homepageAssets.reduce((sum, asset) => sum + asset.optimizedSizeBytes, 0);
  const totalSavingsBytes = Math.max(totalOriginalSize - totalOptimizedSize, 0);
  const totalSavingsPercent = totalOriginalSize > 0 ? (totalSavingsBytes / totalOriginalSize) * 100 : 0;

  const summary = {
    mode: EXECUTE ? 'executed' : 'dry-run',
    sourceBucket: SOURCE_BUCKET,
    targetBucket: TARGET_BUCKET,
    assetCount: plan.homepageAssets.length,
    totalOriginalSize: formatBytes(totalOriginalSize),
    totalOptimizedSize: formatBytes(totalOptimizedSize),
    totalSavings: formatBytes(totalSavingsBytes),
    totalSavingsPercent: formatPercent(totalSavingsPercent),
    assets: plan.homepageAssets.map((asset) => ({
      sourcePath: asset.source.path,
      targetPath: asset.targetPath,
      originalSize: formatBytes(asset.originalSizeBytes),
      optimizedSize: formatBytes(asset.optimizedSizeBytes),
      savings: formatBytes(Math.max(asset.originalSizeBytes - asset.optimizedSizeBytes, 0)),
      savingsPercent: formatPercent(asset.optimizationRatio),
      maxWidth: asset.maxWidth,
      usages: asset.usages.map(summariseUsage),
    })),
    featuredProducts: plan.featuredProducts.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      language_visibility: product.language_visibility,
    })),
  };

  if (!EXECUTE) {
    console.log(JSON.stringify(summary, null, 2));
    return;
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
  const validation = await validateOptimization(supabase, projectHost);

  console.log(JSON.stringify({
    ...summary,
    updatedSiteCopyCount: updateSummary.updatedSiteCopyCount,
    updatedProductCount: updateSummary.updatedProductCount,
    migratedAssets: plan.homepageAssets.map((asset) => ({
      from: `${SOURCE_BUCKET}/${asset.source.path}`,
      to: `${TARGET_BUCKET}/${asset.targetPath}`,
      url: asset.optimizedUrl,
    })),
    validation: {
      remainingUnoptimizedAssets: validation.remainingUnoptimizedAssets.map((asset) => ({
        sourceBucket: asset.source.bucket,
        sourcePath: asset.source.path,
      })),
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});