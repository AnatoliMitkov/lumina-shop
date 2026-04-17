import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildCartSnapshot,
  createCartSessionId,
  CART_SESSION_COOKIE,
  CART_SESSION_COOKIE_OPTIONS,
} from '../../../../utils/cart';
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
  if (error?.code === '42P01') {
    return 'The atelier archive tables are not ready yet. Run supabase/cart-orders.sql before archiving selections.';
  }

  return error?.message || 'Unable to archive the selection right now.';
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

    const supabase = createAdminClient();
    const checkedOutAt = new Date().toISOString();
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
        customer_email: user?.email ?? null,
        status: 'pending',
        currency: snapshot.currency,
        item_count: snapshot.itemCount,
        total: snapshot.total,
        items: snapshot.items,
      })
      .select('id, status, total, item_count, created_at')
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderCode = order.id.slice(0, 8).toUpperCase();
    const response = NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        total: Number(order.total ?? snapshot.total),
        itemCount: Number(order.item_count ?? snapshot.itemCount),
        createdAt: order.created_at ?? checkedOutAt,
      },
      message: `Selection ${orderCode} is now archived in your client account.`,
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