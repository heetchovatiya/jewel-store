'use client';

import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import api from '@/lib/api';
import styles from './page.module.css';

function ProductsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');

    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || '');
    const [searchQuery, setSearchQuery] = useState(searchParam || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchParam || '');
    const [sortBy, setSortBy] = useState('-createdAt');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const shouldResetProductsRef = useRef(false);
    const limit = 12;

    // Sync URL params with state when they change (e.g., from navbar search)
    useEffect(() => {
        if (searchParam !== null && searchParam !== searchQuery) {
            setSearchQuery(searchParam);
            setDebouncedSearch(searchParam);
            shouldResetProductsRef.current = true;
            setPage(1);
        }
        if (categoryParam !== null && categoryParam !== selectedCategory) {
            setSelectedCategory(categoryParam);
            shouldResetProductsRef.current = true;
            setPage(1);
        }
    }, [searchParam, categoryParam]);

    useEffect(() => {
        fetchCategories();
    }, []);

    // Debounce search input (only for manual typing, not URL changes)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== debouncedSearch) {
                setDebouncedSearch(searchQuery);
                shouldResetProductsRef.current = true;
                setPage(1);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch when filters change (not page)
    useEffect(() => {
        shouldResetProductsRef.current = true;
        setPage(1);
    }, [selectedCategory, sortBy, debouncedSearch]);

    // Fetch products when page changes or initial load
    useEffect(() => {
        if (page === 1 || !isMobile) {
            // Initial load or desktop pagination - fresh fetch
            fetchProducts();
        } else if (isMobile && page > 1) {
            // Mobile infinite scroll - append
            fetchProducts(true);
        }
    }, [page]);

    // Also fetch on initial mount
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchCategories = async () => {
        try {
            const cats = await api.getCategories();
            setCategories(cats);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchProducts = async (loadMore = false) => {
        if (loadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        try {
            const params: any = { page, limit, sort: sortBy };
            if (selectedCategory) params.category = selectedCategory;
            if (debouncedSearch) params.search = debouncedSearch;

            const res = await api.getProducts(params);

            if (loadMore && isMobile && !shouldResetProductsRef.current) {
                // Append products for infinite scroll
                setProducts(prev => [...prev, ...res.products]);
            } else {
                // Reset products (new filter/search or desktop pagination)
                setProducts(res.products);
                shouldResetProductsRef.current = false;
            }
            setTotal(res.total);
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Clear all filters and search
    const clearFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setSelectedCategory('');
        setSortBy('-createdAt');
        shouldResetProductsRef.current = true;
        setPage(1);
        // Also clear URL params
        router.push('/products');
    };

    // Check if any filters are active
    const hasActiveFilters = debouncedSearch || selectedCategory || sortBy !== '-createdAt';

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Infinite scroll observer for mobile
    useEffect(() => {
        if (!isMobile || loading || loadingMore) return;

        const hasMore = products.length < total;
        if (!hasMore) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore && hasMore) {
                    setPage(p => p + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => observerRef.current?.disconnect();
    }, [isMobile, loading, loadingMore, products.length, total]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className={styles.productsPage}>
            <div className="container">
                <header className={styles.header}>
                    <h1>Our Collection</h1>
                    <p>Discover exquisite jewelry crafted with passion</p>
                </header>

                <div className={styles.controls}>
                    <div className={styles.filters}>
                        {/* Search */}
                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input"
                            />
                        </div>

                        {/* Category Filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setPage(1);
                            }}
                            className={`input ${styles.select}`}
                        >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`input ${styles.select}`}
                    >
                        <option value="-createdAt">Newest First</option>
                        <option value="createdAt">Oldest First</option>
                        <option value="price">Price: Low to High</option>
                        <option value="-price">Price: High to Low</option>
                        <option value="title">Name: A-Z</option>
                    </select>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className={`btn btn-ghost ${styles.clearBtn}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Clear
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        <div className="spinner" />
                    </div>
                ) : products.length === 0 ? (
                    <div className={styles.empty}>
                        <h3>No products found</h3>
                        <p>Try adjusting your filters or search query</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.results}>
                            Showing {products.length} of {total} products
                        </div>
                        <div className={`grid grid-4 ${styles.grid}`}>
                            {products.map((product) => (
                                <ProductCard key={product._id} product={product} />
                            ))}
                        </div>

                        {/* Desktop Pagination */}
                        {!isMobile && totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    onClick={() => {
                                        setPage((p) => Math.max(1, p - 1));
                                        setProducts([]);
                                    }}
                                    disabled={page === 1}
                                    className="btn btn-ghost"
                                >
                                    Previous
                                </button>
                                <span className={styles.pageInfo}>
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => {
                                        setPage((p) => Math.min(totalPages, p + 1));
                                        setProducts([]);
                                    }}
                                    disabled={page === totalPages}
                                    className="btn btn-ghost"
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {/* Mobile Infinite Scroll Trigger */}
                        {isMobile && products.length < total && (
                            <div ref={loadMoreRef} className={styles.loadMore}>
                                {loadingMore ? (
                                    <div className="spinner" />
                                ) : (
                                    <span>Scroll for more...</span>
                                )}
                            </div>
                        )}

                        {/* Mobile: Show loaded count */}
                        {isMobile && products.length >= total && total > limit && (
                            <div className={styles.allLoaded}>
                                All {total} products loaded
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={
            <div className={styles.productsPage}>
                <div className="container">
                    <div className={styles.loading}>
                        <div className="spinner" />
                    </div>
                </div>
            </div>
        }>
            <ProductsContent />
        </Suspense>
    );
}
