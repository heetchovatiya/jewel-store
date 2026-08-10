'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { getPublicUrl } from '@/lib/upload';
import styles from './HeroCarousel.module.css';

const FALLBACK_BANNER = '/placeholder-jewelry.jpg';
const HERO_W = 1600;
const HERO_H = 900;

type HeroCarouselProps = {
  initialBanners?: string[];
  storeName?: string;
  storeDescription?: string;
};

function normalizeBanners(list?: string[]): string[] {
  const expanded = (list || []).map((b) => getPublicUrl(b)).filter(Boolean);
  return expanded.length ? expanded : [FALLBACK_BANNER];
}

export default function HeroCarousel({
  initialBanners,
  storeName,
  storeDescription,
}: HeroCarouselProps) {
  const { config } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const banners = normalizeBanners(
    initialBanners?.length
      ? initialBanners
      : config?.heroBanners?.length
        ? config.heroBanners
        : undefined,
  );

  const brand = storeName || config?.storeName || 'Priyanci Gold';
  const subtitle =
    storeDescription ||
    config?.storeDescription ||
    'Hallmarked craftsmanship, timeless design, made for everyday elegance.';

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [banners.length]);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % banners.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);

  // Only LCP slide before hydration; then current + neighbors (cuts multi-MB carousel waste)
  const shouldRenderSlide = (index: number) => {
    if (index === 0) return true;
    if (!hydrated) return false;
    if (index === currentSlide) return true;
    const next = (currentSlide + 1) % banners.length;
    const prev = (currentSlide - 1 + banners.length) % banners.length;
    return index === next || index === prev;
  };

  return (
    <section className={styles.hero} aria-label="Featured collection">
      <div className={styles.carousel}>
        {banners.map((banner, index) => {
          if (!shouldRenderSlide(index)) return null;
          const isActive = index === currentSlide;
          const isLcp = index === 0;
          return (
            <div
              key={`${banner}-${index}`}
              className={`${styles.slide} ${isActive ? styles.active : ''}`}
              aria-hidden={!isActive}
            >
              <Image
                src={banner}
                alt={`${brand} jewellery collection${banners.length > 1 ? ` — slide ${index + 1}` : ''}`}
                width={HERO_W}
                height={HERO_H}
                priority={isLcp}
                fetchPriority={isLcp ? 'high' : 'low'}
                loading={isLcp ? 'eager' : 'lazy'}
                sizes="100vw"
                quality={65}
                className={styles.slideImage}
              />
            </div>
          );
        })}

        <div className={styles.overlay} />

        <div className={styles.content}>
          <p className={styles.brand}>{brand}</p>
          <h1 className={styles.title}>
            Certified gold,{' '}
            <span className={styles.titleAccent}>honestly priced</span>
          </h1>
          <p className={styles.subtitle}>{subtitle}</p>
          <div className={styles.actions}>
            <Link href="/products" className={`btn btn-primary ${styles.primaryCta}`}>
              Shop Collection
            </Link>
            <Link href="/products" className={`btn btn-secondary ${styles.secondaryCta}`}>
              View All
            </Link>
          </div>
        </div>

        {banners.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowLeft}`}
              onClick={prevSlide}
              aria-label="Previous slide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowRight}`}
              onClick={nextSlide}
              aria-label="Next slide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            <div className={styles.dots} role="tablist" aria-label="Carousel slides">
              {banners.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={index === currentSlide}
                  className={`${styles.dot} ${index === currentSlide ? styles.dotActive : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
