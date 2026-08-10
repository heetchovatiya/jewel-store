import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { fetchProductBySlug } from '@/lib/server-api';
import { SITE_URL, SITE_NAME, buildProductJsonLd } from '@/lib/seo';
import { getPublicUrl } from '@/lib/upload';
import ProductDetailClient from './ProductDetailClient';

type Props = { params: Promise<{ slug: string }> };

function expandProductMedia(product: any) {
  if (!product) return product;
  const images = (product.images || []).map((img: string) => getPublicUrl(img));
  return { ...product, images };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const raw = await fetchProductBySlug(slug);
  if (!raw) {
    return {
      title: 'Product not found',
      robots: { index: false, follow: false },
    };
  }

  const product = expandProductMedia(raw);
  const title = `${product.title} — ${product.category || 'Gold Jewellery'}`;
  const description = [
    product.description?.slice(0, 140) ||
      `${product.title}: certified gold jewellery from ${SITE_NAME}.`,
    product.price != null ? `Price ₹${product.price}.` : null,
    'Pan-India delivery & BIS hallmarked craftsmanship.',
  ]
    .filter(Boolean)
    .join(' ');

  const image = product.images?.[0];

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/products/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${slug}`,
      type: 'website',
      images: image
        ? [{ url: image, width: 800, height: 800, alt: product.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const raw = await fetchProductBySlug(slug);
  if (!raw) notFound();

  const product = expandProductMedia(raw);
  const jsonLd = buildProductJsonLd({
    title: product.title,
    description: product.description,
    slug: product.slug || slug,
    price: product.price ?? product.inventory?.priceFrom ?? 0,
    images: product.images,
    category: product.category,
    inventory: product.inventory,
    specifications: product.specifications,
  });

  const answerBlurb = `${product.title} is ${product.category || 'gold'} jewellery from ${SITE_NAME}${
    product.price != null ? `, priced at ₹${product.price}` : ''
  }. ${
    product.description
      ? product.description.slice(0, 120)
      : 'BIS hallmarked focus, transparent pricing, and pan-India delivery.'
  }`;

  return (
    <>
      <JsonLd data={jsonLd} />
      <p className="sr-only">{answerBlurb}</p>
      <ProductDetailClient initialProduct={product} />
    </>
  );
}
