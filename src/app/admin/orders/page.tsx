'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import styles from './page.module.css';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
    const router = useRouter();
    const { isAdmin, loading: authLoading } = useAuth();
    const { formatPrice } = useTheme();

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/login');
        }
    }, [authLoading, isAdmin]);

    useEffect(() => {
        if (isAdmin) {
            fetchOrders();
        }
    }, [isAdmin, filter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params: any = { limit: 50 };
            if (filter) params.status = filter;
            const data = await api.getAdminOrders(params);
            setOrders(data.orders);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, status: string) => {
        try {
            await api.updateOrderStatus(orderId, status);
            fetchOrders();
            setSelectedOrder(null);
        } catch (err) {
            console.error('Failed to update order:', err);
        }
    };

    if (authLoading || loading) {
        return (
            <div className={styles.loadingPage}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className={styles.ordersPage}>
            <div className={styles.header}>
                <h1>Orders</h1>
                <select
                    className="input"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="">All Orders</option>
                    {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>
            </div>

            <div className={styles.table}>
                <div className={styles.tableHeader}>
                    <span>Order #</span>
                    <span>Date</span>
                    <span>Customer</span>
                    <span>Items</span>
                    <span>Total</span>
                    <span>Status</span>
                    <span>Action</span>
                </div>
                {orders.length === 0 ? (
                    <div className={styles.empty}>No orders found</div>
                ) : (
                    orders.map((order) => (
                        <div key={order._id} className={styles.tableRow}>
                            <span className={styles.orderNumber}>{order.orderNumber}</span>
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                            <span>{order.shippingAddress?.fullName || 'N/A'}</span>
                            <span>{order.items?.length || 0} items</span>
                            <span className={styles.total}>{formatPrice(order.total)}</span>
                            <span>
                                <span className={`badge badge-${order.status === 'pending' ? 'warning' : order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'primary'}`}>
                                    {order.status}
                                </span>
                            </span>
                            <span>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => setSelectedOrder(order)}
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                >
                                    View
                                </button>
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className={styles.modal} onClick={() => setSelectedOrder(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2>Order {selectedOrder.orderNumber}</h2>

                        <div className={styles.orderDetails}>
                            <div className={styles.detailSection}>
                                <h3>Shipping Address</h3>
                                <p>{selectedOrder.shippingAddress?.fullName}</p>
                                <p>{selectedOrder.shippingAddress?.phone}</p>
                                <p>{selectedOrder.shippingAddress?.addressLine1}</p>
                                {selectedOrder.shippingAddress?.addressLine2 && (
                                    <p>{selectedOrder.shippingAddress.addressLine2}</p>
                                )}
                                <p>
                                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                                </p>
                            </div>

                            <div className={styles.detailSection}>
                                <h3>Items</h3>
                                {selectedOrder.items?.map((item: any, idx: number) => (
                                    <div key={idx} className={styles.orderItem}>
                                        <span>{item.title} x {item.quantity}</span>
                                        <span>{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                                <div className={styles.orderTotal}>
                                    <span>Total</span>
                                    <span>{formatPrice(selectedOrder.total)}</span>
                                </div>
                            </div>

                            <div className={styles.detailSection}>
                                <h3>Update Status</h3>
                                <div className={styles.statusButtons}>
                                    {ORDER_STATUSES.map((s) => (
                                        <button
                                            key={s}
                                            className={`btn ${selectedOrder.status === s ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => updateStatus(selectedOrder._id, s)}
                                            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                                        >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
