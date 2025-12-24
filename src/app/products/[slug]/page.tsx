'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import styles from './page.module.css';

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { formatPrice } = useTheme();
    const { addToCart, loading: cartLoading } = useCart();
    const { isAuthenticated } = useAuth();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [leadForm, setLeadForm] = useState({ name: '', phone: '' });
    const [leadSubmitted, setLeadSubmitted] = useState(false);

    useEffect(() => {
        fetchProduct();
    }, [slug]);

    const fetchProduct = async () => {
        try {
            const data = await api.getProduct(slug);
            setProduct(data);
        } catch (err) {
            console.error('Failed to fetch product:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }
        await addToCart(product._id, quantity);
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.submitLead({
                customerName: leadForm.name,
                customerPhone: leadForm.phone,
                productId: product._id,
            });
            setLeadSubmitted(true);
        } catch (err) {
            console.error('Failed to submit lead:', err);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingPage}>
                <div className="spinner" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className={styles.notFound}>
                <h2>Product Not Found</h2>
                <a href="/products" className="btn btn-primary">Browse Products</a>
            </div>
        );
    }

    const inStock = product.inventory?.inStock ?? true;

    return (
        <div className={styles.productPage}>
            <div className="container">
                <div className={styles.productGrid}>
                    {/* Images */}
                    <div className={styles.gallery}>
                        <div className={styles.mainImage}>
                            <img
                                src={product.images?.[selectedImage] || '/placeholder-jewelry.jpg'}
                                alt={product.title}
                            />
                        </div>
                        {product.images?.length > 1 && (
                            <div className={styles.thumbnails}>
                                {product.images.map((img: string, idx: number) => (
                                    <button
                                        key={idx}
                                        className={`${styles.thumbnail} ${idx === selectedImage ? styles.active : ''}`}
                                        onClick={() => setSelectedImage(idx)}
                                    >
                                        <img src={img} alt={`${product.title} ${idx + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className={styles.details}>
                        <span className={styles.category}>{product.category}</span>
                        <h1 className={styles.title}>{product.title}</h1>

                        <div className={styles.pricing}>
                            <span className={styles.price}>{formatPrice(product.price)}</span>
                            {product.compareAtPrice && (
                                <span className={styles.comparePrice}>
                                    {formatPrice(product.compareAtPrice)}
                                </span>
                            )}
                        </div>

                        <div className={styles.stock}>
                            {inStock ? (
                                <span className={styles.inStock}>✓ In Stock</span>
                            ) : (
                                <span className={styles.outOfStock}>✗ Out of Stock</span>
                            )}
                        </div>

                        <p className={styles.description}>{product.description}</p>

                        {/* Quantity & Add to Cart */}
                        <div className={styles.actions}>
                            <div className={styles.quantity}>
                                <button
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                >
                                    −
                                </button>
                                <span>{quantity}</span>
                                <button
                                    onClick={() => setQuantity((q) => q + 1)}
                                    disabled={product.inventory && quantity >= product.inventory.stock}
                                >
                                    +
                                </button>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddToCart}
                                disabled={!inStock || cartLoading}
                            >
                                {cartLoading ? 'Adding...' : 'Add to Cart'}
                            </button>
                        </div>

                        {/* Inquiry Button */}
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: 'var(--space-md)' }}
                            onClick={() => setShowLeadModal(true)}
                        >
                            Inquire About This Product
                        </button>

                        {/* Specifications */}
                        {product.specifications && Object.keys(product.specifications).length > 0 && (
                            <div className={styles.specs}>
                                <h3>Specifications</h3>
                                <table>
                                    <tbody>
                                        {Object.entries(product.specifications).map(([key, value]) => (
                                            <tr key={key}>
                                                <td>{key}</td>
                                                <td>{value as string}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* SKU */}
                        {product.inventory?.sku && (
                            <p className={styles.sku}>SKU: {product.inventory.sku}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Lead Modal */}
            {showLeadModal && (
                <div className={styles.modal} onClick={() => setShowLeadModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        {leadSubmitted ? (
                            <div className={styles.success}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <h3>Thank You!</h3>
                                <p>We will contact you soon about this product.</p>
                                <button className="btn btn-primary" onClick={() => setShowLeadModal(false)}>
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                <h3>Inquire About This Product</h3>
                                <form onSubmit={handleLeadSubmit}>
                                    <div className={styles.formGroup}>
                                        <label className="label">Your Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={leadForm.name}
                                            onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className="label">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="input"
                                            value={leadForm.phone}
                                            onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                        Submit Inquiry
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
