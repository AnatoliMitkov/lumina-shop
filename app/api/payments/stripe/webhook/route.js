import { NextResponse } from 'next/server';
import { createAdminClient, isAdminConfigured } from '../../../../../utils/supabase/admin';
import {
  syncCompletedSession,
  syncSessionState,
} from '../../../../../utils/stripe/fulfillment';
import {
  getStripeClient,
  getStripeWebhookSecret,
  isStripeConfigured,
} from '../../../../../utils/stripe/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  if (!isAdminConfigured() || !isStripeConfigured() || !getStripeWebhookSecret()) {
    return NextResponse.json({ error: 'Stripe webhook handling is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripeClient();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to verify the Stripe webhook.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await syncCompletedSession(supabase, event.data.object);
        break;
      case 'checkout.session.async_payment_failed':
        await syncSessionState(supabase, event.data.object, 'failed');
        break;
      case 'checkout.session.expired':
        await syncSessionState(supabase, event.data.object, 'expired');
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to process the Stripe webhook.' }, { status: 500 });
  }
}