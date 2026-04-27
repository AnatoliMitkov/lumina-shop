import { createServerClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_TIMEOUT_MS = 2500;

export function isInvalidRefreshTokenError(error) {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  return message.includes('invalid refresh token')
    || message.includes('refresh token not found');
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function resolveSupabaseWithTimeout(operation, fallbackValue, timeoutMs = DEFAULT_SUPABASE_TIMEOUT_MS) {
  let timeoutId;

  try {
    return await Promise.race([
      Promise.resolve().then(operation).catch(() => fallbackValue),
      new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getUserSafely(supabase, timeoutMs = DEFAULT_SUPABASE_TIMEOUT_MS) {
  const fallbackValue = { data: { user: null }, error: null };
  const result = await resolveSupabaseWithTimeout(() => supabase.auth.getUser(), fallbackValue, timeoutMs);

  if (!result || isInvalidRefreshTokenError(result.error)) {
    return fallbackValue;
  }

  return result;
}

export function createClient(cookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
