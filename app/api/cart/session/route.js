import { NextResponse } from 'next/server';
import {
  createCartSessionId,
  CART_SESSION_COOKIE,
  CART_SESSION_COOKIE_OPTIONS,
} from '../../../../utils/cart';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(
    CART_SESSION_COOKIE,
    createCartSessionId(),
    CART_SESSION_COOKIE_OPTIONS
  );

  return response;
}