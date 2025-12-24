'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import styles from './page.module.css';

export default function AdminSettingsPage() {
    const router = useRouter();
    const { isAdmin, loading: authLoading } = useAuth();
    const { refreshConfig } = useTheme();

    const [config, setConfig] = useState({
        storeName: '',
        storeDescription: '',
        logoUrl: '',
        primaryColor: '#d4af37',
        secondaryColor: '#1a1a2e',
        backgroundColor: '#0f0f1a',
        textColor: '#ffffff',
        contactEmail: '',
        contactPhone: '',
        address: '',
        heroBanners: [] as string[],
        aboutUs: {
            enabled: false,
            title: 'Our Story',
            description: '',
            images: [] as string[],
        },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [newBanner, setNewBanner] = useState('');
    const [newAboutImage, setNewAboutImage] = useState('');

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/login');
        }
    }, [authLoading, isAdmin]);

    useEffect(() => {
        if (isAdmin) {
            fetchConfig();
        }
    }, [isAdmin]);

    const fetchConfig = async () => {
        try {
            const data = await api.getConfig();
            setConfig({
                ...config,
                ...data,
                heroBanners: data.heroBanners || [],
                aboutUs: data.aboutUs || {
                    enabled: false,
                    title: 'Our Story',
                    description: '',
                    images: [],
                },
            });
        } catch (err) {
            console.error('Failed to fetch config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            await api.updateConfig(config);
            await refreshConfig();
            setMessage('Settings saved successfully!');
        } catch (err: any) {
            setMessage(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const addBanner = () => {
        if (newBanner.trim()) {
            setConfig({
                ...config,
                heroBanners: [...config.heroBanners, newBanner.trim()],
            });
            setNewBanner('');
        }
    };

    const removeBanner = (index: number) => {
        setConfig({
            ...config,
            heroBanners: config.heroBanners.filter((_, i) => i !== index),
        });
    };

    const moveBanner = (index: number, direction: 'up' | 'down') => {
        const banners = [...config.heroBanners];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex >= 0 && newIndex < banners.length) {
            [banners[index], banners[newIndex]] = [banners[newIndex], banners[index]];
            setConfig({ ...config, heroBanners: banners });
        }
    };

    // About Us image handlers
    const addAboutImage = () => {
        if (newAboutImage.trim() && config.aboutUs.images.length < 2) {
            setConfig({
                ...config,
                aboutUs: {
                    ...config.aboutUs,
                    images: [...config.aboutUs.images, newAboutImage.trim()],
                },
            });
            setNewAboutImage('');
        }
    };

    const removeAboutImage = (index: number) => {
        setConfig({
            ...config,
            aboutUs: {
                ...config.aboutUs,
                images: config.aboutUs.images.filter((_, i) => i !== index),
            },
        });
    };

    if (authLoading || loading) {
        return (
            <div className={styles.loadingPage}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className={styles.settings}>
            <div className={styles.header}>
                <h1>Store Settings</h1>
                <p>Customize your store branding and contact information</p>
            </div>

            {message && (
                <div className={`${styles.message} ${message.includes('success') ? styles.success : styles.error}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSave} className={styles.form}>
                <section className={styles.section}>
                    <h2>Store Information</h2>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className="label">Store Name</label>
                            <input
                                type="text"
                                className="input"
                                value={config.storeName}
                                onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className="label">Logo URL</label>
                            <input
                                type="url"
                                className="input"
                                value={config.logoUrl}
                                onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">Store Description</label>
                        <textarea
                            className="input"
                            rows={3}
                            value={config.storeDescription}
                            onChange={(e) => setConfig({ ...config, storeDescription: e.target.value })}
                        />
                    </div>
                </section>

                {/* About Us Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2>About Us Section</h2>
                            <p className={styles.sectionDesc}>Display your store's story on the homepage</p>
                        </div>
                        <label className={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={config.aboutUs.enabled}
                                onChange={(e) => setConfig({
                                    ...config,
                                    aboutUs: { ...config.aboutUs, enabled: e.target.checked }
                                })}
                            />
                            <span className={styles.toggleSlider}></span>
                            <span className={styles.toggleLabel}>
                                {config.aboutUs.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </label>
                    </div>

                    {config.aboutUs.enabled && (
                        <>
                            <div className={styles.formGroup}>
                                <label className="label">Section Title</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={config.aboutUs.title}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        aboutUs: { ...config.aboutUs, title: e.target.value }
                                    })}
                                    placeholder="Our Story"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className="label">Description / Story</label>
                                <textarea
                                    className="input"
                                    rows={5}
                                    value={config.aboutUs.description}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        aboutUs: { ...config.aboutUs, description: e.target.value }
                                    })}
                                    placeholder="Tell your customers about your store, your journey, and what makes your jewelry special..."
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className="label">Images (max 2)</label>
                                <p className={styles.hint}>Add up to 2 images to showcase your store or craftsmanship</p>

                                <div className={styles.aboutImageList}>
                                    {config.aboutUs.images.map((img, index) => (
                                        <div key={index} className={styles.aboutImageItem}>
                                            <img src={img} alt={`About ${index + 1}`} />
                                            <button
                                                type="button"
                                                className={styles.removeBtn}
                                                onClick={() => removeAboutImage(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {config.aboutUs.images.length < 2 && (
                                    <div className={styles.addBanner}>
                                        <input
                                            type="url"
                                            className="input"
                                            value={newAboutImage}
                                            onChange={(e) => setNewAboutImage(e.target.value)}
                                            placeholder="Enter image URL..."
                                        />
                                        <button type="button" className="btn btn-secondary" onClick={addAboutImage}>
                                            Add Image
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </section>

                {/* Hero Carousel Section */}
                <section className={styles.section}>
                    <h2>Hero Carousel Banners</h2>
                    <p className={styles.sectionDesc}>
                        Add banner images that will be displayed in the homepage carousel. Use high-quality images (1920x800 recommended).
                    </p>

                    <div className={styles.bannerList}>
                        {config.heroBanners.length === 0 ? (
                            <p className={styles.emptyBanners}>No banners added. Default images will be shown.</p>
                        ) : (
                            config.heroBanners.map((banner, index) => (
                                <div key={index} className={styles.bannerItem}>
                                    <div className={styles.bannerPreview}>
                                        <img src={banner} alt={`Banner ${index + 1}`} />
                                    </div>
                                    <div className={styles.bannerUrl}>{banner}</div>
                                    <div className={styles.bannerActions}>
                                        <button
                                            type="button"
                                            onClick={() => moveBanner(index, 'up')}
                                            disabled={index === 0}
                                            className={styles.moveBtn}
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveBanner(index, 'down')}
                                            disabled={index === config.heroBanners.length - 1}
                                            className={styles.moveBtn}
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeBanner(index)}
                                            className={styles.removeBtn}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className={styles.addBanner}>
                        <input
                            type="url"
                            className="input"
                            value={newBanner}
                            onChange={(e) => setNewBanner(e.target.value)}
                            placeholder="Enter banner image URL..."
                        />
                        <button type="button" className="btn btn-secondary" onClick={addBanner}>
                            Add Banner
                        </button>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Brand Colors</h2>
                    <div className={styles.colorGrid}>
                        <div className={styles.colorGroup}>
                            <label className="label">Primary Color</label>
                            <div className={styles.colorInput}>
                                <input
                                    type="color"
                                    value={config.primaryColor}
                                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="input"
                                    value={config.primaryColor}
                                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className={styles.colorGroup}>
                            <label className="label">Secondary Color</label>
                            <div className={styles.colorInput}>
                                <input
                                    type="color"
                                    value={config.secondaryColor}
                                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="input"
                                    value={config.secondaryColor}
                                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className={styles.colorGroup}>
                            <label className="label">Background Color</label>
                            <div className={styles.colorInput}>
                                <input
                                    type="color"
                                    value={config.backgroundColor}
                                    onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="input"
                                    value={config.backgroundColor}
                                    onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className={styles.colorGroup}>
                            <label className="label">Text Color</label>
                            <div className={styles.colorInput}>
                                <input
                                    type="color"
                                    value={config.textColor}
                                    onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="input"
                                    value={config.textColor}
                                    onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Contact Information</h2>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                className="input"
                                value={config.contactEmail}
                                onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className="label">Phone</label>
                            <input
                                type="tel"
                                className="input"
                                value={config.contactPhone}
                                onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className="label">Address</label>
                        <textarea
                            className="input"
                            rows={2}
                            value={config.address}
                            onChange={(e) => setConfig({ ...config, address: e.target.value })}
                        />
                    </div>
                </section>

                <div className={styles.actions}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
