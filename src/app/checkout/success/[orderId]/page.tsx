'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

const MAX_ATTEMPTS = 10;
const POLL_MS = 2000;

export default function CheckoutSuccessPage() {
    const params = useParams<{ orderId: string }>();
    const orderId = params?.orderId;

    const [status, setStatus] = useState<'loading' | 'success' | 'fallback'>('loading');
    const [message, setMessage] = useState('Verifying your payment...');

    useEffect(() => {
        let active = true;
        let attempts = 0;

        const poll = async () => {
            while (active && attempts < MAX_ATTEMPTS) {
                attempts += 1;
                try {
                    const order = await api.pollOrderStatus(orderId);
                    if (order.status === 'confirmed' || order.status === 'pending') {
                        if (!active) return;
                        setStatus('success');
                        setMessage('Payment verified successfully.');
                        return;
                    }
                } catch {
                    // Continue polling while webhook updates order in background.
                }

                await new Promise((resolve) => setTimeout(resolve, POLL_MS));
            }

            if (active) {
                setStatus('fallback');
                setMessage('We are still waiting for confirmation from Razorpay.');
            }
        };

        if (orderId) {
            poll();
        }

        return () => {
            active = false;
        };
    }, [orderId]);

    return (
        <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
            <div style={{ maxWidth: '640px', textAlign: 'center' }}>
                {status === 'loading' && (
                    <>
                        <h1>Verifying your payment...</h1>
                        <p>{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <h1>Payment Confirmed</h1>
                        <p>Your order has been placed successfully.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                            <Link href="/account/orders" className="btn btn-primary">View Orders</Link>
                            <Link href="/products" className="btn btn-secondary">Continue Shopping</Link>
                        </div>
                    </>
                )}

                {status === 'fallback' && (
                    <>
                        <h1>Verification In Progress</h1>
                        <p>{message}</p>
                        <p>If this does not update soon, please contact support with your order ID.</p>
                        <p style={{ marginTop: '0.75rem', opacity: 0.8 }}><strong>Order ID:</strong> {orderId}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                            <Link href="/account/orders" className="btn btn-primary">Check Orders</Link>
                            <Link href="/products" className="btn btn-secondary">Continue Shopping</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
