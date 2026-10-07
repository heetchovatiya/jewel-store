import type { GuestCartLine } from '@/types/commerce';

/**
 * Guest (logged-out) cart kept in the browser.
 * Only ids + quantities are stored; prices/titles always come from the API
 * via POST /cart/preview so they can never be tampered with or go stale.
 */
const STORAGE_KEY = 'guest_cart_v1';
const MAX_LINES = 50;

const sameLine = (a: GuestCartLine, productId: string, variantId?: string) =>
    a.productId === productId && (a.variantId || '') === (variantId || '');

export function readGuestCart(): GuestCartLine[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((l) => l && typeof l.productId === 'string' && Number(l.quantity) > 0)
            .map((l) => ({
                productId: l.productId,
                ...(l.variantId ? { variantId: String(l.variantId) } : {}),
                quantity: Math.min(99, Math.floor(Number(l.quantity))),
            }))
            .slice(0, MAX_LINES);
    } catch {
        return [];
    }
}

export function writeGuestCart(lines: GuestCartLine[]): void {
    if (typeof window === 'undefined') return;
    try {
        if (lines.length === 0) {
            window.localStorage.removeItem(STORAGE_KEY);
        } else {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.slice(0, MAX_LINES)));
        }
    } catch {
        /* storage blocked (private mode etc.) — cart lives in memory only */
    }
}

export function clearGuestCart(): void {
    writeGuestCart([]);
}

export function addGuestLine(
    lines: GuestCartLine[],
    productId: string,
    quantity: number,
    variantId?: string,
): GuestCartLine[] {
    const existing = lines.find((l) => sameLine(l, productId, variantId));
    if (existing) {
        return lines.map((l) =>
            sameLine(l, productId, variantId) ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l,
        );
    }
    return [...lines, { productId, ...(variantId ? { variantId } : {}), quantity }];
}

/** Guest line ids look like `g:<productId>:<variantId>` (built by the backend preview). */
export function parseGuestLineId(lineId: string): { productId: string; variantId?: string } | null {
    const m = /^g:([^:]+):(.*)$/.exec(lineId);
    if (!m) return null;
    return { productId: m[1], variantId: m[2] || undefined };
}

export function setGuestLineQuantity(lines: GuestCartLine[], lineId: string, quantity: number): GuestCartLine[] {
    const parsed = parseGuestLineId(lineId);
    if (!parsed) return lines;
    if (quantity <= 0) return lines.filter((l) => !sameLine(l, parsed.productId, parsed.variantId));
    return lines.map((l) =>
        sameLine(l, parsed.productId, parsed.variantId) ? { ...l, quantity: Math.min(99, quantity) } : l,
    );
}
