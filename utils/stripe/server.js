import Stripe from 'stripe';

let stripeClient;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY in the environment.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function toStripeAmount(value = 0) {
  return Math.round(Number(value ?? 0) * 100);
}

export function buildAbsoluteUrl(request, path, searchParams = {}) {
  const origin = request.headers.get('origin')
    || process.env.NEXT_PUBLIC_SITE_URL
    || request.nextUrl.origin;
  const url = new URL(path, origin);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value == null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}