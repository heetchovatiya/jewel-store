'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * DynamicFavicon component
 * Updates the favicon to use the logo from admin panel
 * Must be placed inside ThemeProvider
 */
export default function DynamicFavicon() {
    const { config } = useTheme();

    useEffect(() => {
        if (!config) return;

        // Use logoUrl as the favicon (same image)
        const faviconUrl = config.logoUrl;

        if (!faviconUrl) return;

        // Remove all existing favicon links to avoid conflicts
        const existingFavicons = document.querySelectorAll<HTMLLinkElement>(
            'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
        );
        existingFavicons.forEach(link => link.remove());

        // Create new favicon link with cache-busting timestamp
        const createFaviconLink = (rel: string, href: string) => {
            const link = document.createElement('link');
            link.rel = rel;
            link.href = href;
            // Add type based on URL extension
            if (href.includes('.svg')) {
                link.type = 'image/svg+xml';
            } else if (href.includes('.png')) {
                link.type = 'image/png';
            } else if (href.includes('.ico')) {
                link.type = 'image/x-icon';
            } else {
                // Default for most image URLs (jpg, webp, etc.)
                link.type = 'image/png';
            }
            document.head.appendChild(link);
        };

        // Add cache-busting parameter to force refresh
        const cacheBustedUrl = faviconUrl.includes('?')
            ? `${faviconUrl}&v=${Date.now()}`
            : `${faviconUrl}?v=${Date.now()}`;

        // Create multiple favicon references for cross-browser support
        createFaviconLink('icon', cacheBustedUrl);
        createFaviconLink('shortcut icon', cacheBustedUrl);
        createFaviconLink('apple-touch-icon', cacheBustedUrl);

    }, [config?.logoUrl]);

    return null; // This component doesn't render anything
}
