import './globals.css';
import ClientEngine from '../components/ClientEngine';
import { CartProvider } from '../components/CartProvider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      
      <body suppressHydrationWarning className="bg-[#1C1C1C] text-[#1C1C1C] font-sans overflow-x-hidden cursor-none selection:bg-[#1C1C1C] selection:text-[#EFECE8]">
        <CartProvider>
          <ClientEngine>
            {children}
          </ClientEngine>
        </CartProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}