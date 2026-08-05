/**
 * Cloudflare R2 / CDN image URL helpers
 *
 * Public assets are served from S3_CUSTOM_DOMAIN (e.g. https://cdn.yourdomain.com)
 * Set NEXT_PUBLIC_CDN_URL in the frontend env to match that domain.
 */

export const CDN_BASE_URL =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, '')) ||
    '';

/**
 * Get full URL for any path in the bucket
 */
export function getStorageUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (!CDN_BASE_URL) {
        return `/${cleanPath}`;
    }
    return `${CDN_BASE_URL}/${cleanPath}`;
}

export function getProductImageUrl(productSlug: string, imageName: string): string {
    return getStorageUrl(`products/${productSlug}/${imageName}`);
}

export function getCategoryImageUrl(categorySlug: string, imageName: string = 'cover.jpg'): string {
    return getStorageUrl(`categories/${categorySlug}/${imageName}`);
}

export function getBannerImageUrl(bannerName: string): string {
    return getStorageUrl(`banners/${bannerName}`);
}

export function getAboutImageUrl(imageName: string): string {
    return getStorageUrl(`about/${imageName}`);
}

export function isFullUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
}

export function resolveImageUrl(url: string, fallback: string = '/placeholder-jewelry.svg'): string {
    if (!url) return fallback;
    if (isFullUrl(url)) return url;
    return getStorageUrl(url);
}

/** @deprecated Use CDN_BASE_URL */
export const DO_BUCKET_URL = CDN_BASE_URL;
