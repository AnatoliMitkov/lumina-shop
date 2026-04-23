import './globals.css';
import { cookies, headers } from 'next/headers';
import Script from 'next/script';
import ClientEngine from '../components/ClientEngine';
import { CartProvider } from '../components/CartProvider';
import SiteCopyProvider from '../components/site-copy/SiteCopyProvider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { createClient, isSupabaseConfigured, resolveSupabaseWithTimeout } from '../utils/supabase/server';
import { isSiteCopySetupError, toSiteCopyMap } from '../utils/site-copy';
import {
  DEFAULT_LANGUAGE,
  detectPreferredLanguageFromHeader,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_COOKIE_MAX_AGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from '../utils/language';
import { absoluteSiteUrl, getSiteUrl } from '../utils/seo';

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'The VA Store | Handmade Avant-Garde Fashion',
    template: '%s | The VA Store',
  },
  description: 'Hand-knotted avant-garde fashion from Styling by VA. Explore sculptural tops, dresses, sets, bespoke pieces, and worldwide delivery from Bulgaria.',
  applicationName: 'The VA Store',
  keywords: [
    'The VA Store',
    'Styling by VA',
    'macrame fashion',
    'avant-garde fashion',
    'handmade fashion',
    'designer tops',
    'bespoke fashion Bulgaria',
    'luxury handmade clothing',
  ],
  authors: [{ name: 'Styling by VA' }],
  creator: 'Styling by VA',
  publisher: 'Styling by VA',
  alternates: {
    canonical: '/',
  },
  category: 'fashion',
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'The VA Store',
    title: 'The VA Store | Handmade Avant-Garde Fashion',
    description: 'Hand-knotted avant-garde fashion from Styling by VA with collections, spotlight stories, and worldwide delivery.',
    images: [
      {
        url: absoluteSiteUrl('/icon-512.png'),
        width: 512,
        height: 512,
        alt: 'The VA Store icon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The VA Store | Handmade Avant-Garde Fashion',
    description: 'Explore hand-knotted avant-garde fashion from Styling by VA.',
    images: [absoluteSiteUrl('/icon-512.png')],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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

async function loadSiteCopyState(cookieStore) {
  if (!isSupabaseConfigured()) {
    return { initialEntries: {}, isAdmin: false };
  }

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
  const cookieStore = await cookies();
  const headerStore = await headers();
  const storedLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value);
  const browserLanguage = detectPreferredLanguageFromHeader(headerStore.get('accept-language'));
  const initialLanguage = storedLanguage || browserLanguage || DEFAULT_LANGUAGE;
  const { initialEntries, isAdmin } = await loadSiteCopyState(cookieStore);
  const languageBootstrapScript = `(function () {
  try {
    var defaultLanguage = ${JSON.stringify(DEFAULT_LANGUAGE)};
    var storageKey = ${JSON.stringify(LANGUAGE_STORAGE_KEY)};
    var cookieKey = ${JSON.stringify(LANGUAGE_COOKIE_KEY)};
    var cookieMaxAge = ${LANGUAGE_COOKIE_MAX_AGE};
    var supportedLanguages = ${JSON.stringify(SUPPORTED_LANGUAGES)};
    var seededLanguage = ${JSON.stringify(initialLanguage)};

    function normalizeLanguage(value) {
      if (typeof value !== 'string') {
        return null;
      }

      var normalizedValue = value.trim().toLowerCase();

      if (!normalizedValue) {
        return null;
      }

      var baseLanguage = normalizedValue.split(/[-_]/)[0];

      return supportedLanguages.indexOf(baseLanguage) >= 0 ? baseLanguage : null;
    }

    function readCookie(name) {
      var prefix = name + '=';
      var parts = String(document.cookie || '').split(';');

      for (var index = 0; index < parts.length; index += 1) {
        var part = parts[index].trim();

        if (part.indexOf(prefix) === 0) {
          return decodeURIComponent(part.slice(prefix.length));
        }
      }

      return '';
    }

    var storedLanguage = '';

    try {
      storedLanguage = window.localStorage.getItem(storageKey) || '';
    } catch (error) {
      storedLanguage = '';
    }

    var cookieLanguage = readCookie(cookieKey);
    var preferredLanguage = normalizeLanguage(seededLanguage)
      || normalizeLanguage(cookieLanguage)
      || normalizeLanguage(storedLanguage)
      || normalizeLanguage(window.__luminaInitialLanguage);

    if (!preferredLanguage) {
      var browserLanguages = [navigator.language].concat(navigator.languages || []);

      for (var languageIndex = 0; languageIndex < browserLanguages.length; languageIndex += 1) {
        preferredLanguage = normalizeLanguage(browserLanguages[languageIndex]);

        if (preferredLanguage) {
          break;
        }
      }
    }

    preferredLanguage = preferredLanguage || defaultLanguage;
    window.__luminaInitialLanguage = preferredLanguage;
    document.documentElement.lang = preferredLanguage;

    try {
      window.localStorage.setItem(storageKey, preferredLanguage);
    } catch (error) {
      // Ignore localStorage write failures.
    }

    document.cookie = cookieKey + '=' + encodeURIComponent(preferredLanguage) + '; path=/; max-age=' + cookieMaxAge + '; SameSite=Lax';
  } catch (error) {
    window.__luminaInitialLanguage = ${JSON.stringify(initialLanguage)};
    document.documentElement.lang = ${JSON.stringify(initialLanguage)};
  }
})();`;

  return (
    <html lang={initialLanguage} data-page-motion="on" suppressHydrationWarning>
      <head>
        <Script
          id="gtag-loader"
          src="https://www.googletagmanager.com/gtag/js?id=G-HS1V41ZYQ4"
          strategy="afterInteractive"
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-HS1V41ZYQ4');`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
        <Script
          id="language-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: languageBootstrapScript,
          }}
        />
        <Script
          id="page-motion-bootstrap"
          strategy="beforeInteractive"
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
        <SiteCopyProvider initialEntries={initialEntries} isAdmin={isAdmin} initialLanguage={initialLanguage}>
          <CartProvider>
            <ClientEngine initialLanguage={initialLanguage}>
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