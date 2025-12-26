'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import api from '@/lib/api';
import styles from './page.module.css';

function ProductsContent() {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');

    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || '');
    const [searchQuery, setSearchQuery] = useState(searchParam || '');
    const [sortBy, setSortBy] = useState('-createdAt');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 12;

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [selectedCategory, sortBy, page, searchQuery]);

    const fetchCategories = async () => {
        try {
            const cats = await api.getCategories();
            setCategories(cats);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit, sort: sortBy };
            if (selectedCategory) params.category = selectedCategory;
            if (searchQuery) params.search = searchQuery;

            const res = await api.getProducts(params);
            setProducts(res.products);
            setTotal(res.total);
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

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

                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="btn btn-ghost"
                                >
                                    Previous
                                </button>
                                <span className={styles.pageInfo}>
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="btn btn-ghost"
                                >
                                    Next
                                </button>
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
