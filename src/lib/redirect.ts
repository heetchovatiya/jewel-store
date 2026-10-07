/**
 * Read `?redirect=` from the current URL and return it only if it is a
 * path on this site (prevents open-redirects like ?redirect=https://evil.com).
 */
export function getSafeRedirect(fallback = '/'): string {
    if (typeof window === 'undefined') return fallback;
    const value = new URLSearchParams(window.location.search).get('redirect');
    if (!value) return fallback;
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
    return value;
}

/** Carry the current `?redirect=` along to another auth page (login <-> register). */
export function withRedirect(path: string): string {
    if (typeof window === 'undefined') return path;
    const target = getSafeRedirect('');
    return target ? `${path}?redirect=${encodeURIComponent(target)}` : path;
}
