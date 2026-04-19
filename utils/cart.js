export const CART_CURRENCY = 'EUR';
export const CART_SESSION_COOKIE = 'va_cart_session';
export const CART_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const CART_LOCAL_STORAGE_KEY = 'va_cart_items';

export const CART_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: CART_SESSION_COOKIE_MAX_AGE,
};

function toText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function toMeasurementValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

function toMeasurementMap(value) {
  const measurementInput = value && typeof value === 'object' ? value : {};

  return {
    bust: toMeasurementValue(measurementInput.bust),
    waist: toMeasurementValue(measurementInput.waist),
    hips: toMeasurementValue(measurementInput.hips),
    back: toMeasurementValue(measurementInput.back),
  };
}

function toPrice(value) {
  const parsedPrice = Number.parseFloat(String(value ?? 0));

  if (!Number.isFinite(parsedPrice)) {
    return 0;
  }

  return Number(parsedPrice.toFixed(2));
}

function toInteger(value, fallback = 0) {
  const parsedValue = Number.parseInt(String(value ?? fallback), 10);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return parsedValue;
}

export function createCartSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeCartItem(product = {}) {
  return {
    id: product?.id ? String(product.id) : createCartSessionId(),
    name: toText(product?.name, 'Untitled Piece'),
    price: toPrice(product?.price),
    image_main: toText(product?.image_main),
    category: toText(product?.category),
    description: toText(product?.description),
    selected_size: toText(product?.selected_size),
    selected_tone: toText(product?.selected_tone),
    selected_size_unit: toText(product?.selected_size_unit),
    custom_measurements: toMeasurementMap(product?.custom_measurements),
    inventory_count: product?.inventory_count == null ? null : Math.max(0, toInteger(product?.inventory_count, 0)),
    lead_time_days: product?.lead_time_days == null ? null : Math.max(1, toInteger(product?.lead_time_days, 14)),
  };
}

export function formatCustomMeasurementSummary(item = {}) {
  const measurements = toMeasurementMap(item?.custom_measurements);
  const summaryParts = [
    measurements.bust ? `Bust ${measurements.bust}` : '',
    measurements.waist ? `Waist ${measurements.waist}` : '',
    measurements.hips ? `Hips ${measurements.hips}` : '',
    measurements.back ? `Back ${measurements.back}` : '',
  ].filter(Boolean);

  if (summaryParts.length === 0) {
    return '';
  }

  const unitLabel = toText(item?.selected_size_unit).toUpperCase();
  return `${summaryParts.join(' · ')}${unitLabel ? ` ${unitLabel}` : ''}`;
}

export function sanitizeCartItems(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter(Boolean).map((item) => normalizeCartItem(item));
}

export function readBrowserCartItems() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(CART_LOCAL_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    return sanitizeCartItems(JSON.parse(storedValue));
  } catch {
    return [];
  }
}

export function writeBrowserCartItems(items = []) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const snapshot = buildCartSnapshot(items);
    window.localStorage.setItem(CART_LOCAL_STORAGE_KEY, JSON.stringify(snapshot.items));
  } catch {
    // Ignore storage write failures and keep the cart working in memory.
  }
}

export function buildCartSnapshot(items = []) {
  const sanitizedItems = sanitizeCartItems(items);
  const total = Number(
    sanitizedItems.reduce((runningTotal, item) => runningTotal + item.price, 0).toFixed(2)
  );

  return {
    items: sanitizedItems,
    itemCount: sanitizedItems.length,
    total,
    currency: CART_CURRENCY,
  };
}