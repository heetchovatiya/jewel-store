'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
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
        inventory?: {
            stock: number;
            inStock: boolean;
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

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }

        await addToCart(product._id, 1);
    };

    return (
        <Link href={`/products/${product.slug}`} className={styles.card}>
            <div className={styles.imageWrapper}>
                <div className={`${styles.imageSlider} ${product.hoverImageIndex != null && product.images?.[product.hoverImageIndex] ? styles.hasHoverImage : ''}`}>
                    <img
                        src={product.images?.[0] || '/placeholder-jewelry.svg'}
                        alt={product.title}
                        className={styles.image}
                    />
                    {product.hoverImageIndex != null && product.images?.[product.hoverImageIndex] && (
                        <img
                            src={product.images[product.hoverImageIndex]}
                            alt={`${product.title} - alternate view`}
                            className={styles.image}
                        />
                    )}
                </div>
                {discount > 0 && (
                    <span className={styles.discountBadge}>-{discount}%</span>
                )}
                {product.inventory && !product.inventory.inStock && (
                    <span className={styles.outOfStock}>Out of Stock</span>
                )}
                <div className={styles.overlay}>
                    <button
                        className={styles.addBtn}
                        onClick={handleAddToCart}
                        disabled={loading || (product.inventory && !product.inventory.inStock)}
                    >
                        {loading ? 'Adding...' : 'Add to Cart'}
                    </button>
                </div>
            </div>
            <div className={styles.content}>
                <span className={styles.category}>{product.category}</span>
                <h3 className={styles.title}>{product.title}</h3>
                <div className={styles.pricing}>
                    <span className={styles.price}>{formatPrice(product.price)}</span>
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
