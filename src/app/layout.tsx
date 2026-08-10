import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import {
  SITE_URL,
  DEFAULT_DESCRIPTION,
  BRAND_NAME,
  buildOrganizationJsonLd,
} from '@/lib/seo';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import DynamicFavicon from '@/components/DynamicFavicon';
import { fetchPublicConfig } from '@/lib/server-api';
import { Fraunces, Public_Sans, IBM_Plex_Mono } from 'next/font/google';
import dynamic from 'next/dynamic';
import './globals.css';

const Footer = dynamic(() => import('@/components/Footer'));

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-voice',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const plexMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false, // not needed for first paint / LCP
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — Certified Gold & Diamond Jewellery Online`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'gold jewellery online',
    'hallmarked gold jewellery',
    '916 gold jewellery',
    '22 karat gold',
    'BIS hallmark gold',
    'Priyanci Gold',
    'gold rings',
    'gold necklaces',
    'gold bangles',
  ],
  authors: [{ name: BRAND_NAME }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — Certified Gold & Diamond Jewellery Online`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: '/placeholder-jewelry.jpg',
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} — 916 Hallmarked Gold Jewellery`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — Certified Gold & Diamond Jewellery Online`,
    description: DEFAULT_DESCRIPTION,
    images: ['/placeholder-jewelry.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
  },
  category: 'Jewellery',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialConfig = await fetchPublicConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`}
        suppressHydrationWarning
      >
        <JsonLd data={buildOrganizationJsonLd()} />
        <ThemeProvider initialConfig={initialConfig}>
          <DynamicFavicon />
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <main className="main-content">{children}</main>
              <Footer />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
