import api from '@/lib/api';
import type { PincodeServiceability } from '@/types/commerce';

const PIN_KEY = 'delivery_pincode';
const cache = new Map<string, Promise<PincodeServiceability>>();

export function getSavedPincode(): string {
    if (typeof window === 'undefined') return '';
    try {
        return window.localStorage.getItem(PIN_KEY) || '';
    } catch {
        return '';
    }
}

export function savePincode(pin: string): void {
    try {
        window.localStorage.setItem(PIN_KEY, pin);
    } catch {
        /* ignore */
    }
}

/** Cached per page-load so product page + checkout don't call the API twice for the same PIN. */
export function checkDelivery(pin: string): Promise<PincodeServiceability> {
    let p = cache.get(pin);
    if (!p) {
        p = api.checkServiceability(pin).catch((err) => {
            cache.delete(pin);
            throw err;
        });
        cache.set(pin, p);
    }
    return p;
}

export function formatEta(iso?: string): string | null {
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
