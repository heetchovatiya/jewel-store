'use client';

import React, { useEffect, useState } from 'react';
import type { PincodeServiceability } from '@/types/commerce';
import { checkDelivery, formatEta, getSavedPincode, savePincode } from '@/lib/delivery';
import styles from './DeliveryCheck.module.css';

/** "Check delivery" box on the product page (Blue Dart serviceability + COD + ETA). */
export default function DeliveryCheck() {
    const [pincode, setPincode] = useState('');
    const [result, setResult] = useState<PincodeServiceability | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const run = async (pin: string) => {
        setError('');
        setResult(null);
        if (!/^\d{6}$/.test(pin)) {
            setError('Enter a valid 6-digit PIN code');
            return;
        }
        setLoading(true);
        try {
            const r = await checkDelivery(pin);
            setResult(r);
            savePincode(pin);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not check delivery right now');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const saved = getSavedPincode();
        if (/^\d{6}$/.test(saved)) {
            setPincode(saved);
            run(saved);
        }
    }, []);

    const eta = formatEta(result?.estimatedDeliveryDate);

    return (
        <div className={styles.box}>
            <h4 className={styles.title}>Check delivery</h4>
            <form
                className={styles.row}
                onSubmit={(e) => {
                    e.preventDefault();
                    run(pincode);
                }}
            >
                <input
                    className="input"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter PIN code"
                    aria-label="Delivery PIN code"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="submit" className="btn btn-ghost" disabled={loading}>
                    {loading ? 'Checking…' : 'Check'}
                </button>
            </form>

            {error && <p className={styles.bad}>{error}</p>}

            {result && result.checked && !result.serviceable && (
                <p className={styles.bad}>
                    Sorry, we don&apos;t deliver to {result.pincode} yet.
                </p>
            )}

            {result && result.checked && result.serviceable && (
                <ul className={styles.list}>
                    <li className={styles.good}>✓ Delivery available to {result.pincode} via Blue Dart</li>
                    {eta && <li>Estimated delivery by <strong>{eta}</strong></li>}
                    <li className={result.codAvailable ? styles.good : styles.muted}>
                        {result.codAvailable ? '✓ Cash on Delivery available' : 'Cash on Delivery not available, pay online'}
                    </li>
                </ul>
            )}

            {result && !result.checked && (
                <p className={styles.muted}>We&apos;ll confirm delivery for {result.pincode} at checkout.</p>
            )}
        </div>
    );
}
