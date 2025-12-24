'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api';

interface StoreConfig {
    storeName: string;
    storeDescription: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    heroBanners: string[];
    categories?: Array<{
        name: string;
        slug: string;
        showInNavbar: boolean;
        order: number;
        image?: string;
    }>;
    aboutUs?: {
        enabled: boolean;
        title: string;
        description: string;
        images: string[];
    };
    contactEmail: string;
    contactPhone: string;
    address: string;
    socialLinks: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        whatsapp?: string;
    };
    currency: string;
    currencySymbol: string;
}

interface ThemeContextType {
    config: StoreConfig | null;
    loading: boolean;
    error: string | null;
    refreshConfig: () => Promise<void>;
    formatPrice: (price: number) => string;
}

const defaultConfig: StoreConfig = {
    storeName: 'Jewel Store',
    storeDescription: 'Exquisite Jewelry',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#d4af37',
    secondaryColor: '#1a1a2e',
    backgroundColor: '#0f0f1a',
    textColor: '#ffffff',
    heroBanners: [],
    contactEmail: '',
    contactPhone: '',
    address: '',
    socialLinks: {},
    currency: 'INR',
    currencySymbol: '₹',
};

const ThemeContext = createContext<ThemeContextType>({
    config: defaultConfig,
    loading: true,
    error: null,
    refreshConfig: async () => { },
    formatPrice: (price) => `₹${price}`,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<StoreConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const applyTheme = (config: StoreConfig) => {
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.style.setProperty('--primary', config.primaryColor);
            root.style.setProperty('--secondary', config.secondaryColor);
            root.style.setProperty('--background', config.backgroundColor);
            root.style.setProperty('--text', config.textColor);

            // Update favicon if provided
            if (config.faviconUrl) {
                const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
                if (favicon) favicon.href = config.faviconUrl;
            }

            // Update page title
            document.title = config.storeName;
        }
    };

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const data = await api.getConfig();
            setConfig(data);
            applyTheme(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch config:', err);
            setError('Failed to load store configuration');
            applyTheme(defaultConfig);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const formatPrice = (price: number) => {
        return `${config.currencySymbol}${price.toLocaleString()}`;
    };

    return (
        <ThemeContext.Provider
            value={{
                config,
                loading,
                error,
                refreshConfig: fetchConfig,
                formatPrice,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
