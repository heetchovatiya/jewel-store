'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './HeroCarousel.module.css';

export default function HeroCarousel() {
    const { config } = useTheme();
    const [currentSlide, setCurrentSlide] = useState(0);

    const banners = config?.heroBanners?.length ? config.heroBanners : [
        'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920&q=80',
        'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1920&q=80',
        'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=1920&q=80',
    ];

    useEffect(() => {
        if (banners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % banners.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [banners.length]);

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
    };

    return (
        <section className={styles.hero}>
            <div className={styles.carousel}>
                {banners.map((banner, index) => (
                    <div
                        key={index}
                        className={`${styles.slide} ${index === currentSlide ? styles.active : ''}`}
                        style={{ backgroundImage: `url(${banner})` }}
                    />
                ))}

                <div className={styles.overlay} />

                <div className={styles.content}>
                    <h1 className={styles.title}>
                        <span className={styles.titleAccent}>Exquisite</span>
                        <br />
                        Jewelry Collection
                    </h1>
                    <p className={styles.subtitle}>
                        Discover timeless elegance crafted with precision and passion.
                        Each piece tells a unique story.
                    </p>
                    <div className={styles.actions}>
                        <a href="/products" className="btn btn-primary">
                            Shop Now
                        </a>
                        <a href="/products?category=new" className="btn btn-secondary">
                            New Arrivals
                        </a>
                    </div>
                </div>

                {banners.length > 1 && (
                    <>
                        <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prevSlide}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={nextSlide}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>

                        <div className={styles.dots}>
                            {banners.map((_, index) => (
                                <button
                                    key={index}
                                    className={`${styles.dot} ${index === currentSlide ? styles.dotActive : ''}`}
                                    onClick={() => goToSlide(index)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
