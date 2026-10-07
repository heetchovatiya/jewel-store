'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import ShipmentTracking from '@/components/ShipmentTracking';
import type { OrderShipment } from '@/types/commerce';
import styles from './BluedartShipmentPanel.module.css';

type Capabilities = { mock: boolean; waybill: boolean; tracking: boolean } | null;

/** The fields of an admin order this panel uses. */
export interface ShipmentPanelOrder {
    _id: string;
    status: string;
    paymentMethod?: string;
    total: number;
    shipment?: OrderShipment;
}

const SHIPPABLE = ['pending', 'confirmed', 'processing', 'shipped'];

/** Admin: create / cancel a Blue Dart waybill, download the label, see tracking. */
export default function BluedartShipmentPanel({
    order,
    capabilities,
    onChanged,
}: {
    order: ShipmentPanelOrder;
    capabilities: Capabilities;
    onChanged: (order: ShipmentPanelOrder) => void;
}) {
    const [weightKg, setWeightKg] = useState('');
    const [pieces, setPieces] = useState('1');
    const [pickupDate, setPickupDate] = useState('');
    const [registerPickup, setRegisterPickup] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [confirmCancel, setConfirmCancel] = useState(false);

    const shipment = order.shipment;
    const active = !!shipment?.awbNo && shipment.status !== 'cancelled';

    const create = async () => {
        setBusy(true);
        setError('');
        try {
            const updated = await api.createWaybill(order._id, {
                ...(weightKg ? { weightKg: Number(weightKg) } : {}),
                ...(pieces ? { pieces: Number(pieces) } : {}),
                ...(pickupDate ? { pickupDate } : {}),
                registerPickup,
            });
            onChanged(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create waybill');
        } finally {
            setBusy(false);
        }
    };

    const cancel = async () => {
        if (!confirmCancel) {
            setConfirmCancel(true);
            return;
        }
        setBusy(true);
        setError('');
        try {
            onChanged(await api.cancelWaybill(order._id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not cancel waybill');
        } finally {
            setBusy(false);
            setConfirmCancel(false);
        }
    };

    const downloadLabel = async () => {
        setError('');
        try {
            const { blob, filename } = await api.downloadShippingLabel(order._id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Label not available');
        }
    };

    return (
        <div className={styles.panel}>
            <h3>
                Blue Dart Shipment
                {capabilities?.mock && <span className={styles.mock}>MOCK MODE</span>}
            </h3>

            {error && <p className={styles.error}>{error}</p>}

            {active ? (
                <>
                    <dl className={styles.facts}>
                        <dt>AWB</dt><dd className={styles.mono}>{shipment.awbNo}</dd>
                        {shipment.destinationLocation && (<><dt>Destination</dt><dd>{shipment.destinationLocation} ({shipment.destinationArea})</dd></>)}
                        {shipment.weightKg && (<><dt>Weight</dt><dd>{shipment.weightKg} kg · {shipment.pieces || 1} pc</dd></>)}
                        {shipment.pickupDate && (<><dt>Pickup</dt><dd>{new Date(shipment.pickupDate).toLocaleDateString('en-IN')}{shipment.pickupRegistered ? ' (pickup booked)' : ''}</dd></>)}
                    </dl>
                    <div className={styles.actions}>
                        {shipment.hasLabel && (
                            <button type="button" className="btn btn-primary" onClick={downloadLabel} disabled={busy}>
                                Download label
                            </button>
                        )}
                        <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy}>
                            {confirmCancel ? 'Click again to cancel AWB' : 'Cancel waybill'}
                        </button>
                    </div>
                    <ShipmentTracking orderId={order._id} admin />
                </>
            ) : !SHIPPABLE.includes(order.status) ? (
                <p className={styles.muted}>Waybills can be created for pending, confirmed or processing orders.</p>
            ) : capabilities && !capabilities.waybill ? (
                <p className={styles.muted}>
                    Blue Dart is not fully configured. Fill in the BLUEDART_* values in the backend .env and restart the API.
                </p>
            ) : (
                <>
                    {shipment?.status === 'cancelled' && (
                        <p className={styles.muted}>Previous AWB {shipment.awbNo} was cancelled.</p>
                    )}
                    <div className={styles.form}>
                        <label>
                            Weight (kg)
                            <input className="input" type="number" step="0.01" min="0.05" placeholder="0.5" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                        </label>
                        <label>
                            Pieces
                            <input className="input" type="number" min="1" max="20" value={pieces} onChange={(e) => setPieces(e.target.value)} />
                        </label>
                        <label>
                            Pickup date
                            <input className="input" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                        </label>
                        <label className={styles.check}>
                            <input type="checkbox" checked={registerPickup} onChange={(e) => setRegisterPickup(e.target.checked)} />
                            Book Blue Dart pickup too
                        </label>
                    </div>
                    <p className={styles.muted}>
                        {order.paymentMethod === 'cod'
                            ? `COD shipment. Blue Dart will collect ₹${Math.round(order.total).toLocaleString('en-IN')}.`
                            : 'Prepaid shipment.'}{' '}
                        Declared value ₹{Math.round(order.total).toLocaleString('en-IN')}.
                    </p>
                    <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
                        {busy ? 'Creating…' : 'Create Blue Dart waybill'}
                    </button>
                </>
            )}
        </div>
    );
}
