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

const BRAND = {
    primary: '#A67C3D',      // antique gold
    secondary: '#EFE2D5',    // rose blush
    background: '#F7F3EC',   // bone ivory
    text: '#1F1B16',         // ink brown
    oxblood: '#6B1E23',
    emerald: '#2F4A3C',
} as const;

const defaultConfig: StoreConfig = {
    storeName: 'Priyanci Gold',
    storeDescription: 'Certified gold, honestly priced',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: BRAND.primary,
    secondaryColor: BRAND.secondary,
    backgroundColor: BRAND.background,
    textColor: BRAND.text,
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

export function ThemeProvider({
    children,
    initialConfig,
}: {
    children: ReactNode;
    /** Server-fetched config so first paint isn't blocked on client /config */
    initialConfig?: StoreConfig | null;
}) {
    const seeded = initialConfig ? expandConfigMedia(initialConfig) : defaultConfig;
    const [config, setConfig] = useState<StoreConfig>(seeded);
    const [loading, setLoading] = useState(!initialConfig);
    const [error, setError] = useState<string | null>(null);

    const applyTheme = (next: StoreConfig) => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        // Storefront uses the locked brand system (ivory / ink / antique gold).
        root.style.setProperty('--primary', BRAND.primary);
        root.style.setProperty('--secondary', BRAND.secondary);
        root.style.setProperty('--background', BRAND.background);
        root.style.setProperty('--text', BRAND.text);
        root.style.setProperty('--antique-gold', BRAND.primary);
        root.style.setProperty('--antique-gold-text', '#8A5F26');
        root.style.setProperty('--oxblood', BRAND.oxblood);
        root.style.setProperty('--emerald', BRAND.emerald);
        root.style.setProperty('--rose-blush', BRAND.secondary);
        root.style.setProperty('--bone', BRAND.background);
        root.style.setProperty('--ink', BRAND.text);

        const faviconToUse = next.faviconUrl || next.logoUrl;
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
        // Do not mutate document.title / meta description — Next.js Metadata owns SEO tags.
    };

    const fetchConfig = async () => {
        try {
            if (!initialConfig) setLoading(true);
            const data = expandConfigMedia(await api.getConfig());
            setConfig(data);
            applyTheme(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch config:', err);
            setError('Failed to load store configuration');
            applyTheme(seeded);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        applyTheme(seeded);
        if (initialConfig) {
            setLoading(false);
            // Soft-revalidate after first paint — don't compete with LCP
            const run = () => {
                void fetchConfig();
            };
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                const id = window.requestIdleCallback(run, { timeout: 4000 });
                return () => window.cancelIdleCallback(id);
            }
            const t = globalThis.setTimeout(run, 2500);
            return () => globalThis.clearTimeout(t);
        }
        void fetchConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatPrice = (price: number) => {
        return `${config.currencySymbol}${price.toLocaleString('en-IN')}`;
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
