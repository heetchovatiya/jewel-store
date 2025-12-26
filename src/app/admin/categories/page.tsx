'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import styles from './page.module.css';

interface Category {
    name: string;
    slug: string;
    showInNavbar: boolean;
    order: number;
    image?: string;
}

export default function AdminCategoriesPage() {
    const router = useRouter();
    const { isAdmin, loading: authLoading } = useAuth();
    const { refreshConfig } = useTheme();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', image: '' });

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/login');
        }
    }, [authLoading, isAdmin, router]);

    useEffect(() => {
        if (isAdmin) {
            fetchCategories();
        }
    }, [isAdmin]);

    const fetchCategories = async () => {
        try {
            const config = await api.getConfig();
            setCategories(config.categories || []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    const addCategory = () => {
        if (!newCategory.name.trim()) return;

        const slug = generateSlug(newCategory.name);
        const exists = categories.some(c => c.slug === slug);
        if (exists) {
            setMessage({ type: 'error', text: 'A category with this name already exists.' });
            return;
        }

        setCategories([
            ...categories,
            {
                name: newCategory.name.trim(),
                slug,
                showInNavbar: false,
                order: categories.length,
                image: newCategory.image.trim() || undefined,
            },
        ]);
        setNewCategory({ name: '', image: '' });
        setShowAddModal(false);
        setMessage({ type: '', text: '' });
    };

    const removeCategory = (slug: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        setCategories(categories.filter(c => c.slug !== slug));
    };

    const toggleNavbar = (slug: string) => {
        setCategories(categories.map(c =>
            c.slug === slug ? { ...c, showInNavbar: !c.showInNavbar } : c
        ));
    };

    const moveCategory = (index: number, direction: 'up' | 'down') => {
        const newCategories = [...categories];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex >= 0 && newIndex < newCategories.length) {
            [newCategories[index], newCategories[newIndex]] = [newCategories[newIndex], newCategories[index]];
            // Update order values
            newCategories.forEach((c, i) => c.order = i);
            setCategories(newCategories);
        }
    };

    const saveCategories = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.updateConfig({ categories });
            await refreshConfig();
            setMessage({ type: 'success', text: 'Categories saved successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to save categories' });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className={styles.loadingPage}>
                <div className="spinner" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className={styles.categoriesPage}>
            <div className={styles.header}>
                <div>
                    <Link href="/admin" className={styles.backLink}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Back to Dashboard
                    </Link>
                    <h1>Category Management</h1>
                    <p className={styles.subtitle}>Manage product categories and customize which ones appear in the navbar</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Category
                </button>
            </div>

            {message.text && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.infoBox}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <p>
                    <strong>Show in Navbar:</strong> Categories with this enabled will appear as direct links in the navigation bar.
                    Other categories will be grouped under a "Collections" dropdown.
                </p>
            </div>

            <div className={styles.categoryList}>
                {categories.length === 0 ? (
                    <div className={styles.emptyState}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p>No categories yet. Add your first category to get started.</p>
                    </div>
                ) : (
                    categories.map((category, index) => (
                        <div key={category.slug} className={styles.categoryCard}>
                            <div className={styles.categoryOrder}>
                                <button
                                    className={styles.orderBtn}
                                    onClick={() => moveCategory(index, 'up')}
                                    disabled={index === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="18 15 12 9 6 15"></polyline>
                                    </svg>
                                </button>
                                <span className={styles.orderNumber}>{index + 1}</span>
                                <button
                                    className={styles.orderBtn}
                                    onClick={() => moveCategory(index, 'down')}
                                    disabled={index === categories.length - 1}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                            </div>

                            <div className={styles.categoryInfo}>
                                <span className={styles.categoryName}>{category.name}</span>
                                <span className={styles.categorySlug}>/{category.slug}</span>
                            </div>

                            <div className={styles.categoryToggle}>
                                <label className={styles.toggleLabel}>
                                    <span>Show in Navbar</span>
                                    <div className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={category.showInNavbar}
                                            onChange={() => toggleNavbar(category.slug)}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </div>
                                </label>
                            </div>

                            <button
                                className={styles.deleteBtn}
                                onClick={() => removeCategory(category.slug)}
                                title="Delete category"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className={styles.actions}>
                <button
                    className="btn btn-primary"
                    onClick={saveCategories}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Add Category Modal */}
            {showAddModal && (
                <div className={styles.modal} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Category</h2>
                        <div className={styles.formGroup}>
                            <label className="label">Category Name</label>
                            <input
                                type="text"
                                className="input"
                                value={newCategory.name}
                                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                placeholder="e.g., Bangles, Anklets, Watches..."
                                autoFocus
                            />
                            {newCategory.name && (
                                <span className={styles.slugPreview}>
                                    URL: /products?category={generateSlug(newCategory.name)}
                                </span>
                            )}
                        </div>
                        <div className={styles.formGroup}>
                            <label className="label">Category Image URL (Optional)</label>
                            <input
                                type="url"
                                className="input"
                                value={newCategory.image}
                                onChange={(e) => setNewCategory({ ...newCategory, image: e.target.value })}
                                placeholder="https://jewelstore.sgp1.digitaloceanspaces.com/categories/{slug}.jpg"
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={addCategory}>
                                Add Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
