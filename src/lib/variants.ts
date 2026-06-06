import type { Product, ProductVariant } from '@/types/commerce';

export type { ProductVariant };

export type ProductWithVariants = Pick<
    Product,
    | 'price'
    | 'hasVariants'
    | 'variants'
    | 'availableSizes'
    | 'availableColors'
    | 'colorImages'
    | 'images'
    | 'videos'
    | 'inventory'
>;

export interface ProductMediaOptions {
    selectedColor?: string;
    selectedSize?: string;
    selectedVariant?: ProductVariant | null;
}

/** Build gallery URLs for PDP — updates when color or variant changes */
export function buildProductMedia(
    product: ProductWithVariants,
    options: ProductMediaOptions = {},
): string[] {
    const { selectedColor, selectedVariant } = options;
    const videos = product.videos || [];
    const defaultImages = product.images || [];
    let images: string[] = [];

    if (selectedColor) {
        const fromColorMap = product.colorImages?.[selectedColor];
        if (fromColorMap?.length) {
            images = [...fromColorMap];
        } else {
            const fromVariants = getActiveVariants(product)
                .filter((v) => v.color === selectedColor && v.image)
                .map((v) => v.image as string);
            images = [...new Set(fromVariants)];
        }
        if (!images.length) {
            images = [...defaultImages];
        }
    } else {
        images = [...defaultImages];
    }

    if (selectedVariant?.image) {
        images = [selectedVariant.image, ...images.filter((u) => u !== selectedVariant.image)];
    }

    const media = [...images, ...videos].filter((url, i, arr) => arr.indexOf(url) === i);

    if (media.length === 0) {
        return ['/placeholder-jewelry.svg'];
    }
    return media;
}

export function getActiveVariants(product: ProductWithVariants): ProductVariant[] {
    return (product.variants || []).filter((v) => v.isActive !== false);
}

export function getSizes(product: ProductWithVariants): string[] {
    if (product.availableSizes?.length) return product.availableSizes;
    const sizes = new Set<string>();
    getActiveVariants(product).forEach((v) => {
        if (v.size) sizes.add(v.size);
    });
    return Array.from(sizes);
}

export function getColors(product: ProductWithVariants): string[] {
    if (product.availableColors?.length) return product.availableColors;
    const colors = new Set<string>();
    getActiveVariants(product).forEach((v) => {
        if (v.color) colors.add(v.color);
    });
    return Array.from(colors);
}

export function findVariant(
    product: ProductWithVariants,
    size?: string,
    color?: string,
): ProductVariant | null {
    const variants = getActiveVariants(product);
    if (!variants.length) return null;

    const match = variants.find((v) => {
        const sizeOk = !size || v.size === size;
        const colorOk = !color || v.color === color;
        return sizeOk && colorOk;
    });

    return match || null;
}

export function getVariantPrice(product: ProductWithVariants, variant: ProductVariant | null): number {
    if (variant?.price != null) return variant.price;
    return product.price;
}

export function isVariantInStock(variant: ProductVariant | null): boolean {
    return (variant?.stock ?? 0) > 0;
}

export function formatVariantLabel(variant: ProductVariant | null): string {
    if (!variant) return '';
    const parts: string[] = [];
    if (variant.size) parts.push(`Size ${variant.size}`);
    if (variant.color) parts.push(variant.color);
    return parts.join(' · ');
}

export const RING_SIZES = ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];
export const BANGLE_SIZES = ['2.2', '2.4', '2.6', '2.8', '2.10', '2.12'];
export const JEWELRY_COLORS = ['Gold', 'Rose Gold', 'White Gold', 'Silver', 'Antique Gold'];
