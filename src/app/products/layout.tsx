import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shop Gold Jewellery',
  description:
    'Browse BIS hallmarked gold jewellery at Priyanci Gold—rings, necklaces, bangles, earrings and more with transparent pricing.',
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
