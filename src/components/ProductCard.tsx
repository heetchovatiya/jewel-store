'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { getPublicUrl } from '@/lib/upload';
import styles from './ProductCard.module.css';

interface ProductCardProps {
    product: {
        _id: string;
        title: string;
        price: number;
        compareAtPrice?: number;
        images: string[];
        hoverImageIndex?: number | null;
        slug: string;
        category: string;
        hasVariants?: boolean;
        inventory?: {
            stock: number;
            inStock: boolean;
            priceFrom?: number;
        };
    };
}

export default function ProductCard({ product }: ProductCardProps) {
    const { formatPrice } = useTheme();
    const { addToCart, loading } = useCart();
    const { isAuthenticated } = useAuth();

    const discount = product.compareAtPrice
        ? Math.round((1 - product.price / product.compareAtPrice) * 100)
        : 0;
    const inStock = product.inventory?.inStock ?? false;
    const primarySrc = getPublicUrl(product.images?.[0]) || '/placeholder-jewelry.jpg';
    const hoverSrc =
        product.hoverImageIndex != null && product.images?.[product.hoverImageIndex]
            ? getPublicUrl(product.images[product.hoverImageIndex])
            : null;

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }

        if (!inStock) return;
        if (product.hasVariants) {
            window.location.href = `/products/${product.slug}`;
            return;
        }
        await addToCart(product._id, 1);
    };

    const displayPrice = product.hasVariants && product.inventory?.priceFrom != null
        ? product.inventory.priceFrom
        : product.price;

    const alt = `${product.title}${product.category ? ` — ${product.category}` : ''} gold jewellery`;

    return (
        <Link href={`/products/${product.slug}`} className={styles.card}>
            <div className={styles.imageWrapper}>
                <Image
                    src={primarySrc}
                    alt={alt}
                    width={600}
                    height={600}
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    quality={70}
                    className={`${styles.image} ${styles.primaryImage}`}
                />
                {hoverSrc && (
                    <Image
                        src={hoverSrc}
                        alt={`${product.title} alternate view — ${product.category || 'gold jewellery'}`}
                        width={600}
                        height={600}
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        quality={70}
                        loading="lazy"
                        className={`${styles.image} ${styles.hoverImage}`}
                    />
                )}
                {discount > 0 && (
                    <span className={styles.discountBadge}>-{discount}%</span>
                )}
                {!inStock && (
                    <span className={styles.outOfStock}>Out of Stock</span>
                )}
                <div className={styles.overlay}>
                    <button
                        type="button"
                        className={styles.addBtn}
                        onClick={handleAddToCart}
                        disabled={loading || !inStock}
                    >
                        {!inStock ? 'Out of Stock' : product.hasVariants ? 'Choose Options' : loading ? 'Adding...' : 'Add to Cart'}
                    </button>
                </div>
            </div>
            <div className={styles.content}>
                <span className={styles.category}>{product.category}</span>
                <h3 className={styles.title}>{product.title}</h3>
                <div className={styles.pricing}>
                    <span className={styles.price}>
                        {product.hasVariants && product.inventory?.priceFrom != null ? `From ${formatPrice(displayPrice)}` : formatPrice(displayPrice)}
                    </span>
                    {product.compareAtPrice && (
                        <span className={styles.comparePrice}>
                            {formatPrice(product.compareAtPrice)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
