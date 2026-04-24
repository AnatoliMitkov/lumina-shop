export function normalizeProductCopySegment(value, fallback = 'product') {
    const normalizedValue = String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

    return normalizedValue || fallback;
}

export function getProductCopyRoot(product = {}) {
    const identifier = normalizeProductCopySegment(product.slug || product.id || product.name, 'product');

    return `product.catalog.${identifier}`;
}

export function getProductFieldCopyKey(product, field = 'copy') {
    return `${getProductCopyRoot(product)}.${field}`;
}

export function getProductOptionCopyKey(product, group = 'options', optionValue = '') {
    return `${getProductFieldCopyKey(product, group)}.${normalizeProductCopySegment(optionValue, 'option')}`;
}

export function getProductIndexedCopyKey(product, group = 'items', index = 0) {
    return `${getProductFieldCopyKey(product, group)}.${index}`;
}

export function resolveProductFieldText(siteCopy, product, field, fallback = '') {
    return siteCopy ? siteCopy.resolveText(getProductFieldCopyKey(product, field), fallback) : fallback;
}

export function resolveProductOptionText(siteCopy, product, group, optionValue = '') {
    return siteCopy ? siteCopy.resolveText(getProductOptionCopyKey(product, group, optionValue), optionValue) : optionValue;
}