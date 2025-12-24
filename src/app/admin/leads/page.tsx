'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import styles from '../orders/page.module.css';

const LEAD_STATUSES = ['pending', 'contacted', 'interested', 'sold', 'cancelled'];

export default function AdminLeadsPage() {
    const router = useRouter();
    const { isAdmin, loading: authLoading } = useAuth();

    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/login');
        }
    }, [authLoading, isAdmin]);

    useEffect(() => {
        if (isAdmin) {
            fetchLeads();
        }
    }, [isAdmin, filter]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params: any = { limit: 50 };
            if (filter) params.status = filter;
            const data = await api.getLeads(params);
            setLeads(data.leads);
        } catch (err) {
            console.error('Failed to fetch leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.updateLead(id, { status });
            fetchLeads();
        } catch (err) {
            console.error('Failed to update lead:', err);
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
                <h1>Leads</h1>
                <select
                    className="input"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="">All Leads</option>
                    {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>
            </div>

            <div className={styles.table}>
                <div className={styles.tableHeader} style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
                    <span>Customer</span>
                    <span>Phone</span>
                    <span>Product</span>
                    <span>Date</span>
                    <span>Status</span>
                </div>
                {leads.length === 0 ? (
                    <div className={styles.empty}>No leads found</div>
                ) : (
                    leads.map((lead) => (
                        <div key={lead._id} className={styles.tableRow} style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
                            <span className={styles.orderNumber}>{lead.customerName}</span>
                            <span>{lead.customerPhone}</span>
                            <span>{lead.productTitle || 'General Inquiry'}</span>
                            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                            <span>
                                <select
                                    className="input"
                                    value={lead.status}
                                    onChange={(e) => updateStatus(lead._id, e.target.value)}
                                    style={{ padding: '8px', fontSize: '0.85rem' }}
                                >
                                    {LEAD_STATUSES.map((s) => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                    ))}
                                </select>
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
