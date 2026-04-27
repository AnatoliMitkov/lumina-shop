import { createBrowserClient } from '@supabase/ssr';
import { isInvalidRefreshTokenError } from './server';

let browserClient;
let browserSessionCheck;

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createClient() {
  if (browserClient) {
    void ensureValidBrowserSession();
    return browserClient;
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Missing Supabase public environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.');
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  void ensureValidBrowserSession();

  return browserClient;
}

async function ensureValidBrowserSession() {
  if (!browserClient || browserSessionCheck) {
    return browserSessionCheck;
  }

  browserSessionCheck = browserClient.auth.getSession()
    .then(async ({ error }) => {
      if (isInvalidRefreshTokenError(error)) {
        await browserClient.auth.signOut({ scope: 'local' });
      }
    })
    .catch(async (error) => {
      if (isInvalidRefreshTokenError(error)) {
        await browserClient.auth.signOut({ scope: 'local' });
      }
    })
    .finally(() => {
      browserSessionCheck = null;
    });

  return browserSessionCheck;
}