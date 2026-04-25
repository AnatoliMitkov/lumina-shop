import { DEFAULT_LANGUAGE, normalizeLanguage } from './language';
import { normalizeProductCopySegment } from './product-copy';

function normalizeTaxonomyGroup(group = 'collection') {
  return group === 'category' ? 'category' : 'collection';
}

export function getTaxonomyCopyKey(group = 'collection', value = '') {
  const normalizedGroup = normalizeTaxonomyGroup(group);

  return `taxonomy.${normalizedGroup}.${normalizeProductCopySegment(value, normalizedGroup)}`;
}

export function getTaxonomyStorageKey(group = 'collection', value = '', language = DEFAULT_LANGUAGE) {
  const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
  const baseKey = getTaxonomyCopyKey(group, value);

  return normalizedLanguage === DEFAULT_LANGUAGE ? baseKey : `${normalizedLanguage}::${baseKey}`;
}

export function resolveTaxonomyLabel(siteCopy, group = 'collection', value = '') {
  const fallback = String(value || '');

  return siteCopy ? siteCopy.resolveText(getTaxonomyCopyKey(group, fallback), fallback) : fallback;
}
