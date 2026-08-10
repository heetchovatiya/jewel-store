import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { JsonLd } from '@/components/JsonLd';
import HeroCarousel from '@/components/HeroCarousel';
import {
  SITE_URL,
  DEFAULT_DESCRIPTION,
  HOME_FAQS,
  buildFaqJsonLd,
} from '@/lib/seo';
import { fetchPublicConfig } from '@/lib/server-api';
import { getPublicUrl } from '@/lib/upload';

const HomePageClient = dynamic(() => import('./HomePageClient'));

export const metadata: Metadata = {
  title: 'Certified Gold & Diamond Jewellery Online',
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'Priyanci Gold — Certified Gold Jewellery Online',
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
  },
};

export default async function HomePage() {
  const config = await fetchPublicConfig();
  const banners = (config?.heroBanners || [])
    .map((b: string) => getPublicUrl(b))
    .filter(Boolean);

  return (
    <>
      <JsonLd data={buildFaqJsonLd(HOME_FAQS)} />
      <HeroCarousel
        initialBanners={banners}
        storeName={config?.storeName}
        storeDescription={config?.storeDescription}
      />
      <HomePageClient />
    </>
  );
}
