import { NextResponse } from 'next/server';
import { createAdminClient, isAdminConfigured } from '../../../../../utils/supabase/admin';
import {
  getOrderForSession,
  syncCompletedSession,
} from '../../../../../utils/stripe/fulfillment';
import {
  getStripeClient,
  isStripeConfigured,
} from '../../../../../utils/stripe/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function buildOrderSummary(order = {}) {
  return {
    id: order?.id || null,
    orderCode: order?.order_code || '',
    status: order?.status || 'pending',
    paymentStatus: order?.payment_status || 'manual_review',
    amountPaid: Number(order?.amount_paid ?? 0),
    total: Number(order?.total ?? 0),
    paidAt: order?.paid_at || null,
  };
}

export async function POST(request) {
  if (!isAdminConfigured() || !isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe payment confirmation is not configured.' }, { status: 503 });
  }

  const payload = await request.json().catch(() => ({}));
  const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : '';
  const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';

  if (!sessionId) {
    return NextResponse.json({ error: 'A Stripe session id is required.' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionOrderId = typeof stripeSession.client_reference_id === 'string' ? stripeSession.client_reference_id : '';
    const metadataOrderId = typeof stripeSession.metadata?.order_id === 'string' ? stripeSession.metadata.order_id : '';

    if (orderId && orderId !== sessionOrderId && orderId !== metadataOrderId) {
      return NextResponse.json({ error: 'The checkout session does not belong to the requested order.' }, { status: 409 });
    }

    const supabase = createAdminClient();
    await syncCompletedSession(supabase, stripeSession);
    const { order } = await getOrderForSession(supabase, stripeSession.id);

    return NextResponse.json({
      order: buildOrderSummary(order),
      sessionStatus: stripeSession.status || '',
      paymentStatus: stripeSession.payment_status || '',
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to confirm the Stripe checkout session.' }, { status: 500 });
  }
}