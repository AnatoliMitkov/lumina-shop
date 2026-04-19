import { NextResponse } from 'next/server';
import { createAdminClient, isAdminConfigured } from '../../../../../utils/supabase/admin';
import { fetchPromotionRecords } from '../../../../../utils/promotions';
import { sendOrderPaymentConfirmation } from '../../../../../utils/order-mail';
import {
  getStripeClient,
  getStripeWebhookSecret,
  isStripeConfigured,
} from '../../../../../utils/stripe/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toAmount(value) {
  return Number((Number(value ?? 0) / 100).toFixed(2));
}

async function incrementPromotionUsage(supabase, order = {}) {
  const pricingSnapshot = order?.pricing_snapshot && typeof order.pricing_snapshot === 'object'
    ? order.pricing_snapshot
    : {};
  const discountCode = typeof order?.discount_code === 'string' ? order.discount_code.trim() : '';
  const affiliateCode = typeof order?.affiliate_code === 'string' ? order.affiliate_code.trim() : '';

  if (!discountCode && !affiliateCode) {
    return;
  }

  const promotionRecords = await fetchPromotionRecords(supabase, { discountCode, affiliateCode });
  const usageUpdates = [];

  if (promotionRecords.discountRecord?.id && Number(pricingSnapshot.discount_applied_amount ?? order?.discount_amount ?? 0) > 0) {
    usageUpdates.push(
      supabase
        .from('discount_codes')
        .update({ usage_count: Number(promotionRecords.discountRecord.usage_count ?? 0) + 1 })
        .eq('id', promotionRecords.discountRecord.id)
    );
  }

  if (promotionRecords.affiliateRecord?.id && affiliateCode) {
    usageUpdates.push(
      supabase
        .from('affiliate_codes')
        .update({ usage_count: Number(promotionRecords.affiliateRecord.usage_count ?? 0) + 1 })
        .eq('id', promotionRecords.affiliateRecord.id)
    );
  }

  if (usageUpdates.length > 0) {
    await Promise.allSettled(usageUpdates);
  }
}

async function getOrderForSession(supabase, sessionId) {
  const paymentResult = await supabase
    .from('payments')
    .select('id, order_id, status')
    .eq('provider_session_id', sessionId)
    .maybeSingle();

  if (paymentResult.error) {
    throw paymentResult.error;
  }

  const paymentRecord = paymentResult.data;

  if (!paymentRecord?.order_id) {
    return { paymentRecord: null, order: null };
  }

  const orderResult = await supabase
    .from('orders')
    .select('*')
    .eq('id', paymentRecord.order_id)
    .maybeSingle();

  if (orderResult.error) {
    throw orderResult.error;
  }

  return {
    paymentRecord,
    order: orderResult.data || null,
  };
}

async function syncCompletedSession(supabase, stripeSession) {
  const { paymentRecord, order } = await getOrderForSession(supabase, stripeSession.id);

  if (!paymentRecord || !order) {
    return;
  }

  if (String(order.payment_status || '').toLowerCase() === 'paid') {
    if (paymentRecord.status !== 'paid') {
      await supabase
        .from('payments')
        .update({
          status: 'paid',
          provider_payment_intent_id: typeof stripeSession.payment_intent === 'string' ? stripeSession.payment_intent : null,
          paid_at: order.paid_at || new Date().toISOString(),
        })
        .eq('id', paymentRecord.id);
    }

    return;
  }

  if (stripeSession.payment_status !== 'paid') {
    await supabase
      .from('payments')
      .update({
        provider_payment_intent_id: typeof stripeSession.payment_intent === 'string' ? stripeSession.payment_intent : null,
      })
      .eq('id', paymentRecord.id);
    return;
  }

  const { data: finalizedOrder, error: finalizeError } = await supabase.rpc('finalize_order_payment', {
    p_order_id: order.id,
    p_payment_provider: 'stripe',
    p_payment_reference: stripeSession.id,
    p_payment_intent_id: typeof stripeSession.payment_intent === 'string' ? stripeSession.payment_intent : '',
    p_amount_paid: toAmount(stripeSession.amount_total),
  });

  if (finalizeError) {
    throw finalizeError;
  }

  await supabase
    .from('payments')
    .update({
      status: 'paid',
      provider_payment_intent_id: typeof stripeSession.payment_intent === 'string' ? stripeSession.payment_intent : null,
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentRecord.id);

  const confirmedOrder = finalizedOrder || order;
  try {
    await incrementPromotionUsage(supabase, confirmedOrder);
  } catch {
    // Promotion counters are best-effort so payment confirmation stays authoritative.
  }

  try {
    await sendOrderPaymentConfirmation(confirmedOrder);
  } catch {
    // Payment confirmation email is best-effort so the webhook can still succeed.
  }
}

async function syncSessionState(supabase, stripeSession, nextStatus) {
  const { paymentRecord, order } = await getOrderForSession(supabase, stripeSession.id);

  if (!paymentRecord || !order || String(order.payment_status || '').toLowerCase() === 'paid') {
    return;
  }

  await supabase
    .from('payments')
    .update({
      status: nextStatus,
      provider_payment_intent_id: typeof stripeSession.payment_intent === 'string' ? stripeSession.payment_intent : null,
    })
    .eq('id', paymentRecord.id);

  await supabase
    .from('orders')
    .update({ payment_status: nextStatus })
    .eq('id', order.id);
}

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