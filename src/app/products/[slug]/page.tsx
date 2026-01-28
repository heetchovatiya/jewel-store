'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getCdnOptimizedUrl, isVideoUrl } from '@/lib/upload';
import styles from './page.module.css';

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { formatPrice } = useTheme();
    const { addToCart, loading: cartLoading } = useCart();
    const { isAuthenticated } = useAuth();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
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

    // Combine images and videos into a single media array
    const media = [
        ...(product.images || []),
        ...(product.videos || [])
    ];

    // If no media, use placeholder
    if (media.length === 0) {
        media.push('/placeholder-jewelry.svg');
    }

    const currentMedia = media[selectedMediaIndex] || media[0];
    const isVideo = isVideoUrl(currentMedia);

    return (
        <div className={styles.productPage}>
            <div className="container">
                <div className={styles.productGrid}>
                    {/* Images */}
                    <div className={styles.gallery}>
                        <div className={styles.mainImage}>
                            {isVideo ? (
                                <video
                                    src={currentMedia}
                                    controls
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <img
                                    src={getCdnOptimizedUrl(currentMedia, { width: 800 })}
                                    alt={product.title}
                                />
                            )}
                        </div>
                        {media.length > 1 && (
                            <div className={styles.thumbnails}>
                                {media.map((url: string, idx: number) => {
                                    const isItemVideo = isVideoUrl(url);
                                    return (
                                        <button
                                            key={idx}
                                            className={`${styles.thumbnail} ${idx === selectedMediaIndex ? styles.active : ''}`}
                                            onClick={() => setSelectedMediaIndex(idx)}
                                        >
                                            {isItemVideo ? (
                                                <video
                                                    src={`${url}#t=0.001`}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        pointerEvents: 'none' // Prevent interaction with the thumbnail video itself
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={getCdnOptimizedUrl(url, { width: 150 })}
                                                    alt={`${product.title} ${idx + 1}`}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
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

                        {/* Product Info Section */}
                        <div className={styles.productInfo}>
                            <h3 className={styles.productInfoTitle}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                Product Information
                            </h3>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoCard}>
                                    <div className={styles.infoIcon}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                    </div>
                                    <div className={styles.infoContent}>
                                        <h4>916 Hallmarked Gold</h4>
                                        <p>BIS certified authentic gold with 91.6% purity (22 Karat)</p>
                                    </div>
                                </div>
                                <div className={styles.infoCard}>
                                    <div className={styles.infoIcon}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                        </svg>
                                    </div>
                                    <div className={styles.infoContent}>
                                        <h4>Handcrafted Design</h4>
                                        <p>Each piece is carefully crafted by skilled artisans</p>
                                    </div>
                                </div>
                                <div className={styles.infoCard}>
                                    <div className={styles.infoIcon}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="1" y="3" width="15" height="13"></rect>
                                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                            <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                            <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                        </svg>
                                    </div>
                                    <div className={styles.infoContent}>
                                        <h4>Free Shipping</h4>
                                        <p>Free delivery on orders above ₹999 across India</p>
                                    </div>
                                </div>
                                <div className={styles.infoCard}>
                                    <div className={styles.infoIcon}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="23 4 23 10 17 10"></polyline>
                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                        </svg>
                                    </div>
                                    <div className={styles.infoContent}>
                                        <h4>Easy Returns</h4>
                                        <p>7-day easy return policy for unused products</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Care Instructions */}
                        <div className={styles.careSection}>
                            <h3 className={styles.careSectionTitle}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 12l2 2 4-4"></path>
                                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.07.74 5.61 1.97"></path>
                                </svg>
                                Care Instructions
                            </h3>
                            <ul className={styles.careList}>
                                <li>Store in a cool, dry place away from direct sunlight</li>
                                <li>Avoid contact with perfumes, lotions, and chemicals</li>
                                <li>Clean gently with a soft, lint-free cloth</li>
                                <li>Remove jewellery before swimming or bathing</li>
                            </ul>
                        </div>

                        {/* Specifications */}
                        {product.specifications && Object.keys(product.specifications).length > 0 && (
                            <div className={styles.specs}>
                                <h3 className={styles.specsTitle}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="8" y1="6" x2="21" y2="6"></line>
                                        <line x1="8" y1="12" x2="21" y2="12"></line>
                                        <line x1="8" y1="18" x2="21" y2="18"></line>
                                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                    </svg>
                                    Specifications
                                </h3>
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
