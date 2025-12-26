/**
 * DigitalOcean Spaces Image Utilities
 * 
 * Bucket: https://jewelstore.sgp1.digitaloceanspaces.com
 * 
 * Folder Structure:
 * - /products/{product-slug}/image.jpg
 * - /categories/{category-slug}.jpg
 * - /banners/{banner-name}.jpg
 * - /about/{image-name}.jpg
 */

export const DO_BUCKET_URL = 'https://jewelstore.sgp1.digitaloceanspaces.com';

/**
 * Get full URL for any path in the bucket
 */
export function getStorageUrl(path: string): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${DO_BUCKET_URL}/${cleanPath}`;
}

/**
 * Get product image URL
 * @param productSlug - The product slug (e.g., "diamond-solitaire-ring")
 * @param imageName - The image filename (e.g., "main.jpg")
 */
export function getProductImageUrl(productSlug: string, imageName: string): string {
    return getStorageUrl(`products/${productSlug}/${imageName}`);
}

/**
 * Get category image URL
 * @param categorySlug - The category slug (e.g., "rings")
 */
export function getCategoryImageUrl(categorySlug: string, imageName: string = 'cover.jpg'): string {
    return getStorageUrl(`categories/${categorySlug}/${imageName}`);
}

/**
 * Get banner image URL
 * @param bannerName - The banner filename (e.g., "hero-banner.jpg")
 */
export function getBannerImageUrl(bannerName: string): string {
    return getStorageUrl(`banners/${bannerName}`);
}

/**
 * Get about section image URL
 * @param imageName - The image filename (e.g., "story-1.jpg")
 */
export function getAboutImageUrl(imageName: string): string {
    return getStorageUrl(`about/${imageName}`);
}

/**
 * Check if a URL is already a full URL or a relative path
 */
export function isFullUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Get the full image URL, handling both full URLs and relative paths
 */
export function resolveImageUrl(url: string, fallback: string = '/placeholder-jewelry.jpg'): string {
    if (!url) return fallback;
    if (isFullUrl(url)) return url;
    return getStorageUrl(url);
}
