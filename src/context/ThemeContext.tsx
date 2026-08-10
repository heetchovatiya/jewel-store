'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api';
import { getPublicUrl } from '@/lib/upload';

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

/** Expand bare R2 keys → full CDN URLs (API may still return keys if CDN env missing). */
function expandConfigMedia(raw: StoreConfig): StoreConfig {
    return {
        ...raw,
        logoUrl: getPublicUrl(raw.logoUrl),
        faviconUrl: getPublicUrl(raw.faviconUrl),
        heroBanners: (raw.heroBanners || []).map((b) => getPublicUrl(b)),
        categories: (raw.categories || []).map((c) => ({
            ...c,
            image: c.image ? getPublicUrl(c.image) : c.image,
        })),
        aboutUs: raw.aboutUs
            ? {
                ...raw.aboutUs,
                images: (raw.aboutUs.images || []).map((img) => getPublicUrl(img)),
            }
            : raw.aboutUs,
    };
}

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

            const faviconToUse = config.faviconUrl || config.logoUrl;
            if (faviconToUse) {
                let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
                if (!favicon) {
                    favicon = document.createElement('link');
                    favicon.rel = 'icon';
                    document.head.appendChild(favicon);
                }
                favicon.href = faviconToUse;

                let appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
                if (!appleTouchIcon) {
                    appleTouchIcon = document.createElement('link');
                    appleTouchIcon.rel = 'apple-touch-icon';
                    document.head.appendChild(appleTouchIcon);
                }
                appleTouchIcon.href = faviconToUse;
            }

            document.title = config.storeName || 'Jewel Store';

            let metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.name = 'description';
                document.head.appendChild(metaDescription);
            }
            metaDescription.content = config.storeDescription || 'Premium jewelry collection';

            const updateOrCreateMeta = (property: string, content: string) => {
                let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('property', property);
                    document.head.appendChild(meta);
                }
                meta.content = content;
            };

            updateOrCreateMeta('og:title', config.storeName || 'Jewel Store');
            updateOrCreateMeta('og:description', config.storeDescription || 'Premium jewelry collection');
            updateOrCreateMeta('og:site_name', config.storeName || 'Jewel Store');
            if (config.logoUrl) {
                updateOrCreateMeta('og:image', config.logoUrl);
            }

            const updateOrCreateTwitterMeta = (name: string, content: string) => {
                let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.name = name;
                    document.head.appendChild(meta);
                }
                meta.content = content;
            };

            updateOrCreateTwitterMeta('twitter:title', config.storeName || 'Jewel Store');
            updateOrCreateTwitterMeta('twitter:description', config.storeDescription || 'Premium jewelry collection');
            if (config.logoUrl) {
                updateOrCreateTwitterMeta('twitter:image', config.logoUrl);
            }
        }
    };

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const data = expandConfigMedia(await api.getConfig());
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
