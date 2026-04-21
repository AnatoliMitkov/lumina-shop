import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildCartSnapshot,
  createCartSessionId,
  CART_SESSION_COOKIE,
  CART_SESSION_COOKIE_OPTIONS,
} from '../../../utils/cart';
import {
  buildCatalogBackfilledCartSnapshot,
  fetchCheckoutProductRecords,
} from '../../../utils/checkout-server';
import { createAdminClient, isAdminConfigured } from '../../../utils/supabase/admin';
import { createClient as createServerClient } from '../../../utils/supabase/server';

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

function buildCartResponse(cartRecord, snapshot = null) {
  if (!cartRecord) {
    return buildCartSnapshot([]);
  }

  const resolvedSnapshot = snapshot || buildCartSnapshot(cartRecord.items);

  return {
    id: cartRecord.id,
    ...resolvedSnapshot,
    status: cartRecord.status ?? 'active',
    updatedAt: cartRecord.updated_at ?? null,
  };
}

async function refreshCartSnapshot(supabase, items = []) {
  const snapshot = buildCartSnapshot(items);

  if (!supabase || snapshot.itemCount === 0) {
    return snapshot;
  }

  try {
    const productRecords = await fetchCheckoutProductRecords(supabase, snapshot.items);
    return buildCatalogBackfilledCartSnapshot(snapshot.items, productRecords);
  } catch {
    return snapshot;
  }
}

function formatCartError(error) {
  if (error?.code === '42P01') {
    return 'Supabase cart tables are missing. Run supabase/cart-orders.sql before using cart persistence.';
  }

  return error?.message || 'Unable to sync the cart with Supabase.';
}

function browserCartResponse(cart, sessionId, shouldSetCookie, status = 200, warning = '') {
  const response = NextResponse.json(
    {
      cart,
      persistence: 'browser',
      ...(warning ? { warning } : {}),
    },
    { status }
  );

  return withCartSession(response, sessionId, shouldSetCookie);
}

export async function GET() {
  const cookieStore = await cookies();
  const { sessionId, shouldSetCookie } = getCartSession(cookieStore);

  if (!isAdminConfigured()) {
    return browserCartResponse(buildCartSnapshot([]), sessionId, shouldSetCookie);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('carts')
      .select('id, items, status, updated_at')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      throw error;
    }

    const cartSnapshot = await refreshCartSnapshot(supabase, data?.items);

    const response = NextResponse.json({
      cart: buildCartResponse(data, cartSnapshot),
      persistence: 'supabase',
    });

    return withCartSession(response, sessionId, shouldSetCookie);
  } catch (error) {
    return browserCartResponse(buildCartSnapshot([]), sessionId, shouldSetCookie, 503, formatCartError(error));
  }
}

export async function PUT(request) {
  const cookieStore = await cookies();
  const { sessionId, shouldSetCookie } = getCartSession(cookieStore);
  const payload = await request.json().catch(() => ({}));
  const snapshot = buildCartSnapshot(payload?.items);

  if (!isAdminConfigured()) {
    return browserCartResponse(snapshot, sessionId, shouldSetCookie);
  }

  try {
    const authClient = createServerClient(cookieStore);
    const { data: { user } } = await authClient.auth.getUser();
    const supabase = createAdminClient();
    const persistedSnapshot = await refreshCartSnapshot(supabase, snapshot.items);
    const { data, error } = await supabase
      .from('carts')
      .upsert(
        {
          session_id: sessionId,
          user_id: user?.id ?? null,
          status: 'active',
          currency: persistedSnapshot.currency,
          item_count: persistedSnapshot.itemCount,
          total: persistedSnapshot.total,
          items: persistedSnapshot.items,
          checked_out_at: null,
        },
        { onConflict: 'session_id' }
      )
      .select('id, items, status, updated_at')
      .single();

    if (error) {
      throw error;
    }

    const response = NextResponse.json({
      cart: buildCartResponse(data, persistedSnapshot),
      persistence: 'supabase',
      message: 'Cart synced to your client session.',
    });

    return withCartSession(response, sessionId, shouldSetCookie);
  } catch (error) {
    const response = NextResponse.json(
      {
        error: formatCartError(error),
      },
      { status: 503 }
    );

    return withCartSession(response, sessionId, shouldSetCookie);
  }
}