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

function toPrice(value) {
  const parsedPrice = Number.parseFloat(String(value ?? 0));

  if (!Number.isFinite(parsedPrice)) {
    return 0;
  }

  return Number(parsedPrice.toFixed(2));
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
  };
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