'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function CartPage() {
    const router = useRouter();
    const { formatPrice } = useTheme();
    const { items, total, loading, updateQuantity, removeItem } = useCart();
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return (
            <div className={styles.empty}>
                <h2>Please Login</h2>
                <p>You need to be logged in to view your cart</p>
                <Link href="/login" className="btn btn-primary">Login</Link>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className={styles.empty}>
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <h2>Your Cart is Empty</h2>
                <p>Looks like you haven't added any items yet</p>
                <Link href="/products" className="btn btn-primary">Start Shopping</Link>
            </div>
        );
    }

    return (
        <div className={styles.cartPage}>
            <div className="container">
                <h1 className={styles.title}>Shopping Cart</h1>

                <div className={styles.cartLayout}>
                    <div className={styles.cartItems}>
                        {items.map((item) => (
                            <div key={item.productId} className={styles.cartItem}>
                                <div className={styles.itemImage}>
                                    <img src={item.image || '/placeholder-jewelry.svg'} alt={item.title} />
                                </div>
                                <div className={styles.itemDetails}>
                                    <h3>{item.title}</h3>
                                    <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
                                </div>
                                <div className={styles.itemQuantity}>
                                    <button
                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                        disabled={loading || item.quantity <= 1}
                                    >
                                        −
                                    </button>
                                    <span>{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                        disabled={loading}
                                    >
                                        +
                                    </button>
                                </div>
                                <div className={styles.itemTotal}>
                                    {formatPrice(item.price * item.quantity)}
                                </div>
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => removeItem(item.productId)}
                                    disabled={loading}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.cartSummary}>
                        <h3>Order Summary</h3>
                        <div className={styles.summaryRow}>
                            <span>Subtotal</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Shipping</span>
                            <span className={styles.free}>Free</span>
                        </div>
                        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                        <Link href="/checkout" className="btn btn-primary" style={{ width: '100%' }}>
                            Proceed to Checkout
                        </Link>
                        <Link href="/products" className={styles.continueLink}>
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
