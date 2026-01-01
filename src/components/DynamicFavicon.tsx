'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * DynamicFavicon component
 * Updates the favicon to use the logo from admin panel
 * Must be placed inside ThemeProvider
 */
export default function DynamicFavicon() {
    const { config } = useTheme();
    const createdLinksRef = useRef<HTMLLinkElement[]>([]);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            // Clean up only the links we created
            createdLinksRef.current.forEach(link => {
                try {
                    if (link.parentNode) {
                        link.parentNode.removeChild(link);
                    }
                } catch (e) {
                    // Ignore errors during cleanup
                }
            });
            createdLinksRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (!config || !isMountedRef.current) return;

        // Use logoUrl as the favicon
        const faviconUrl = config.logoUrl;

        if (!faviconUrl) return;

        // Clean up previously created links
        createdLinksRef.current.forEach(link => {
            try {
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
            } catch (e) {
                // Ignore errors
            }
        });
        createdLinksRef.current = [];

        // Create new favicon link
        const createFaviconLink = (rel: string, href: string) => {
            try {
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
                    link.type = 'image/png';
                }
                document.head.appendChild(link);
                createdLinksRef.current.push(link);
            } catch (e) {
                console.error('Error creating favicon link:', e);
            }
        };

        // Add cache-busting parameter
        const cacheBustedUrl = faviconUrl.includes('?')
            ? `${faviconUrl}&v=${Date.now()}`
            : `${faviconUrl}?v=${Date.now()}`;

        // Create multiple favicon references for cross-browser support
        createFaviconLink('icon', cacheBustedUrl);
        createFaviconLink('apple-touch-icon', cacheBustedUrl);

    }, [config?.logoUrl]);

    return null; // This component doesn't render anything
}
