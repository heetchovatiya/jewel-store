'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import styles from './Navbar.module.css';

interface Category {
    name: string;
    slug: string;
    showInNavbar: boolean;
    order: number;
}

export default function Navbar() {
    const router = useRouter();
    const { config } = useTheme();
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const { itemCount } = useCart();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Refs for click outside detection
    const userMenuRef = useRef<HTMLDivElement>(null);
    const categoriesRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get all categories from config, sorted by order
    const categories: Category[] = (config?.categories || []).sort((a: Category, b: Category) => a.order - b.order);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
            if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
                setCategoriesOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [searchOpen]);

    // Handle search submit
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
            setSearchQuery('');
            handleNavClick();
        }
    };

    // Close mobile menu when navigating
    const handleNavClick = () => {
        setMobileMenuOpen(false);
        setUserMenuOpen(false);
        setSearchOpen(false);
    };

    return (
        <nav className={styles.navbar}>
            <div className={`container ${styles.navContent}`}>
                {/* Logo */}
                <Link href="/" className={styles.logo} onClick={handleNavClick}>
                    {config?.logoUrl ? (
                        <img src={config.logoUrl} alt={config.storeName} className={styles.logoImg} />
                    ) : (
                        <span className={styles.logoText}>{config?.storeName || 'Jewel Store'}</span>
                    )}
                </Link>

                {/* Desktop Navigation */}
                <div className={styles.navLinks}>
                    <Link href="/" className={styles.navLink}>Home</Link>
                    <Link href="/products" className={styles.navLink}>Shop All</Link>

                    {/* About Us - Only show when enabled */}
                    {config?.aboutUs?.enabled && (
                        <a href="#about-us" className={styles.navLink}>About Us</a>
                    )}

                    {/* All Categories Dropdown on Hover */}
                    {categories.length > 0 && (
                        <div
                            ref={categoriesRef}
                            className={styles.categoriesMenu}
                            onMouseEnter={() => setCategoriesOpen(true)}
                            onMouseLeave={() => setCategoriesOpen(false)}
                        >
                            <button className={`${styles.navLink} ${categoriesOpen ? styles.active : ''}`}>
                                Categories
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={categoriesOpen ? styles.rotated : ''}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div className={`${styles.categoriesDropdown} ${categoriesOpen ? styles.visible : ''}`}>
                                <div className={styles.categoriesGrid}>
                                    {categories.map((category: Category) => (
                                        <Link
                                            key={category.slug}
                                            href={`/products?category=${category.slug}`}
                                            className={styles.categoryItem}
                                            onClick={handleNavClick}
                                        >
                                            <span className={styles.categoryName}>{category.name}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                            </svg>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Section */}
                <div className={styles.navActions}>
                    {/* Search */}
                    <div ref={searchRef} className={`${styles.searchWrapper} ${searchOpen ? styles.searchOpen : ''}`}>
                        <form onSubmit={handleSearch} className={styles.searchForm}>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                            <button type="submit" className={styles.searchSubmit}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                            </button>
                        </form>
                        <button
                            className={styles.iconBtn}
                            onClick={() => setSearchOpen(!searchOpen)}
                            title="Search Products"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </button>
                    </div>

                    {/* Cart */}
                    <Link href="/cart" className={styles.cartBtn}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        {itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
                    </Link>

                    {/* User Menu with click outside detection */}
                    {isAuthenticated ? (
                        <div ref={userMenuRef} className={styles.userMenu}>
                            <button
                                className={`${styles.userBtn} ${userMenuOpen ? styles.active : ''}`}
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </button>
                            <div className={`${styles.dropdown} ${userMenuOpen ? styles.visible : ''}`}>
                                <div className={styles.dropdownHeader}>
                                    <span className={styles.userName}>{user?.name}</span>
                                    <span className={styles.userEmail}>{user?.email}</span>
                                </div>
                                <div className={styles.dropdownDivider}></div>
                                <Link href="/account" className={styles.dropdownItem} onClick={handleNavClick}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    My Account
                                </Link>
                                <Link href="/account/orders" className={styles.dropdownItem} onClick={handleNavClick}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                        <line x1="3" y1="6" x2="21" y2="6"></line>
                                    </svg>
                                    My Orders
                                </Link>
                                {isAdmin && (
                                    <>
                                        <div className={styles.dropdownDivider}></div>
                                        <Link href="/admin" className={styles.dropdownItem} onClick={handleNavClick}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="7" height="7"></rect>
                                                <rect x="14" y="3" width="7" height="7"></rect>
                                                <rect x="14" y="14" width="7" height="7"></rect>
                                                <rect x="3" y="14" width="7" height="7"></rect>
                                            </svg>
                                            Admin Dashboard
                                        </Link>
                                    </>
                                )}
                                <div className={styles.dropdownDivider}></div>
                                <button onClick={() => { logout(); handleNavClick(); }} className={styles.dropdownItem}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Link href="/login" className={styles.loginBtn}>
                            Login
                        </Link>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className={styles.mobileToggle}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.open : ''}`}>
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className={styles.mobileSearchForm}>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.mobileSearchInput}
                    />
                    <button type="submit" className={styles.mobileSearchBtn}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    </button>
                </form>

                <Link href="/" className={styles.mobileLink} onClick={handleNavClick}>Home</Link>
                <Link href="/products" className={styles.mobileLink} onClick={handleNavClick}>Shop All</Link>

                {/* About Us - Only show when enabled */}
                {config?.aboutUs?.enabled && (
                    <a href="#about-us" className={styles.mobileLink} onClick={handleNavClick}>About Us</a>
                )}

                {categories.length > 0 && (
                    <div className={styles.mobileCategorySection}>
                        <span className={styles.mobileCategoryTitle}>Categories</span>
                        {categories.map((category: Category) => (
                            <Link
                                key={category.slug}
                                href={`/products?category=${category.slug}`}
                                className={styles.mobileLink}
                                onClick={handleNavClick}
                            >
                                {category.name}
                            </Link>
                        ))}
                    </div>
                )}

                {!isAuthenticated && (
                    <Link href="/login" className={styles.mobileLoginBtn} onClick={handleNavClick}>
                        Login / Register
                    </Link>
                )}
            </div>
        </nav>
    );
}
