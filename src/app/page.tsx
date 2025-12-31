'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import HeroCarousel from '@/components/HeroCarousel';
import ProductCard from '@/components/ProductCard';
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

export default function HomePage() {
  const { config, formatPrice } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get categories from config
  const categories: Category[] = (config?.categories || []).sort((a: Category, b: Category) => a.order - b.order);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsRes = await api.getProducts({ limit: 8, featured: true });
        setProducts(productsRes.products);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className={styles.home} data-page="home">
      <HeroCarousel />

      {/* Features */}
      <section className={styles.features}>
        <div className="container">
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
              <h3>Free Shipping</h3>
              <p>On orders above ₹999</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3>Secure Payment</h3>
              <p>100% secure checkout</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.07.74 5.61 1.97"></path>
                </svg>
              </div>
              <h3>Certified Quality</h3>
              <p>Premium handcrafted jewelry</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </div>
              <h3>Easy Returns</h3>
              <p>30-day return policy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className={styles.categoriesSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionTag}>Explore</span>
                <h2 className={styles.sectionTitle}>Shop by Category</h2>
              </div>
            </div>
            <div className={styles.categoryGrid}>
              {categories.slice(0, 4).map((category) => (
                <Link
                  key={category.slug}
                  href={`/products?category=${category.slug}`}
                  className={styles.categoryCard}
                >
                  {category.image && (
                    <img src={category.image} alt={category.name} className={styles.categoryImage} />
                  )}
                  <div className={styles.categoryOverlay} />
                  <div className={styles.categoryContent}>
                    <span className={styles.categoryName}>{category.name}</span>
                    <span className={styles.categoryAction}>
                      Explore
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Us Section - Conditionally rendered based on admin toggle */}
      {config?.aboutUs?.enabled && (
        <section id="about-us" className={styles.aboutSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionTag}>About Us</span>
                <h2 className={styles.sectionTitle}>{config.aboutUs.title || 'Our Story'}</h2>
              </div>
            </div>
            <div className={`${styles.aboutContent} ${config.aboutUs.images?.length === 0 ? styles.noImages :
              config.aboutUs.images?.length === 1 ? styles.oneImage : styles.twoImages
              }`}>
              {/* Images Section */}
              {config.aboutUs.images?.length > 0 && (
                <div className={styles.aboutImages}>
                  {config.aboutUs.images.slice(0, 2).map((img, idx) => (
                    <div key={idx} className={styles.aboutImageWrapper}>
                      <img src={img} alt={`About us ${idx + 1}`} className={styles.aboutImage} />
                    </div>
                  ))}
                </div>
              )}
              {/* Text Section */}
              <div className={styles.aboutText}>
                <p>{config.aboutUs.description}</p>
                <Link href="/products" className="btn btn-primary">
                  Explore Our Collection
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className={styles.productsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTag}>New Arrivals</span>
              <h2 className={styles.sectionTitle}>Featured Collection</h2>
            </div>
            <Link href="/products" className="btn btn-secondary">View All</Link>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className="spinner" />
            </div>
          ) : products.length === 0 ? (
            <div className={styles.emptyProducts}>
              <p>No products available yet. Check back soon!</p>
            </div>
          ) : (
            <div className={`grid grid-4 ${styles.productGrid}`}>
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonial Section - Hidden for now */}
      {/* 
      <section className={styles.testimonials}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTag}>Testimonials</span>
              <h2 className={styles.sectionTitle}>What Our Customers Say</h2>
            </div>
          </div>
          <div className={styles.testimonialGrid}>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>★★★★★</div>
              <p className={styles.testimonialText}>
                "Absolutely stunning jewelry! The quality exceeded my expectations. Will definitely order again."
              </p>
              <div className={styles.testimonialAuthor}>
                <span className={styles.authorName}>Priya Sharma</span>
                <span className={styles.authorLocation}>Mumbai</span>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>★★★★★</div>
              <p className={styles.testimonialText}>
                "Fast delivery and beautiful packaging. The necklace I ordered was perfect for my wedding."
              </p>
              <div className={styles.testimonialAuthor}>
                <span className={styles.authorName}>Anjali Patel</span>
                <span className={styles.authorLocation}>Delhi</span>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>★★★★★</div>
              <p className={styles.testimonialText}>
                "The craftsmanship is impeccable. Each piece feels unique and special. Highly recommend!"
              </p>
              <div className={styles.testimonialAuthor}>
                <span className={styles.authorName}>Meera Reddy</span>
                <span className={styles.authorLocation}>Bangalore</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaContent}>
            <span className={styles.ctaTag}>Need Help?</span>
            <h2>Have Questions About Our Jewelry?</h2>
            <p>Our experts are here to help you find the perfect piece for any occasion.</p>
            <div className={styles.ctaButtons}>
              <Link href="/products" className="btn btn-primary">Browse Collection</Link>
              {config?.contactPhone && (
                <a href={`tel:${config.contactPhone}`} className="btn btn-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  Call Us
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
