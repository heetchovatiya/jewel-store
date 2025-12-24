'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import styles from './page.module.css';

export default function CheckoutPage() {
    const router = useRouter();
    const { formatPrice } = useTheme();
    const { items, total, clearCart } = useCart();
    const { user, isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');

    const [address, setAddress] = useState({
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
    });

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (items.length === 0 && !success) {
            router.push('/cart');
        }
        // Pre-fill with user's default address if available
        if (user?.addresses?.length) {
            const defaultAddr = user.addresses.find((a: any) => a.isDefault) || user.addresses[0];
            setAddress({
                fullName: defaultAddr.fullName || user.name || '',
                phone: defaultAddr.phone || user.phone || '',
                addressLine1: defaultAddr.addressLine1 || '',
                addressLine2: defaultAddr.addressLine2 || '',
                city: defaultAddr.city || '',
                state: defaultAddr.state || '',
                pincode: defaultAddr.pincode || '',
            });
        }
    }, [isAuthenticated, items, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const order = await api.createOrder(address);
            setOrderNumber(order.orderNumber);
            setSuccess(true);
            clearCart();
        } catch (err: any) {
            setError(err.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.success}>
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <h1>Order Placed Successfully!</h1>
                <p className={styles.orderNumber}>Order #: {orderNumber}</p>
                <p>Thank you for your order. We will contact you shortly.</p>
                <div className={styles.successActions}>
                    <a href="/account/orders" className="btn btn-primary">View Orders</a>
                    <a href="/products" className="btn btn-secondary">Continue Shopping</a>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.checkoutPage}>
            <div className="container">
                <h1 className={styles.title}>Checkout</h1>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.checkoutLayout}>
                    <form onSubmit={handleSubmit} className={styles.addressForm}>
                        <h2>Shipping Address</h2>

                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className="label">Full Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={address.fullName}
                                    onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className="label">Phone Number</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={address.phone}
                                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className="label">Address Line 1</label>
                            <input
                                type="text"
                                className="input"
                                value={address.addressLine1}
                                onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                                placeholder="House/Flat No., Building Name"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className="label">Address Line 2 (Optional)</label>
                            <input
                                type="text"
                                className="input"
                                value={address.addressLine2}
                                onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                                placeholder="Street, Landmark"
                            />
                        </div>

                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className="label">City</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={address.city}
                                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className="label">State</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={address.state}
                                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className="label">PIN Code</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={address.pincode}
                                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Placing Order...' : 'Place Order'}
                        </button>
                    </form>

                    <div className={styles.orderSummary}>
                        <h2>Order Summary</h2>
                        <div className={styles.items}>
                            {items.map((item) => (
                                <div key={item.productId} className={styles.summaryItem}>
                                    <img src={item.image || '/placeholder-jewelry.jpg'} alt={item.title} />
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>{item.title}</span>
                                        <span className={styles.itemQty}>Qty: {item.quantity}</span>
                                    </div>
                                    <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.totals}>
                            <div className={styles.totalRow}>
                                <span>Subtotal</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                            <div className={styles.totalRow}>
                                <span>Shipping</span>
                                <span className={styles.free}>Free</span>
                            </div>
                            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                                <span>Total</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
