'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import { uploadImage, validateImageFile } from '@/lib/upload';
import styles from './page.module.css';

interface Category {
    name: string;
    slug: string;
    showInNavbar: boolean;
    order: number;
}

export default function AdminProductsPage() {
    const router = useRouter();
    const { isAdmin, loading: authLoading } = useAuth();
    const { formatPrice, config } = useTheme();

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState<any>(null);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: 0,
        category: '',
        images: [] as string[],
        stock: 0,
        sku: '',
        lowStockThreshold: 5,
        isFeatured: false,
        specifications: {} as Record<string, string>,
    });
    const [error, setError] = useState('');

    // Upload states
    const [uploadingImage, setUploadingImage] = useState(false);
    const productImageInputRef = useRef<HTMLInputElement>(null);

    // Get categories from store config ONLY (no fallbacks)
    const categories: Category[] = (config?.categories || []).sort((a: Category, b: Category) => a.order - b.order);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/login');
        }
    }, [authLoading, isAdmin, router]);

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [isAdmin]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const productsData = await api.getAdminProducts({ limit: 100 });
            setProducts(productsData.products || []);
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = async (product?: any) => {
        setError('');
        if (product) {
            setEditProduct(product);
            setLoadingInventory(true);

            // Fetch product with inventory data
            try {
                const productWithInventory = await api.getProductWithInventory(product._id);
                setFormData({
                    title: productWithInventory.title,
                    description: productWithInventory.description || '',
                    price: productWithInventory.price,
                    category: productWithInventory.category,
                    images: Array.isArray(productWithInventory.images) ? productWithInventory.images : [],
                    stock: productWithInventory.inventory?.stock || 0,
                    sku: productWithInventory.inventory?.sku || '',
                    lowStockThreshold: productWithInventory.inventory?.lowStockThreshold || 5,
                    isFeatured: productWithInventory.isFeatured || false,
                    specifications: productWithInventory.specifications || {},
                });
            } catch (err) {
                console.error('Failed to fetch inventory:', err);
                // Fallback to product data only
                setFormData({
                    title: product.title,
                    description: product.description || '',
                    price: product.price,
                    category: product.category,
                    images: Array.isArray(product.images) ? product.images : [],
                    stock: 0,
                    sku: '',
                    lowStockThreshold: 5,
                    isFeatured: product.isFeatured || false,
                    specifications: product.specifications || {},
                });
            } finally {
                setLoadingInventory(false);
            }
        } else {
            setEditProduct(null);
            setFormData({
                title: '',
                description: '',
                price: 0,
                category: categories[0]?.slug || '',
                images: [],
                stock: 10,
                sku: '',
                lowStockThreshold: 5,
                isFeatured: false,
                specifications: {},
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.category) {
            setError('Please select a category. Add categories in the Categories section first.');
            return;
        }

        try {
            const productData = {
                title: formData.title,
                description: formData.description,
                price: formData.price,
                category: formData.category,
                images: formData.images,
                isFeatured: formData.isFeatured,
                specifications: formData.specifications,
            };

            if (editProduct) {
                // Update product
                await api.updateProduct(editProduct._id, productData);

                // Update inventory
                await api.updateInventory(editProduct._id, {
                    stock: formData.stock,
                    sku: formData.sku,
                    lowStockThreshold: formData.lowStockThreshold,
                });
            } else {
                // Create new product with initial inventory
                await api.createProduct({
                    ...productData,
                    stock: formData.stock,
                    sku: formData.sku,
                    lowStockThreshold: formData.lowStockThreshold,
                });
            }

            fetchData();
            setShowModal(false);
        } catch (err: any) {
            console.error('Failed to save product:', err);
            setError(err.message || 'Failed to save product. Please try again.');
        }
    };

    const toggleFeatured = async (id: string) => {
        try {
            await api.toggleFeatured(id);
            fetchData();
        } catch (err) {
            console.error('Failed to toggle featured:', err);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        // Optimistic update - remove from UI immediately
        const previousProducts = [...products];
        setProducts(products.filter(p => p._id !== id));

        try {
            await api.deleteProduct(id);
            // Refetch to ensure sync with server
            fetchData();
        } catch (err) {
            console.error('Failed to delete product:', err);
            // Rollback on error
            setProducts(previousProducts);
            alert('Failed to delete product. Please try again.');
        }
    };

    const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        setUploadingImage(true);
        setError('');
        try {
            const url = await uploadImage(file, { folder: 'products' });
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, url],
            }));
        } catch (err: any) {
            setError(err.message || 'Failed to upload image');
        } finally {
            setUploadingImage(false);
            if (productImageInputRef.current) productImageInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
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
        <div className={styles.productsPage}>
            <div className={styles.header}>
                <div>
                    <Link href="/admin" className={styles.backLink}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Back to Dashboard
                    </Link>
                    <h1>Products</h1>
                </div>
                <div className={styles.headerActions}>
                    <label className={styles.uploadBtn}>
                        <input
                            type="file"
                            accept=".csv"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    try {
                                        const result = await api.bulkUploadProducts(file);
                                        alert(`Upload complete! ${result.success} products added, ${result.failed} failed.`);
                                        fetchData();
                                    } catch (err: any) {
                                        alert('Upload failed: ' + err.message);
                                    }
                                    e.target.value = '';
                                }
                            }}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Bulk Upload CSV
                    </label>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Product
                    </button>
                </div>
            </div>

            {categories.length === 0 && (
                <div className={styles.warningBox}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>No categories found in store config. <Link href="/admin/categories">Add categories first</Link> to create products.</span>
                </div>
            )}

            {products.length === 0 ? (
                <div className={styles.emptyState}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    <h2>No products yet</h2>
                    <p>Add your first product to start selling.</p>
                    <button className="btn btn-primary" onClick={() => openModal()} disabled={categories.length === 0}>
                        Add Your First Product
                    </button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {products.map((product) => (
                        <div key={product._id} className={styles.productCard}>
                            {product.isFeatured && (
                                <span className={styles.featuredBadge}>★ Featured</span>
                            )}
                            <div className={styles.productImage}>
                                <img src={product.images?.[0] || '/placeholder-jewelry.svg'} alt={product.title} />
                            </div>
                            <div className={styles.productInfo}>
                                <h3>{product.title}</h3>
                                <p className={styles.category}>{product.category}</p>
                                <p className={styles.price}>{formatPrice(product.price)}</p>
                            </div>
                            <div className={styles.productActions}>
                                <button
                                    className={`btn btn-ghost ${product.isFeatured ? styles.featuredActive : ''}`}
                                    onClick={() => toggleFeatured(product._id)}
                                    title={product.isFeatured ? 'Remove from featured' : 'Add to featured'}
                                >
                                    {product.isFeatured ? '★' : '☆'}
                                </button>
                                <button className="btn btn-ghost" onClick={() => openModal(product)}>
                                    Edit
                                </button>
                                <button className="btn btn-ghost" onClick={() => deleteProduct(product._id)} style={{ color: 'var(--error)' }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className={styles.modal} onClick={() => setShowModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2>{editProduct ? 'Edit Product' : 'Add Product'}</h2>

                        {error && (
                            <div className={styles.errorMessage}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label className="label">Product Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Diamond Solitaire Ring"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className="label">Description</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe your product..."
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className="label">Price (₹)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        min={0}
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className="label">Category</label>
                                    <select
                                        className="input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.slug} value={cat.slug}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className="label">Product Images</label>
                                <div className={styles.imageGallery}>
                                    {formData.images.map((url, index) => (
                                        <div key={index} className={styles.imageThumb}>
                                            <img src={url} alt={`Product ${index + 1}`} />
                                            <button
                                                type="button"
                                                className={styles.removeImageBtn}
                                                onClick={() => removeImage(index)}
                                                title="Remove image"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <label className={`${styles.uploadPlaceholder} ${uploadingImage ? styles.disabled : ''}`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={productImageInputRef}
                                            onChange={handleProductImageUpload}
                                            disabled={uploadingImage}
                                            style={{ display: 'none' }}
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                                    </label>
                                </div>
                                {formData.images.length > 0 && (
                                    <span className={styles.imageCount}>
                                        {formData.images.length} image{formData.images.length !== 1 ? 's' : ''} • Click image to remove
                                    </span>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isFeatured}
                                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                    />
                                    <span>Mark as Featured Product</span>
                                </label>
                                <span className={styles.hint}>Featured products appear on the homepage</span>
                            </div>

                            {/* Specifications Section */}
                            <div className={styles.formGroup}>
                                <label className="label">Product Specifications</label>
                                <span className={styles.hint} style={{ marginBottom: 'var(--space-sm)', display: 'block' }}>
                                    Add specifications like Material, Weight, Purity, etc.
                                </span>
                                <div className={styles.specsEditor}>
                                    {Object.entries(formData.specifications).map(([key, value], index) => (
                                        <div key={index} className={styles.specRow}>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Name (e.g., Material)"
                                                value={key}
                                                onChange={(e) => {
                                                    const newSpecs = { ...formData.specifications };
                                                    const oldValue = newSpecs[key];
                                                    delete newSpecs[key];
                                                    if (e.target.value) {
                                                        newSpecs[e.target.value] = oldValue;
                                                    }
                                                    setFormData({ ...formData, specifications: newSpecs });
                                                }}
                                            />
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Value (e.g., 925 Silver)"
                                                value={value}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        specifications: {
                                                            ...formData.specifications,
                                                            [key]: e.target.value
                                                        }
                                                    });
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className={styles.removeSpecBtn}
                                                onClick={() => {
                                                    const newSpecs = { ...formData.specifications };
                                                    delete newSpecs[key];
                                                    setFormData({ ...formData, specifications: newSpecs });
                                                }}
                                                title="Remove specification"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className={styles.addSpecBtn}
                                        onClick={() => {
                                            const newKey = `Spec ${Object.keys(formData.specifications).length + 1}`;
                                            setFormData({
                                                ...formData,
                                                specifications: {
                                                    ...formData.specifications,
                                                    [newKey]: ''
                                                }
                                            });
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        Add Specification
                                    </button>
                                </div>
                            </div>

                            {/* Inventory Section */}
                            {loadingInventory ? (
                                <div className={styles.loadingInventory}>
                                    Loading inventory data...
                                </div>
                            ) : (
                                <>
                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label className="label">{editProduct ? 'Current Stock' : 'Initial Stock'}</label>
                                            <input
                                                type="number"
                                                className="input"
                                                min={0}
                                                value={formData.stock}
                                                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className="label">SKU {!editProduct && '(optional)'}</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.sku}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                placeholder="Auto-generated if empty"
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className="label">Low Stock Alert Threshold</label>
                                        <input
                                            type="number"
                                            className="input"
                                            min={0}
                                            value={formData.lowStockThreshold}
                                            onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 5 })}
                                        />
                                        <span className={styles.hint}>Get notified when stock falls below this number</span>
                                    </div>
                                </>
                            )}
                            <div className={styles.modalActions}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={categories.length === 0}>
                                    {editProduct ? 'Update Product' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
