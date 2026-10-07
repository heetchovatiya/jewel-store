'use client';

import React, { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { OrderTrackingResponse } from '@/types/commerce';
import styles from './ShipmentTracking.module.css';

/** Blue Dart tracking timeline for one order (customer "My Orders" and admin). */
export default function ShipmentTracking({ orderId, admin = false }: { orderId: string; admin?: boolean }) {
    const [data, setData] = useState<OrderTrackingResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(admin ? await api.getAdminOrderTracking(orderId) : await api.getOrderTracking(orderId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load tracking');
        } finally {
            setLoading(false);
        }
    }, [orderId, admin]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <p className={styles.muted}>Loading tracking…</p>;
    if (error) return <p className={styles.error}>{error}</p>;
    if (!data?.shipment) return null;

    const t = data.tracking;

    return (
        <div className={styles.wrap}>
            <div className={styles.head}>
                <div>
                    <span className={styles.label}>Blue Dart AWB</span>
                    <strong className={styles.awb}>{data.shipment.awbNo}</strong>
                </div>
                <a href={data.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Track on bluedart.com ↗
                </a>
            </div>

            {data.message && <p className={styles.muted}>{data.message}</p>}

            {t && !t.found && <p className={styles.muted}>Shipment booked. Tracking updates appear after pickup.</p>}

            {t && t.found && (
                <>
                    <p className={styles.status}>
                        <strong>{t.status}</strong>
                        {t.statusDate && <span> · {t.statusDate}{t.statusTime ? ` ${t.statusTime}` : ''}</span>}
                    </p>
                    {t.expectedDeliveryDate && t.statusType !== 'DL' && (
                        <p className={styles.muted}>Expected delivery: {t.expectedDeliveryDate}</p>
                    )}
                    {t.receivedBy && <p className={styles.muted}>Received by: {t.receivedBy}</p>}
                    {t.scans.length > 0 && (
                        <ol className={styles.timeline}>
                            {t.scans.map((s, i) => (
                                <li key={`${s.date}-${s.time}-${i}`}>
                                    <span className={styles.scan}>{s.scan}</span>
                                    <span className={styles.meta}>
                                        {[s.location, s.date, s.time].filter(Boolean).join(' · ')}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </>
            )}

            <button type="button" className={styles.refresh} onClick={load}>
                Refresh
            </button>
        </div>
    );
}
