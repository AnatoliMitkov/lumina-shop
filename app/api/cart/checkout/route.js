import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildCartSnapshot,
  createCartSessionId,
  CART_SESSION_COOKIE,
  CART_SESSION_COOKIE_OPTIONS,
} from '../../../../utils/cart';
import { buildOrderCode, normalizeCheckoutPayload } from '../../../../utils/checkout';
import {
  buildTrustedCartSnapshot,
  evaluateCheckoutMode,
  fetchCheckoutProductRecords,
} from '../../../../utils/checkout-server';
import {
  createBaseCheckoutPricing,
  createCheckoutPricingPreview,
  fetchPromotionRecords,
  formatPromotionCurrency,
  isPromotionSetupError,
} from '../../../../utils/promotions';
import { createAdminClient, isAdminConfigured } from '../../../../utils/supabase/admin';
import { createClient as createServerClient } from '../../../../utils/supabase/server';
import {
  buildAbsoluteUrl,
  getStripeClient,
  isStripeConfigured,
  toStripeAmount,
} from '../../../../utils/stripe/server';

export const dynamic = 'force-dynamic';

function getCartSession(cookieStore) {
  const existingSession = cookieStore.get(CART_SESSION_COOKIE)?.value;

  if (existingSession) {
    return { sessionId: existingSession, shouldSetCookie: false };
  }

  return { sessionId: createCartSessionId(), shouldSetCookie: true };
}

function withCartSession(response, sessionId) {
  response.cookies.set(CART_SESSION_COOKIE, sessionId, CART_SESSION_COOKIE_OPTIONS);

  return response;
}

function buildCheckoutMessage({ mode, orderReference, shippingScope = 'worldwide', totalSavings = 0 }) {
  if (mode === 'stripe_checkout') {
    return totalSavings > 0
      ? `Order ${orderReference} is ready for secure payment. ${formatPromotionCurrency(totalSavings)} saved through live codes.`
      : `Order ${orderReference} is ready for secure payment.`;
  }

  if (shippingScope === 'domestic_bg') {
    return totalSavings > 0
      ? `Order ${orderReference} is now saved as a pay-on-delivery request. ${formatPromotionCurrency(totalSavings)} saved through live codes.`
      : `Order ${orderReference} is now saved as a pay-on-delivery request.`;
  }

  return totalSavings > 0
    ? `Order ${orderReference} is saved and waiting for confirmation. ${formatPromotionCurrency(totalSavings)} saved through live codes.`
    : `Order ${orderReference} is saved and waiting for confirmation.`;
}

function buildOrderResponse(order, { fallbackStatus = 'pending', fallbackPaymentStatus = 'manual_review', fallbackTotal = 0, fallbackItemCount = 0, fallbackCreatedAt = null } = {}) {
  return {
    id: order?.id || null,
    orderCode: order?.order_code || 'VA-PENDING',
    status: order?.status || fallbackStatus,
    paymentStatus: order?.payment_status || fallbackPaymentStatus,
    total: Number(order?.total ?? fallbackTotal),
    itemCount: Number(order?.item_count ?? fallbackItemCount),
    createdAt: order?.created_at ?? fallbackCreatedAt,
  };
}

function buildStripeLineItems(snapshot = {}) {
  return (Array.isArray(snapshot.items) ? snapshot.items : []).map((item) => {
    const descriptionParts = [item?.selected_size ? `Size ${item.selected_size}` : '', item?.selected_tone ? `Tone ${item.selected_tone}` : ''].filter(Boolean);

    return {
      quantity: 1,
      price_data: {
        currency: String(snapshot.currency || 'EUR').toLowerCase(),
        unit_amount: toStripeAmount(item?.price),
        product_data: {
          name: item?.name || 'Atelier Piece',
          ...(descriptionParts.length > 0 ? { description: descriptionParts.join(' / ') } : {}),
          ...(item?.image_main ? { images: [item.image_main] } : {}),
        },
      },
    };
  });
}

function formatCheckoutError(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  const normalizedMessage = message.toLowerCase();

  if (
    error?.code === '23505'
    && (
      normalizedMessage.includes('orders_order_code_uidx')
      || normalizedMessage.includes('order_code')
    )
  ) {
    return 'A duplicate order reference was generated. Submit the order again.';
  }

  if (
    error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || normalizedMessage.includes('shipping_scope')
    || normalizedMessage.includes('checkout_mode')
    || normalizedMessage.includes('payment_status')
    || normalizedMessage.includes('payments')
    || normalizedMessage.includes('customer_snapshot')
    || (
      normalizedMessage.includes('column')
      && normalizedMessage.includes('order_code')
    )
  ) {
    return 'The checkout order schema is not ready yet. Run supabase/cart-orders.sql before submitting structured orders.';
  }

  if (normalizedMessage.includes('discount') || normalizedMessage.includes('affiliate')) {
    return 'Promotion pricing is not ready yet. Run supabase/cart-orders.sql before applying live codes.';
  }

  return error?.message || 'Unable to submit the order right now.';
}

export async function POST(request) {
  const cookieStore = await cookies();
  const { sessionId } = getCartSession(cookieStore);

  if (!isAdminConfigured()) {
    const response = NextResponse.json(
      {
        error: 'Selection archiving is not active yet.',
      },
      { status: 503 }
    );

    return withCartSession(response, sessionId);
  }

  try {
    const payload = await request.json();
    const requestedSnapshot = buildCartSnapshot(payload?.items);
    const checkout = normalizeCheckoutPayload(payload?.checkout);
    const authClient = createServerClient(cookieStore);
    const { data: { user } } = await authClient.auth.getUser();

    if (requestedSnapshot.itemCount === 0) {
      const response = NextResponse.json(
        {
          error: 'Add at least one piece before checking out.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId);
    }

    if (!checkout.customer.fullName || !checkout.customer.email || !checkout.customer.phone) {
      const response = NextResponse.json(
        {
          error: 'Please provide the customer name, email, and phone number before submitting the order.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId);
    }

    if (!checkout.delivery.shippingCountry || !checkout.delivery.shippingCity) {
      const response = NextResponse.json(
        {
          error: 'Please provide the delivery country and city before submitting the order.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId);
    }

    if (
      checkout.delivery.deliveryMethod.endsWith('_office')
      && !checkout.delivery.shippingOfficeLabel
    ) {
      const response = NextResponse.json(
        {
          error: 'Please provide the pickup office before submitting the order.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId);
    }

    if (
      (checkout.delivery.deliveryMethod.endsWith('_address') || checkout.delivery.shippingScope === 'worldwide')
      && !checkout.delivery.shippingAddressLine1
    ) {
      const response = NextResponse.json(
        {
          error: 'Please provide the delivery address before submitting the order.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId);
    }

    const supabase = createAdminClient();
    const productRecords = await fetchCheckoutProductRecords(supabase, payload?.items);
    const snapshot = buildTrustedCartSnapshot(payload?.items, productRecords);
    let discountRecord = null;
    let affiliateRecord = null;
    const createdAt = new Date().toISOString();
    const orderCode = buildOrderCode(`${sessionId}-${createdAt}`);
    const orderSubtotal = snapshot.total;
    const shippingInput = {
      shippingScope: checkout.delivery.shippingScope,
      deliveryMethod: checkout.delivery.deliveryMethod,
      shippingCountry: checkout.delivery.shippingCountry,
      shippingCity: checkout.delivery.shippingCity,
      shippingAddressLine1: checkout.delivery.shippingAddressLine1,
      shippingOfficeLabel: checkout.delivery.shippingOfficeLabel,
      shippingOfficeCode: checkout.delivery.shippingOfficeCode,
    };
    let pricing = createBaseCheckoutPricing({ subtotal: orderSubtotal, shippingInput });

    try {
      const promotionRecords = await fetchPromotionRecords(supabase, {
        discountCode: checkout.pricing.discountCode,
        affiliateCode: checkout.pricing.affiliateCode,
      });

      discountRecord = promotionRecords.discountRecord;
      affiliateRecord = promotionRecords.affiliateRecord;
      pricing = createCheckoutPricingPreview({
        subtotal: orderSubtotal,
        shippingInput,
        discountCode: checkout.pricing.discountCode,
        affiliateCode: checkout.pricing.affiliateCode,
        discountRecord,
        affiliateRecord,
      });
    } catch (error) {
      if ((checkout.pricing.discountCode || checkout.pricing.affiliateCode) && isPromotionSetupError(error)) {
        const response = NextResponse.json(
          {
            error: 'Promotion tables are not ready yet. Run supabase/cart-orders.sql before applying live codes.',
          },
          { status: 503 }
        );

        return withCartSession(response, sessionId);
      }

      if (!isPromotionSetupError(error)) {
        throw error;
      }
    }

    if (checkout.pricing.discountCode && pricing.discount.status === 'invalid') {
      const response = NextResponse.json(
        {
          error: pricing.discount.message || 'The discount code could not be applied.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId);
    }

    if (checkout.pricing.affiliateCode && pricing.affiliate.status === 'invalid') {
      const response = NextResponse.json(
        {
          error: pricing.affiliate.message || 'The affiliate code could not be applied.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId);
    }

    const orderTotal = pricing.total;
    const requestedMode = checkout.payment.checkoutMode;
    const paymentDecision = evaluateCheckoutMode({
      requestedMode,
      shippingScope: checkout.delivery.shippingScope,
      productRecords,
      total: orderTotal,
    });
    const requiresOnlinePayment = checkout.delivery.shippingScope === 'worldwide';

    if (!paymentDecision.payNowEligible) {
      const response = NextResponse.json(
        {
          error: paymentDecision.reasons.join(' ') || 'This order is not eligible for checkout right now.',
        },
        { status: 409 }
      );

      return withCartSession(response, sessionId);
    }

    if (requiresOnlinePayment && !isStripeConfigured()) {
      const response = NextResponse.json(
        {
          error: 'Secure online payment is not configured in this environment yet.',
        },
        { status: 503 }
      );

      return withCartSession(response, sessionId);
    }

    if (requestedMode === 'stripe_checkout' && !isStripeConfigured()) {
      const response = NextResponse.json(
        {
          error: 'Secure online payment is not configured in this environment yet.',
        },
        { status: 503 }
      );

      return withCartSession(response, sessionId);
    }

    const resolvedMode = paymentDecision.resolvedMode;
    const orderStatus = 'pending';
    const paymentStatus = resolvedMode === 'stripe_checkout' ? 'awaiting_payment' : 'manual_review';
    const { data: cartRecord, error: cartError } = await supabase
      .from('carts')
      .upsert(
        {
          session_id: sessionId,
          user_id: user?.id ?? null,
          status: resolvedMode === 'stripe_checkout' ? 'active' : 'checked_out',
          currency: snapshot.currency,
          item_count: snapshot.itemCount,
          total: snapshot.total,
          items: snapshot.items,
          checked_out_at: resolvedMode === 'stripe_checkout' ? null : createdAt,
        },
        { onConflict: 'session_id' }
      )
      .select('id')
      .single();

    if (cartError) {
      throw cartError;
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        cart_id: cartRecord.id,
        session_id: sessionId,
        user_id: user?.id ?? null,
        order_code: orderCode,
        customer_email: checkout.customer.email || user?.email || null,
        customer_name: checkout.customer.fullName,
        customer_phone: checkout.customer.phone,
        customer_location: checkout.customer.location,
        customer_notes: checkout.customer.notes,
        status: orderStatus,
        currency: snapshot.currency,
        item_count: snapshot.itemCount,
        subtotal: orderSubtotal,
        discount_amount: pricing.discountAmount,
        shipping_amount: pricing.shippingAmount,
        total: orderTotal,
        discount_code: checkout.pricing.discountCode || null,
        affiliate_code: checkout.pricing.affiliateCode || null,
        affiliate_commission_type: pricing.affiliate.commissionType || null,
        affiliate_commission_value: pricing.affiliate.commissionValue,
        shipping_scope: checkout.delivery.shippingScope,
        delivery_method: checkout.delivery.deliveryMethod,
        checkout_mode: resolvedMode,
        payment_status: paymentStatus,
        payment_provider: resolvedMode === 'stripe_checkout' ? 'stripe' : null,
        amount_paid: 0,
        shipping_country: checkout.delivery.shippingCountry,
        shipping_city: checkout.delivery.shippingCity,
        shipping_region: checkout.delivery.shippingRegion,
        shipping_postal_code: checkout.delivery.shippingPostalCode,
        shipping_address_line1: checkout.delivery.shippingAddressLine1,
        shipping_address_line2: checkout.delivery.shippingAddressLine2,
        shipping_office_code: checkout.delivery.shippingOfficeCode,
        shipping_office_label: checkout.delivery.shippingOfficeLabel,
        items: snapshot.items,
        customer_snapshot: {
          full_name: checkout.customer.fullName,
          email: checkout.customer.email || user?.email || null,
          phone: checkout.customer.phone,
          location: checkout.customer.location,
          notes: checkout.customer.notes,
          user_id: user?.id ?? null,
        },
        delivery_snapshot: {
          shipping_scope: checkout.delivery.shippingScope,
          delivery_method: checkout.delivery.deliveryMethod,
          shipping_country: checkout.delivery.shippingCountry,
          shipping_city: checkout.delivery.shippingCity,
          shipping_region: checkout.delivery.shippingRegion,
          shipping_postal_code: checkout.delivery.shippingPostalCode,
          shipping_address_line1: checkout.delivery.shippingAddressLine1,
          shipping_address_line2: checkout.delivery.shippingAddressLine2,
          shipping_office_code: checkout.delivery.shippingOfficeCode,
          shipping_office_label: checkout.delivery.shippingOfficeLabel,
          shipping_map_url: checkout.delivery.shippingMapUrl || null,
        },
        pricing_snapshot: {
          subtotal: orderSubtotal,
          discount_amount: pricing.discountAmount,
          shipping_amount: pricing.shippingAmount,
          total: orderTotal,
          total_savings: pricing.totalSavings,
          shipping_status: pricing.shipping.status,
          shipping_label: pricing.shipping.label,
          shipping_message: pricing.shipping.message,
          shipping_payer: pricing.shipping.payer,
          shipping_source: pricing.shipping.source,
          discount_code: checkout.pricing.discountCode || null,
          discount_label: pricing.discount.label || null,
          discount_type: pricing.discount.type || null,
          discount_value: pricing.discount.value,
          discount_applied_amount: pricing.discount.appliedAmount,
          discount_shipping_benefit: pricing.discount.shippingBenefit || null,
          affiliate_code: checkout.pricing.affiliateCode || null,
          affiliate_partner_name: pricing.affiliate.partnerName || null,
          affiliate_customer_discount_type: pricing.affiliate.customerDiscountType || null,
          affiliate_customer_discount_value: pricing.affiliate.customerDiscountValue,
          affiliate_customer_discount_amount: pricing.affiliate.customerDiscountAmount,
          affiliate_commission_type: pricing.affiliate.commissionType || null,
          affiliate_commission_value: pricing.affiliate.commissionValue,
          affiliate_commission_amount: pricing.affiliate.commissionAmount,
        },
      })
      .select('id, order_code, status, payment_status, total, item_count, created_at')
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderReference = order.order_code || orderCode;

    if (resolvedMode === 'stripe_checkout') {
      const stripe = getStripeClient();
      const stripeSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        locale: 'auto',
        payment_method_types: ['card'],
        customer_email: checkout.customer.email || user?.email || undefined,
        client_reference_id: order.id,
        line_items: buildStripeLineItems(snapshot),
        success_url: buildAbsoluteUrl(request, '/checkout/success', {
          order: order.id,
          orderCode: orderReference,
          session_id: '{CHECKOUT_SESSION_ID}',
        }),
        cancel_url: buildAbsoluteUrl(request, '/checkout/cancel', {
          order: order.id,
          orderCode: orderReference,
        }),
        metadata: {
          order_id: order.id,
          order_code: orderReference,
          shipping_scope: checkout.delivery.shippingScope,
          delivery_method: checkout.delivery.deliveryMethod,
          customer_email: checkout.customer.email || user?.email || '',
        },
      });

      const { error: paymentInsertError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          provider: 'stripe',
          mode: 'full',
          status: 'pending',
          currency: snapshot.currency,
          amount: orderTotal,
          provider_session_id: stripeSession.id,
          provider_payment_intent_id: typeof stripeSession.payment_intent === 'string' ? stripeSession.payment_intent : null,
        });

      if (paymentInsertError) {
        throw paymentInsertError;
      }

      const { error: orderPaymentError } = await supabase
        .from('orders')
        .update({
          payment_reference: stripeSession.id,
          payment_provider: 'stripe',
          payment_intent_id: typeof stripeSession.payment_intent === 'string' ? stripeSession.payment_intent : null,
        })
        .eq('id', order.id);

      if (orderPaymentError) {
        throw orderPaymentError;
      }

      const response = NextResponse.json({
        order: buildOrderResponse(order, {
          fallbackStatus: orderStatus,
          fallbackPaymentStatus: paymentStatus,
          fallbackTotal: orderTotal,
          fallbackItemCount: snapshot.itemCount,
          fallbackCreatedAt: createdAt,
        }),
        mode: resolvedMode,
        redirectUrl: stripeSession.url,
        message: buildCheckoutMessage({
          mode: resolvedMode,
          orderReference,
          shippingScope: checkout.delivery.shippingScope,
          totalSavings: pricing.totalSavings,
        }),
      });

      return withCartSession(response, sessionId);
    }

    const usageUpdates = [];

    if (discountRecord?.id && pricing.discount.status === 'applied') {
      usageUpdates.push(
        supabase
          .from('discount_codes')
          .update({ usage_count: Number(discountRecord.usage_count ?? 0) + 1 })
          .eq('id', discountRecord.id)
      );
    }

    if (affiliateRecord?.id && ['applied', 'tracked'].includes(pricing.affiliate.status)) {
      usageUpdates.push(
        supabase
          .from('affiliate_codes')
          .update({ usage_count: Number(affiliateRecord.usage_count ?? 0) + 1 })
          .eq('id', affiliateRecord.id)
      );
    }

    if (usageUpdates.length > 0) {
      await Promise.allSettled(usageUpdates);
    }

    const response = NextResponse.json({
      order: buildOrderResponse(order, {
        fallbackStatus: orderStatus,
        fallbackPaymentStatus: paymentStatus,
        fallbackTotal: orderTotal,
        fallbackItemCount: snapshot.itemCount,
        fallbackCreatedAt: createdAt,
      }),
      mode: resolvedMode,
      message: buildCheckoutMessage({
        mode: resolvedMode,
        orderReference,
        shippingScope: checkout.delivery.shippingScope,
        totalSavings: pricing.totalSavings,
      }),
    });

    return withCartSession(response, createCartSessionId());
  } catch (error) {
    const response = NextResponse.json(
      {
        error: formatCheckoutError(error),
      },
      { status: 503 }
    );

    return withCartSession(response, sessionId);
  }
}