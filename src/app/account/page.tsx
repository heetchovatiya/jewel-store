'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import styles from './account.module.css';

export default function AccountPage() {
    const { user, isAuthenticated, loading, refreshUser } = useAuth();
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
            });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.updateProfile(formData);
            await refreshUser();
            setEditing(false);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
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
                <h1>My Account</h1>
                <p className={styles.subtitle}>Manage your profile and preferences</p>
            </div>

            <div className={styles.content}>
                {/* Profile Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2>Profile Information</h2>
                        {!editing && (
                            <button
                                className={styles.editBtn}
                                onClick={() => setEditing(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
                            </button>
                        )}
                    </div>

                    {message.text && (
                        <div className={`${styles.message} ${styles[message.type]}`}>
                            {message.text}
                        </div>
                    )}

                    {editing ? (
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className="label">Full Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    value={user?.email || ''}
                                    disabled
                                />
                                <span className={styles.hint}>Email cannot be changed</span>
                            </div>

                            <div className={styles.formGroup}>
                                <label className="label">Phone Number</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 9876543210"
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setEditing(false);
                                        setFormData({
                                            name: user?.name || '',
                                            phone: user?.phone || '',
                                        });
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className={styles.profileInfo}>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Name</span>
                                <span className={styles.infoValue}>{user?.name}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Email</span>
                                <span className={styles.infoValue}>{user?.email}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Phone</span>
                                <span className={styles.infoValue}>{user?.phone || 'Not provided'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Account Type</span>
                                <span className={`badge ${user?.role === 'admin' || user?.role === 'super_admin' ? 'badge-primary' : 'badge-success'}`}>
                                    {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Customer'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2>Quick Links</h2>
                    </div>
                    <div className={styles.quickLinks}>
                        <a href="/account/orders" className={styles.quickLink}>
                            <div className={styles.quickLinkIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                </svg>
                            </div>
                            <div className={styles.quickLinkText}>
                                <span className={styles.quickLinkTitle}>My Orders</span>
                                <span className={styles.quickLinkDesc}>View order history and track deliveries</span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </a>
                        <a href="/cart" className={styles.quickLink}>
                            <div className={styles.quickLinkIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                            </div>
                            <div className={styles.quickLinkText}>
                                <span className={styles.quickLinkTitle}>Shopping Cart</span>
                                <span className={styles.quickLinkDesc}>View and manage your cart items</span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </a>
                        <a href="/products" className={styles.quickLink}>
                            <div className={styles.quickLinkIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                                </svg>
                            </div>
                            <div className={styles.quickLinkText}>
                                <span className={styles.quickLinkTitle}>Browse Products</span>
                                <span className={styles.quickLinkDesc}>Explore our jewelry collection</span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Saved Addresses */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2>Saved Addresses</h2>
                    </div>
                    {user?.addresses && user.addresses.length > 0 ? (
                        <div className={styles.addressList}>
                            {user.addresses.map((address: any, index: number) => (
                                <div key={index} className={styles.addressCard}>
                                    {address.isDefault && (
                                        <span className="badge badge-primary">Default</span>
                                    )}
                                    <p className={styles.addressName}>{address.fullName}</p>
                                    <p className={styles.addressText}>
                                        {address.addressLine1}
                                        {address.addressLine2 && `, ${address.addressLine2}`}
                                    </p>
                                    <p className={styles.addressText}>
                                        {address.city}, {address.state} - {address.pincode}
                                    </p>
                                    <p className={styles.addressPhone}>📞 {address.phone}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>No addresses saved yet.</p>
                            <p className={styles.hint}>Addresses will be saved when you place an order.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
