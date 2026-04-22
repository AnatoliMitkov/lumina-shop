const COLLECTION_MEDIA_KEY_PREFIX = 'fifth-avenue.collection-media.';

function toText(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value == null) {
    return fallback;
  }

  return String(value).trim() || fallback;
}

export function slugifyCollectionName(value = '') {
  const normalized = toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return normalized || 'collection';
}

export function buildCollectionMediaKey(collectionName = '') {
  return `${COLLECTION_MEDIA_KEY_PREFIX}${slugifyCollectionName(collectionName)}`;
}

export function parseCollectionMediaValue(value, fallbackCollectionName = '') {
  const fallback = {
    collection: toText(fallbackCollectionName),
    primaryMedia: '',
    secondaryMedia: '',
  };

  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }

    return {
      collection: toText(parsed.collection, fallback.collection),
      primaryMedia: toText(parsed.primaryMedia),
      secondaryMedia: toText(parsed.secondaryMedia),
    };
  } catch {
    return fallback;
  }
}

function normalizeCollectionFromKey(key = '') {
  return toText(key)
    .replace(COLLECTION_MEDIA_KEY_PREFIX, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toCollectionMediaMap(rows = []) {
  const map = {};

  rows.forEach((row) => {
    const key = toText(row?.key);

    if (!key.startsWith(COLLECTION_MEDIA_KEY_PREFIX)) {
      return;
    }

    const fallbackCollectionName = normalizeCollectionFromKey(key);
    const parsed = parseCollectionMediaValue(row?.value, fallbackCollectionName);
    const collectionName = toText(parsed.collection, fallbackCollectionName);

    if (!collectionName) {
      return;
    }

    map[collectionName] = {
      primaryMedia: parsed.primaryMedia,
      secondaryMedia: parsed.secondaryMedia,
    };
  });

  return map;
}

export function getCollectionMediaKeyPrefix() {
  return COLLECTION_MEDIA_KEY_PREFIX;
}
