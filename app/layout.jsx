import './globals.css';
import { cookies } from 'next/headers';
import ClientEngine from '../components/ClientEngine';
import { CartProvider } from '../components/CartProvider';
import SiteCopyProvider from '../components/site-copy/SiteCopyProvider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { createClient, isSupabaseConfigured, resolveSupabaseWithTimeout } from '../utils/supabase/server';
import { isSiteCopySetupError, toSiteCopyMap } from '../utils/site-copy';

export const metadata = {
  title: 'The VA Store | High-End Macramé',
  description: 'Elevating traditional craftsmanship into avant-garde fashion. Hand-knotted in Victoria.',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon-32x32.png'],
  },
  manifest: '/site.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

async function loadSiteCopyState() {
  if (!isSupabaseConfigured()) {
    return { initialEntries: {}, isAdmin: false };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const authResult = await resolveSupabaseWithTimeout(
    () => supabase.auth.getUser(),
    { data: { user: null }, error: null }
  );
  const copyResult = await resolveSupabaseWithTimeout(
    () => supabase.from('site_copy_entries').select('key, value'),
    { data: [], error: null }
  );

  let isAdmin = false;

  if (authResult.data?.user) {
    const profileResult = await resolveSupabaseWithTimeout(
      () => supabase.from('profiles').select('is_admin').eq('id', authResult.data.user.id).maybeSingle(),
      { data: null, error: null }
    );

    isAdmin = Boolean(profileResult.data?.is_admin);
  }

  if (copyResult.error && !isSiteCopySetupError(copyResult.error)) {
    return { initialEntries: {}, isAdmin };
  }

  return {
    initialEntries: toSiteCopyMap(copyResult.data || []),
    isAdmin,
  };
}

export default async function RootLayout({ children }) {
  const { initialEntries, isAdmin } = await loadSiteCopyState();

  return (
    <html lang="en" data-page-motion="on" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  try {
    var storedPreference = window.localStorage.getItem('lumina-page-motion');
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pageMotionEnabled = storedPreference === 'on' || (storedPreference !== 'off' && !prefersReducedMotion);

    document.documentElement.dataset.pageMotion = pageMotionEnabled ? 'on' : 'off';
  } catch (error) {
    document.documentElement.dataset.pageMotion = 'on';
  }
})();`,
          }}
        />
      </head>
      
      <body suppressHydrationWarning className="bg-[#1C1C1C] text-[#1C1C1C] font-sans overflow-x-hidden selection:bg-[#1C1C1C] selection:text-[#EFECE8]">
        <SiteCopyProvider initialEntries={initialEntries} isAdmin={isAdmin}>
          <CartProvider>
            <ClientEngine>
              {children}
            </ClientEngine>
          </CartProvider>
        </SiteCopyProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}