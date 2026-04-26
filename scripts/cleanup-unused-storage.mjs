import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const LIVE_CODE_PATHS = ['app', 'components', 'utils', 'i18n.js', 'next.config.mjs'];
const STORAGE_URL_PATTERN = /https:\/\/[A-Za-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/[^\s"')>]+/g;
const JSON_MEDIA_PROPERTIES = ['src', 'primaryMedia', 'secondaryMedia'];

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
      // Fall through to line parsing.
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

function buildObjectId(storageInfo) {
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

async function collectHardcodedLiveUrls(projectHost) {
  const urls = [];

  async function walk(entryPath) {
    const absolutePath = path.join(process.cwd(), entryPath);
    const stats = await fs.stat(absolutePath);

    if (stats.isDirectory()) {
      const children = await fs.readdir(absolutePath);

      for (const child of children) {
        await walk(path.join(entryPath, child));
      }

      return;
    }

    const fileContent = await fs.readFile(absolutePath, 'utf8').catch(() => '');
    const matches = fileContent.match(STORAGE_URL_PATTERN) || [];

    for (const match of matches) {
      const storageInfo = parseStorageUrl(match, projectHost);

      if (!storageInfo) {
        continue;
      }

      urls.push(match);
    }
  }

  for (const entryPath of LIVE_CODE_PATHS) {
    const absolutePath = path.join(process.cwd(), entryPath);

    try {
      await walk(entryPath);
    } catch {
      if (await fs.stat(absolutePath).catch(() => null)) {
        throw new Error(`Unable to scan live code path: ${entryPath}`);
      }
    }
  }

  return uniqueList(urls);
}

async function collectReferencedObjectIds(supabase, projectHost) {
  const referencedObjectIds = new Set();
  const [{ data: products, error: productsError }, { data: siteCopyEntries, error: siteCopyError }, hardcodedUrls] = await Promise.all([
    supabase.from('products').select('id, slug, status, image_main, image_detail, gallery'),
    supabase.from('site_copy_entries').select('key, value'),
    collectHardcodedLiveUrls(projectHost),
  ]);

  if (productsError) {
    throw productsError;
  }

  if (siteCopyError) {
    throw siteCopyError;
  }

  function addUrl(urlValue) {
    const storageInfo = parseStorageUrl(toText(urlValue), projectHost);

    if (!storageInfo) {
      return;
    }

    referencedObjectIds.add(buildObjectId(storageInfo));
  }

  for (const product of products || []) {
    addUrl(product.image_main);
    addUrl(product.image_detail);

    for (const entry of normalizeGallery(product.gallery)) {
      addUrl(entry);
    }
  }

  for (const entry of siteCopyEntries || []) {
    const parsed = parsePossibleJsonObject(entry.value);

    if (!parsed) {
      addUrl(entry.value);
      continue;
    }

    for (const property of JSON_MEDIA_PROPERTIES) {
      addUrl(parsed[property]);
    }
  }

  for (const hardcodedUrl of hardcodedUrls) {
    addUrl(hardcodedUrl);
  }

  return {
    referencedObjectIds,
    hardcodedUrlCount: hardcodedUrls.length,
    productRowCount: (products || []).length,
    siteCopyRowCount: (siteCopyEntries || []).length,
  };
}

async function listAllBucketObjects(supabase, bucketName, prefix = '') {
  const objects = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const entry of data) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFile = entry.metadata && typeof entry.metadata.size === 'number';

      if (isFile) {
        objects.push({
          bucket: bucketName,
          path: entryPath,
          size: entry.metadata.size || 0,
          mimetype: entry.metadata.mimetype || null,
        });
        continue;
      }

      objects.push(...await listAllBucketObjects(supabase, bucketName, entryPath));
    }

    if (data.length < 100) {
      break;
    }

    offset += 100;
  }

  return objects;
}

async function inventoryStorageObjects(supabase, projectHost) {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    throw error;
  }

  const inventory = [];

  for (const bucket of buckets || []) {
    const bucketObjects = await listAllBucketObjects(supabase, bucket.name);

    for (const object of bucketObjects) {
      inventory.push({
        ...object,
        objectId: `${projectHost}|${object.bucket}|${object.path}`,
      });
    }
  }

  return inventory;
}

function summarizeObjects(objects) {
  const byBucket = {};

  for (const object of objects) {
    if (!byBucket[object.bucket]) {
      byBucket[object.bucket] = { count: 0, bytes: 0 };
    }

    byBucket[object.bucket].count += 1;
    byBucket[object.bucket].bytes += object.size || 0;
  }

  return Object.fromEntries(
    Object.entries(byBucket).map(([bucket, summary]) => [bucket, {
      count: summary.count,
      bytes: summary.bytes,
      size: formatBytes(summary.bytes),
    }])
  );
}

async function deleteUnusedObjects(supabase, unusedObjects) {
  const groupedPaths = new Map();

  for (const object of unusedObjects) {
    if (!groupedPaths.has(object.bucket)) {
      groupedPaths.set(object.bucket, []);
    }

    groupedPaths.get(object.bucket).push(object.path);
  }

  for (const [bucket, paths] of groupedPaths.entries()) {
    for (let index = 0; index < paths.length; index += 100) {
      const chunk = paths.slice(index, index + 100);
      const { error } = await supabase.storage.from(bucket).remove(chunk);

      if (error) {
        throw error;
      }
    }
  }
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

  const referenceSummary = await collectReferencedObjectIds(supabase, projectHost);
  const inventory = await inventoryStorageObjects(supabase, projectHost);
  const unusedObjects = inventory.filter((object) => !referenceSummary.referencedObjectIds.has(object.objectId));
  const usedObjects = inventory.filter((object) => referenceSummary.referencedObjectIds.has(object.objectId));
  const unusedBytes = unusedObjects.reduce((sum, object) => sum + (object.size || 0), 0);

  const summary = {
    mode: EXECUTE ? 'executed' : 'dry-run',
    totalObjects: inventory.length,
    referencedObjects: usedObjects.length,
    unusedObjects: unusedObjects.length,
    referencedSize: formatBytes(usedObjects.reduce((sum, object) => sum + (object.size || 0), 0)),
    unusedSize: formatBytes(unusedBytes),
    scannedProducts: referenceSummary.productRowCount,
    scannedSiteCopyRows: referenceSummary.siteCopyRowCount,
    hardcodedLiveUrls: referenceSummary.hardcodedUrlCount,
    unusedByBucket: summarizeObjects(unusedObjects),
    largestUnusedObjects: [...unusedObjects]
      .sort((leftObject, rightObject) => rightObject.size - leftObject.size)
      .slice(0, 25)
      .map((object) => ({
        bucket: object.bucket,
        path: object.path,
        size: formatBytes(object.size || 0),
        mimetype: object.mimetype,
      })),
  };

  if (!EXECUTE) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await deleteUnusedObjects(supabase, unusedObjects);
  const postDeleteInventory = await inventoryStorageObjects(supabase, projectHost);
  const postDeleteUnusedObjects = postDeleteInventory.filter((object) => !referenceSummary.referencedObjectIds.has(object.objectId));
  const missingReferencedObjects = [...referenceSummary.referencedObjectIds].filter((objectId) => !postDeleteInventory.some((object) => object.objectId === objectId));

  console.log(JSON.stringify({
    ...summary,
    deletedObjects: unusedObjects.length,
    deletedSize: formatBytes(unusedBytes),
    validation: {
      remainingUnusedObjects: postDeleteUnusedObjects.length,
      missingReferencedObjects,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});