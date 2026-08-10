/**
 * Server-only API helpers for SEO (sitemap, generateMetadata, SSR JSON-LD).
 * Does not use localStorage / browser auth.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TENANT_HEADER = { 'x-tenant-id': 'default' };

async function serverFetch<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: TENANT_HEADER,
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchProductBySlug(slug: string) {
  return serverFetch<any>(`/products/${encodeURIComponent(slug)}`, 60);
}

export async function fetchProductSlugs(): Promise<
  Array<{ slug: string; updatedAt?: string }>
> {
  const data = await serverFetch<Array<{ slug: string; updatedAt?: string }>>(
    '/products/slugs',
    60,
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchPublicConfig() {
  return serverFetch<any>('/config', 120);
}
