'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { AdminUser, UserRole } from '@/types/commerce';
import styles from './page.module.css';

const FILTERS: { value: string; label: string }[] = [
    { value: 'staff', label: 'Admins' },
    { value: 'customer', label: 'Customers' },
    { value: '', label: 'Everyone' },
];

const ROLE_LABEL: Record<UserRole, string> = {
    customer: 'Customer',
    admin: 'Admin',
    super_admin: 'Super admin',
};

const ROLE_BADGE: Record<UserRole, string> = {
    customer: '',
    admin: 'badge-primary',
    super_admin: 'badge-warning',
};

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
    const router = useRouter();
    const { user, isAdmin, loading: authLoading } = useAuth();
    const isSuper = user?.role === 'super_admin';

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('staff');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    // Two-click confirm: { userId, role } waiting for the second click
    const [pending, setPending] = useState<{ id: string; role: UserRole } | null>(null);

    useEffect(() => {
        if (!authLoading && !isAdmin) router.push('/login?redirect=%2Fadmin%2Fusers');
    }, [authLoading, isAdmin, router]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getAdminUsers({ role: filter || undefined, search: query || undefined, page, limit: PAGE_SIZE });
            setUsers(data.users);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load users');
        } finally {
            setLoading(false);
        }
    }, [filter, query, page]);

    useEffect(() => {
        if (isAdmin) load();
    }, [isAdmin, load]);

    // Debounce the search box
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            setQuery(search.trim());
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const changeRole = async (target: AdminUser, role: UserRole) => {
        if (!pending || pending.id !== target._id || pending.role !== role) {
            setPending({ id: target._id, role });
            setNotice('');
            return;
        }
        setPending(null);
        setBusyId(target._id);
        setError('');
        try {
            const updated = await api.updateUserRole(target._id, role);
            setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
            setNotice(`${updated.name || updated.email} is now ${ROLE_LABEL[updated.role].toLowerCase()}.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not change role');
        } finally {
            setBusyId(null);
        }
    };

    const actionsFor = (u: AdminUser): { role: UserRole; label: string; danger?: boolean }[] => {
        if (u._id === user?._id) return [];
        if (u.role === 'super_admin' && !isSuper) return [];
        const out: { role: UserRole; label: string; danger?: boolean }[] = [];
        if (u.role === 'customer') out.push({ role: 'admin', label: 'Make admin' });
        if (isSuper && u.role !== 'super_admin') out.push({ role: 'super_admin', label: 'Make super admin' });
        if (u.role === 'super_admin') out.push({ role: 'admin', label: 'Make regular admin', danger: true });
        if (u.role !== 'customer') out.push({ role: 'customer', label: 'Remove admin access', danger: true });
        return out;
    };

    if (authLoading || !isAdmin) {
        return (
            <div className={styles.loadingPage}>
                <div className="spinner" />
            </div>
        );
    }

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className={styles.page}>
            <Link href="/admin" className={styles.backLink}>← Back to dashboard</Link>
            <div className={styles.header}>
                <div>
                    <h1>Users &amp; roles</h1>
                    <p className={styles.subtitle}>
                        Give or remove admin access. People must first create an account on the store.
                        {!isSuper && ' Only a super admin can manage super admins.'}
                    </p>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.tabs} role="tablist">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value || 'all'}
                            type="button"
                            role="tab"
                            aria-selected={filter === f.value}
                            className={`${styles.tab} ${filter === f.value ? styles.tabActive : ''}`}
                            onClick={() => {
                                setFilter(f.value);
                                setPage(1);
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <input
                    className="input"
                    type="search"
                    placeholder="Search name, email or phone"
                    aria-label="Search users"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}
            {notice && <p className={styles.notice} role="status">{notice}</p>}

            <div className={styles.table}>
                <div className={styles.tableHeader}>
                    <span>Name</span>
                    <span>Contact</span>
                    <span>Joined</span>
                    <span>Role</span>
                    <span className={styles.right}>Actions</span>
                </div>

                {loading ? (
                    <div className={styles.empty}><div className="spinner" /></div>
                ) : users.length === 0 ? (
                    <div className={styles.empty}>No users found</div>
                ) : (
                    users.map((u) => {
                        const actions = actionsFor(u);
                        const isMe = u._id === user?._id;
                        return (
                            <div key={u._id} className={styles.row}>
                                <span className={styles.name}>
                                    {u.name || '—'}
                                    {isMe && <span className={styles.you}>you</span>}
                                </span>
                                <span className={styles.contact}>
                                    <span>{u.email}</span>
                                    {u.phone && <small>{u.phone}</small>}
                                </span>
                                <span className={styles.muted}>
                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                                </span>
                                <span>
                                    <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                                    {u.roleChangedAt && (
                                        <small className={styles.changed}>
                                            changed {new Date(u.roleChangedAt).toLocaleDateString('en-IN')}
                                        </small>
                                    )}
                                </span>
                                <span className={styles.actions}>
                                    {actions.length === 0 && (
                                        <small className={styles.muted}>{isMe ? 'Your account' : 'No access to change'}</small>
                                    )}
                                    {actions.map((a) => {
                                        const confirming = pending?.id === u._id && pending.role === a.role;
                                        return (
                                            <button
                                                key={a.role}
                                                type="button"
                                                className={`btn ${confirming ? 'btn-primary' : 'btn-ghost'} ${a.danger ? styles.danger : ''}`}
                                                disabled={busyId === u._id}
                                                onClick={() => changeRole(u, a.role)}
                                            >
                                                {busyId === u._id ? 'Saving…' : confirming ? 'Click to confirm' : a.label}
                                            </button>
                                        );
                                    })}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            {pages > 1 && (
                <div className={styles.pager}>
                    <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Previous
                    </button>
                    <span className={styles.muted}>Page {page} of {pages} · {total} users</span>
                    <button type="button" className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
