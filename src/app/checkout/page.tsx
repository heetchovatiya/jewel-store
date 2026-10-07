'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getPublicUrl } from '@/lib/upload';
import { checkDelivery, formatEta, savePincode } from '@/lib/delivery';
import type { PincodeServiceability } from '@/types/commerce';
import styles from './page.module.css';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function CheckoutPage() {
    const router = useRouter();
    const { formatPrice } = useTheme();
    const { items, total, clearCart, ready: cartReady } = useCart();
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
    const [pincodeLoading, setPincodeLoading] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const lastPincodeLookupRef = useRef('');
    const prefilledRef = useRef(false);
    const placingOrderRef = useRef(false);
    const [delivery, setDelivery] = useState<PincodeServiceability | null>(null);
    const [deliveryLoading, setDeliveryLoading] = useState(false);

    const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');

    const [address, setAddress] = useState({
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
    });

    // Login is required only here. Wait until auth + cart (incl. guest-cart merge) are loaded.
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.replace('/login?redirect=%2Fcheckout');
            return;
        }
        if (cartReady && items.length === 0 && !placingOrderRef.current) {
            router.push('/cart');
        }
    }, [authLoading, isAuthenticated, cartReady, items.length, router]);

    // Pre-fill with the default saved address once (don't overwrite what the user types)
    useEffect(() => {
        if (!user || prefilledRef.current) return;
        prefilledRef.current = true;
        if (user.addresses?.length) {
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
                fullName: user.name || prev.fullName,
                phone: user.phone || prev.phone,
            }));
        }
    }, [user]);

    // Blue Dart delivery check whenever a full PIN code is present
    useEffect(() => {
        const pin = address.pincode;
        if (!/^\d{6}$/.test(pin)) {
            setDelivery(null);
            return;
        }
        let cancelled = false;
        setDeliveryLoading(true);
        checkDelivery(pin)
            .then((r) => {
                if (cancelled) return;
                setDelivery(r);
                savePincode(pin);
                if (r.checked && !r.codAvailable) setPaymentMethod('online');
            })
            .catch(() => {
                if (!cancelled) setDelivery(null); // server re-checks when the order is placed
            })
            .finally(() => {
                if (!cancelled) setDeliveryLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [address.pincode]);

    const notDeliverable = !!delivery && delivery.checked && !delivery.serviceable;
    const codBlocked = !!delivery && delivery.checked && !delivery.codAvailable;
    const eta = formatEta(delivery?.estimatedDeliveryDate);

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

    const handleCodOrder = async () => {
        placingOrderRef.current = true;
        const order = await api.placeCodOrder(address);
        await clearCart();
        router.push('/account/orders');
    };

    const handleOnlinePayment = async () => {
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
                    await api.verifyPayment({
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                    });

                    placingOrderRef.current = true;
                    await clearCart();
                    router.push('/account/orders');
                } catch (verifyError: any) {
                    setError(verifyError.message || 'Payment verification failed. Please contact support.');
                    setLoading(false);
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (notDeliverable) {
            setError(`Sorry, we can't deliver to PIN code ${address.pincode} yet. Please use a different address.`);
            return;
        }
        if (paymentMethod === 'cod' && codBlocked) {
            setError('Cash on Delivery is not available for this PIN code. Please pay online.');
            return;
        }
        setLoading(true);

        try {
            if (paymentMethod === 'cod') {
                await handleCodOrder();
            } else {
                await handleOnlinePayment();
            }
        } catch (err: any) {
            placingOrderRef.current = false;
            setError(err.message || 'Failed to place order');
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
                                <label htmlFor="saved-address" className="label">Saved Addresses</label>
                                <select
                                    id="saved-address"
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
                                {deliveryLoading ? <small>Checking Blue Dart delivery…</small> : null}
                                {!deliveryLoading && notDeliverable ? (
                                    <small style={{ color: 'var(--error)' }}>Sorry, we don&apos;t deliver to this PIN code yet.</small>
                                ) : null}
                                {!deliveryLoading && delivery?.checked && delivery.serviceable ? (
                                    <small style={{ color: 'var(--success)' }}>
                                        ✓ Delivers via Blue Dart{eta ? ` by ${eta}` : ''}
                                    </small>
                                ) : null}
                            </div>
                        </div>

                        <div className={styles.paymentSection}>
                            <h2>Payment Method</h2>
                            <div className={styles.paymentOptions}>
                                <label className={`${styles.paymentOption} ${paymentMethod === 'online' ? styles.paymentOptionActive : ''}`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="online"
                                        checked={paymentMethod === 'online'}
                                        onChange={() => setPaymentMethod('online')}
                                    />
                                    <div>
                                        <span className={styles.paymentLabel}>Pay Online</span>
                                        <span className={styles.paymentHint}>UPI, cards, net banking via Razorpay</span>
                                    </div>
                                </label>
                                <label
                                    className={`${styles.paymentOption} ${paymentMethod === 'cod' ? styles.paymentOptionActive : ''}`}
                                    style={codBlocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        disabled={codBlocked}
                                        onChange={() => setPaymentMethod('cod')}
                                    />
                                    <div>
                                        <span className={styles.paymentLabel}>Cash on Delivery</span>
                                        <span className={styles.paymentHint}>
                                            {codBlocked ? 'Not available for this PIN code' : 'Pay when your order arrives'}
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading || notDeliverable}>
                            {loading
                                ? paymentMethod === 'cod' ? 'Placing Order...' : 'Starting Payment...'
                                : paymentMethod === 'cod' ? 'Place Order' : 'Pay Securely'}
                        </button>
                    </form>

                    <div className={styles.orderSummary}>
                        <h2>Order Summary</h2>
                        <div className={styles.items}>
                            {items.map((item) => (
                                <div key={item.lineId} className={styles.summaryItem}>
                                    <img src={getPublicUrl(item.image) || '/placeholder-jewelry.svg'} alt={item.title} />
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
                                <span>Shipping{eta ? ` (Blue Dart, by ${eta})` : ''}</span>
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
