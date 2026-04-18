import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildCartSnapshot,
  createCartSessionId,
  CART_SESSION_COOKIE,
  CART_SESSION_COOKIE_OPTIONS,
} from '../../../../utils/cart';
import { buildOrderCode, normalizeCheckoutPayload } from '../../../../utils/checkout';
import { createAdminClient, isAdminConfigured } from '../../../../utils/supabase/admin';
import { createClient as createServerClient } from '../../../../utils/supabase/server';

export const dynamic = 'force-dynamic';

function getCartSession(cookieStore) {
  const existingSession = cookieStore.get(CART_SESSION_COOKIE)?.value;

  if (existingSession) {
    return { sessionId: existingSession, shouldSetCookie: false };
  }

  return { sessionId: createCartSessionId(), shouldSetCookie: true };
}

function withCartSession(response, sessionId, shouldSetCookie) {
  if (shouldSetCookie) {
    response.cookies.set(CART_SESSION_COOKIE, sessionId, CART_SESSION_COOKIE_OPTIONS);
  }

  return response;
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
    || normalizedMessage.includes('customer_snapshot')
    || (
      normalizedMessage.includes('column')
      && normalizedMessage.includes('order_code')
    )
  ) {
    return 'The checkout order schema is not ready yet. Run supabase/cart-orders.sql before submitting structured orders.';
  }

  return error?.message || 'Unable to submit the order right now.';
}

export async function POST(request) {
  const cookieStore = await cookies();
  const { sessionId, shouldSetCookie } = getCartSession(cookieStore);

  if (!isAdminConfigured()) {
    const response = NextResponse.json(
      {
        error: 'Selection archiving is not active yet.',
      },
      { status: 503 }
    );

    return withCartSession(response, sessionId, shouldSetCookie);
  }

  try {
    const payload = await request.json();
    const snapshot = buildCartSnapshot(payload?.items);
    const checkout = normalizeCheckoutPayload(payload?.checkout);
    const authClient = createServerClient(cookieStore);
    const { data: { user } } = await authClient.auth.getUser();

    if (snapshot.itemCount === 0) {
      const response = NextResponse.json(
        {
          error: 'Add at least one piece before checking out.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId, shouldSetCookie);
    }

    if (!checkout.customer.fullName || !checkout.customer.email || !checkout.customer.phone) {
      const response = NextResponse.json(
        {
          error: 'Please provide the customer name, email, and phone number before submitting the order.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId, shouldSetCookie);
    }

    if (!checkout.delivery.shippingCountry || !checkout.delivery.shippingCity) {
      const response = NextResponse.json(
        {
          error: 'Please provide the delivery country and city before submitting the order.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId, shouldSetCookie);
    }

    if (
      checkout.delivery.deliveryMethod.endsWith('_office')
      && !checkout.delivery.shippingOfficeLabel
      && !checkout.delivery.shippingOfficeCode
    ) {
      const response = NextResponse.json(
        {
          error: 'Please provide the pickup office details before submitting the order.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId, shouldSetCookie);
    }

    if (
      checkout.delivery.deliveryMethod.endsWith('_address')
      && !checkout.delivery.shippingAddressLine1
    ) {
      const response = NextResponse.json(
        {
          error: 'Please provide the delivery address before submitting the order.',
        },
        { status: 400 }
      );

      return withCartSession(response, sessionId, shouldSetCookie);
    }

    const supabase = createAdminClient();
    const checkedOutAt = new Date().toISOString();
    const orderCode = buildOrderCode(`${sessionId}-${checkedOutAt}`);
    const orderSubtotal = snapshot.total;
    const orderTotal = Number((orderSubtotal - checkout.pricing.discountAmount + checkout.pricing.shippingAmount).toFixed(2));
    const { data: cartRecord, error: cartError } = await supabase
      .from('carts')
      .upsert(
        {
          session_id: sessionId,
          user_id: user?.id ?? null,
          status: 'checked_out',
          currency: snapshot.currency,
          item_count: snapshot.itemCount,
          total: snapshot.total,
          items: snapshot.items,
          checked_out_at: checkedOutAt,
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
        status: 'pending',
        currency: snapshot.currency,
        item_count: snapshot.itemCount,
        subtotal: orderSubtotal,
        discount_amount: checkout.pricing.discountAmount,
        shipping_amount: checkout.pricing.shippingAmount,
        total: orderTotal,
        discount_code: checkout.pricing.discountCode || null,
        affiliate_code: checkout.pricing.affiliateCode || null,
        affiliate_commission_type: checkout.pricing.affiliateCommissionType || null,
        affiliate_commission_value: checkout.pricing.affiliateCommissionValue,
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
        },
        pricing_snapshot: {
          subtotal: orderSubtotal,
          discount_amount: checkout.pricing.discountAmount,
          shipping_amount: checkout.pricing.shippingAmount,
          total: orderTotal,
          discount_code: checkout.pricing.discountCode || null,
          affiliate_code: checkout.pricing.affiliateCode || null,
          affiliate_commission_type: checkout.pricing.affiliateCommissionType || null,
          affiliate_commission_value: checkout.pricing.affiliateCommissionValue,
        },
      })
      .select('id, order_code, status, total, item_count, created_at')
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderReference = order.order_code || orderCode;
    const response = NextResponse.json({
      order: {
        id: order.id,
        orderCode: orderReference,
        status: order.status,
        total: Number(order.total ?? orderTotal),
        itemCount: Number(order.item_count ?? snapshot.itemCount),
        createdAt: order.created_at ?? checkedOutAt,
      },
      message: `Order ${orderReference} is now waiting for atelier review.`,
    });

    return withCartSession(response, sessionId, shouldSetCookie);
  } catch (error) {
    const response = NextResponse.json(
      {
        error: formatCheckoutError(error),
      },
      { status: 503 }
    );

    return withCartSession(response, sessionId, shouldSetCookie);
  }
}