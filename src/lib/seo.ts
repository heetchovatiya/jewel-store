/** Canonical public site URL for SEO / structured data */
export const SITE_URL = 'https://www.priyancigold.com';
export const SITE_NAME = 'Priyanci Gold';
export const BRAND_NAME = 'Priyanci Gold';

export const DEFAULT_DESCRIPTION =
  'Shop BIS hallmarked gold jewellery online at Priyanci Gold. Transparent pricing, pan-India delivery, and certified craftsmanship.';

export const HOME_FAQS = [
  {
    question: 'Is Priyanci Gold jewellery BIS hallmarked?',
    answer:
      'Yes. Priyanci Gold sells BIS hallmarked jewellery with certified purity. Look for hallmark details on product pages and certificates where applicable.',
  },
  {
    question: 'Do you ship across India?',
    answer:
      'Yes. We offer pan-India shipping, with free delivery on orders above ₹999. Cash on delivery is available on eligible orders.',
  },
  {
    question: 'What is your return policy?',
    answer:
      'Unused products can be returned within 7 days under our easy-return policy. Please keep original packaging and tags intact.',
  },
  {
    question: 'Are making charges and pricing transparent?',
    answer:
      'Yes. Product pages show the selling price clearly so you know what you pay before checkout—no hidden last-step surprises.',
  },
  {
    question: 'How can I enquire about a specific design?',
    answer:
      'Open any product page and use “Inquire About This Product,” or call the store contact number listed in the site footer.',
  },
] as const;

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildOrganizationJsonLd(logoUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: BRAND_NAME,
    url: SITE_URL,
    logo: logoUrl || absoluteUrl('/placeholder-jewelry.jpg'),
    image: logoUrl || absoluteUrl('/placeholder-jewelry.jpg'),
    description: DEFAULT_DESCRIPTION,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
    },
    areaServed: 'IN',
    priceRange: '₹₹',
  };
}

export function buildFaqJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }> = HOME_FAQS,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildProductJsonLd(product: {
  title: string;
  description?: string;
  slug: string;
  price: number;
  images?: string[];
  category?: string;
  inventory?: { sku?: string; inStock?: boolean };
  specifications?: Record<string, string>;
}) {
  const image = product.images?.[0];
  const inStock = product.inventory?.inStock !== false;
  const specs = product.specifications || {};

  const additionalProperty = Object.entries(specs).map(([name, value]) => ({
    '@type': 'PropertyValue',
    name,
    value,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || `${product.title} from ${BRAND_NAME}`,
    image: image ? [image] : undefined,
    sku: product.inventory?.sku,
    category: product.category,
    brand: {
      '@type': 'Brand',
      name: BRAND_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: 'INR',
      price: product.price,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(additionalProperty.length ? { additionalProperty } : {}),
  };
}
