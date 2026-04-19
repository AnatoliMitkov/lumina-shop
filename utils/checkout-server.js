import { buildCartSnapshot, normalizeCartItem } from './cart';
import { normalizeProductRecord } from './products';
import { normalizeCheckoutMode } from './payments';

function toText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getUniqueProductIds(items = []) {
  return [...new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => toText(item?.id))
      .filter(Boolean)
  )];
}

export async function fetchCheckoutProductRecords(supabase, items = []) {
  const productIds = getUniqueProductIds(items);

  if (productIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, status, price, image_main, category, description, inventory_count, lead_time_days')
    .in('id', productIds);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map(normalizeProductRecord) : [];
}

export function buildTrustedCartSnapshot(items = [], productRecords = []) {
  const productRecordMap = new Map(productRecords.map((product) => [String(product.id), product]));
  const trustedItems = (Array.isArray(items) ? items : []).map((item) => {
    const productId = toText(item?.id);
    const product = productRecordMap.get(productId);

    if (!product) {
      throw new Error('One or more selected pieces could not be loaded from the live catalog. Refresh the page and try again.');
    }

    if (product.status !== 'active') {
      throw new Error(`"${product.name}" is no longer available for checkout.`);
    }

    return normalizeCartItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_main: product.image_main,
      category: product.category,
      description: product.description,
      inventory_count: product.inventory_count,
      lead_time_days: product.lead_time_days,
      selected_size: item?.selected_size,
      selected_tone: item?.selected_tone,
      selected_size_unit: item?.selected_size_unit,
      custom_measurements: item?.custom_measurements,
    });
  });

  return buildCartSnapshot(trustedItems);
}

export function evaluateCheckoutMode({ requestedMode = '', shippingScope = 'worldwide', productRecords = [], total = 0 } = {}) {
  const normalizedRequestedMode = normalizeCheckoutMode(requestedMode);
  const normalizedShippingScope = shippingScope === 'domestic_bg' ? 'domestic_bg' : 'worldwide';
  const manualLaneEnabled = normalizedShippingScope === 'domestic_bg';
  const reasons = [];

  if (productRecords.some((product) => Number(product.inventory_count ?? 0) <= 0)) {
    reasons.push('One or more selected pieces are made to order and still need atelier review.');
  }

  if (productRecords.some((product) => Number(product.price ?? 0) <= 0)) {
    reasons.push('One or more selected pieces do not have a valid live price yet.');
  }

  if (Number(total ?? 0) <= 0) {
    reasons.push('The live total must be above zero before online payment can start.');
  }

  const payNowEligible = reasons.length === 0;

  return {
    availableModes: payNowEligible
      ? manualLaneEnabled
        ? ['stripe_checkout', 'manual_review']
        : ['stripe_checkout']
      : ['manual_review'],
    payNowEligible,
    reasons,
    manualLaneEnabled,
    resolvedMode: payNowEligible
      ? manualLaneEnabled && normalizedRequestedMode === 'manual_review'
        ? 'manual_review'
        : 'stripe_checkout'
      : 'manual_review',
  };
}