'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import styles from './orders.module.css';

interface OrderItem {
    product: {
        _id: string;
        name: string;
        slug: string;
        images: string[];
    };
    quantity: number;
    price: number;
}

interface Order {
    _id: string;
    orderNumber: string;
    items: OrderItem[];
    total: number;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    shippingAddress: {
        fullName: string;
        addressLine1: string;
        city: string;
        state: string;
        pincode: string;
    };
    createdAt: string;
}

const statusColors: Record<string, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-primary',
    processing: 'badge-primary',
    shipped: 'badge-primary',
    delivered: 'badge-success',
    cancelled: 'badge-error',
};

const statusLabels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

export default function OrdersPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchOrders();
        }
    }, [isAuthenticated]);

    const fetchOrders = async () => {
        try {
            const data = await api.getOrders();
            setOrders(data.orders || []);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (authLoading || loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <a href="/account" className={styles.backLink}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Back to Account
                </a>
                <h1>My Orders</h1>
                <p className={styles.subtitle}>Track and manage your orders</p>
            </div>

            <div className={styles.content}>
                {orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                        </div>
                        <h2>No orders yet</h2>
                        <p>When you place an order, it will appear here.</p>
                        <a href="/products" className="btn btn-primary">
                            Start Shopping
                        </a>
                    </div>
                ) : (
                    <div className={styles.orderList}>
                        {orders.map((order) => (
                            <div key={order._id} className={styles.orderCard}>
                                <div
                                    className={styles.orderHeader}
                                    onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                                >
                                    <div className={styles.orderInfo}>
                                        <span className={styles.orderNumber}>Order #{order.orderNumber}</span>
                                        <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
                                    </div>
                                    <div className={styles.orderMeta}>
                                        <span className={`badge ${statusColors[order.status]}`}>
                                            {statusLabels[order.status]}
                                        </span>
                                        <span className={styles.orderTotal}>{formatCurrency(order.total)}</span>
                                        <svg
                                            className={`${styles.expandIcon} ${expandedOrder === order._id ? styles.expanded : ''}`}
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </div>
                                </div>

                                {expandedOrder === order._id && (
                                    <div className={styles.orderDetails}>
                                        <div className={styles.orderItems}>
                                            <h3>Items</h3>
                                            {order.items.map((item, index) => (
                                                <div key={index} className={styles.orderItem}>
                                                    <div className={styles.itemImage}>
                                                        {item.product?.images?.[0] ? (
                                                            <img
                                                                src={item.product.images[0]}
                                                                alt={item.product.name}
                                                            />
                                                        ) : (
                                                            <div className={styles.noImage}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={styles.itemInfo}>
                                                        <span className={styles.itemName}>
                                                            {item.product?.name || 'Product unavailable'}
                                                        </span>
                                                        <span className={styles.itemMeta}>
                                                            Qty: {item.quantity} × {formatCurrency(item.price)}
                                                        </span>
                                                    </div>
                                                    <span className={styles.itemTotal}>
                                                        {formatCurrency(item.quantity * item.price)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className={styles.shippingInfo}>
                                            <h3>Shipping Address</h3>
                                            <p>{order.shippingAddress.fullName}</p>
                                            <p>{order.shippingAddress.addressLine1}</p>
                                            <p>
                                                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                                            </p>
                                        </div>

                                        <div className={styles.orderSummary}>
                                            <div className={styles.summaryRow}>
                                                <span>Items ({order.items.length})</span>
                                                <span>{formatCurrency(order.total)}</span>
                                            </div>
                                            <div className={styles.summaryRow}>
                                                <span>Shipping</span>
                                                <span className={styles.free}>Free</span>
                                            </div>
                                            <div className={`${styles.summaryRow} ${styles.total}`}>
                                                <span>Total</span>
                                                <span>{formatCurrency(order.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
