'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import styles from './page.module.css';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function CheckoutPage() {
    const router = useRouter();
    const { formatPrice } = useTheme();
    const { items, total, clearCart } = useCart();
    const { user, isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
    const [pincodeLoading, setPincodeLoading] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const lastPincodeLookupRef = useRef('');

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
        if (items.length === 0) {
            router.push('/cart');
        }
        // Pre-fill with first saved address (or default when available)
        if (user?.addresses?.length) {
            const defaultAddr = user.addresses.find((a: any) => a.isDefault) || user.addresses[0];
            const index = user.addresses.findIndex((a: any) => a === defaultAddr);
            setSelectedAddressIndex(index >= 0 ? index : 0);
            setAddress({
                fullName: defaultAddr.fullName || user.name || '',
                phone: defaultAddr.phone || user.phone || '',
                addressLine1: defaultAddr.addressLine1 || '',
                addressLine2: defaultAddr.addressLine2 || '',
                city: defaultAddr.city || '',
                state: defaultAddr.state || '',
                pincode: defaultAddr.pincode || '',
            });
        } else {
            setAddress((prev) => ({
                ...prev,
                fullName: user?.name || prev.fullName,
                phone: user?.phone || prev.phone,
            }));
        }
    }, [isAuthenticated, items, user, router]);

    const applySavedAddress = (index: number) => {
        if (!user?.addresses?.[index]) return;
        const saved = user.addresses[index];
        setSelectedAddressIndex(index);
        setAddress({
            fullName: saved.fullName || user.name || '',
            phone: saved.phone || user.phone || '',
            addressLine1: saved.addressLine1 || '',
            addressLine2: saved.addressLine2 || '',
            city: saved.city || '',
            state: saved.state || '',
            pincode: saved.pincode || '',
        });
    };

    const loadRazorpayScript = async (): Promise<boolean> => {
        if (window.Razorpay) return true;

        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePincodeChange = async (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 6);
        setAddress((prev) => ({ ...prev, pincode: cleaned }));
        setPincodeError('');

        if (cleaned.length !== 6) {
            setPincodeLoading(false);
            return;
        }

        try {
            setPincodeLoading(true);
            lastPincodeLookupRef.current = cleaned;
            const response = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
            const data = await response.json();

            if (lastPincodeLookupRef.current !== cleaned) {
                return;
            }

            if (data?.[0]?.Status === 'Success' && Array.isArray(data?.[0]?.PostOffice) && data[0].PostOffice.length > 0) {
                const details = data[0].PostOffice[0];
                setAddress((prev) => ({
                    ...prev,
                    city: details.District || prev.city,
                    state: details.State || prev.state,
                }));
            } else {
                setPincodeError('We could not find this PIN code. Please check and re-enter.');
            }
        } catch {
            setPincodeError('Unable to verify PIN code right now. Please enter city and state manually.');
        } finally {
            setPincodeLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const sdkLoaded = await loadRazorpayScript();
            if (!sdkLoaded) {
                throw new Error('Unable to load Razorpay. Please check your internet and try again.');
            }

            const payment = await api.initiatePayment(address);
            const options = {
                key: payment.keyId,
                amount: payment.amount,
                currency: 'INR',
                description: `Order ${payment.orderNumber}`,
                order_id: payment.razorpayOrderId,
                handler: async (response: any) => {
                    try {
                        const verified = await api.verifyPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });

                        await clearCart();
                        router.push('/account/orders');
                    } catch (verifyError: any) {
                        setError(verifyError.message || 'Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: user?.name || address.fullName,
                    contact: address.phone,
                    email: user?.email || '',
                },
                theme: { color: '#d4af37' },
                modal: {
                    ondismiss: () => {
                        setLoading(false);
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (err: any) {
            setError(err.message || 'Failed to initiate payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.checkoutPage}>
            <div className="container">
                <h1 className={styles.title}>Checkout</h1>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.checkoutLayout}>
                    <form onSubmit={handleSubmit} className={styles.addressForm}>
                        <h2>Shipping Address</h2>
                        {user?.addresses?.length ? (
                            <div className={styles.formGroup}>
                                <label className="label">Saved Addresses</label>
                                <select
                                    className="input"
                                    value={selectedAddressIndex}
                                    onChange={(e) => applySavedAddress(Number(e.target.value))}
                                >
                                    {user.addresses.map((savedAddress: any, index: number) => (
                                        <option key={`${savedAddress.addressLine1}-${index}`} value={index}>
                                            {savedAddress.fullName} - {savedAddress.addressLine1}, {savedAddress.city}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

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
                                    onChange={(e) => handlePincodeChange(e.target.value)}
                                    inputMode="numeric"
                                    maxLength={6}
                                    required
                                />
                                {pincodeLoading ? <small>Fetching city/state from PIN code...</small> : null}
                                {pincodeError ? <small style={{ color: 'var(--error)' }}>{pincodeError}</small> : null}
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Starting Payment...' : 'Pay Securely'}
                        </button>
                    </form>

                    <div className={styles.orderSummary}>
                        <h2>Order Summary</h2>
                        <div className={styles.items}>
                            {items.map((item) => (
                                <div key={item.productId} className={styles.summaryItem}>
                                    <img src={item.image || '/placeholder-jewelry.svg'} alt={item.title} />
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
