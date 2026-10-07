'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import api from '@/lib/api';
import { useAuth } from './AuthContext';
import type { CartItem, CartIssue, CartResponse, GuestCartLine } from '@/types/commerce';
import {
    addGuestLine,
    clearGuestCart,
    readGuestCart,
    setGuestLineQuantity,
    writeGuestCart,
} from '@/lib/guestCart';

interface CartContextType {
    items: CartItem[];
    total: number;
    itemCount: number;
    loading: boolean;
    /** True once the cart for the current login state has been loaded (and any guest cart merged). */
    ready: boolean;
    /** True when the cart lives in this browser (shopper is not logged in). */
    isGuest: boolean;
    /** Messages about items that were removed or reduced (e.g. out of stock). */
    notices: string[];
    dismissNotices: () => void;
    addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
    updateQuantity: (lineId: string, quantity: number) => Promise<void>;
    removeItem: (lineId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
    items: [],
    total: 0,
    itemCount: 0,
    loading: false,
    ready: false,
    isGuest: true,
    notices: [],
    dismissNotices: () => { },
    addToCart: async () => { },
    updateQuantity: async () => { },
    removeItem: async () => { },
    clearCart: async () => { },
    refreshCart: async () => { },
});

const issueText = (i: CartIssue) => (i.title ? `${i.title}: ${i.message}` : i.message);

/** Keep the browser copy in sync with what the server accepted (drops dead lines, caps quantities). */
const toGuestLines = (cart: CartResponse): GuestCartLine[] =>
    cart.items.map((i) => ({
        productId: i.productId,
        ...(i.variantId ? { variantId: i.variantId } : {}),
        quantity: i.quantity,
    }));

export function CartProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);
    const [total, setTotal] = useState(0);
    const [itemCount, setItemCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const [notices, setNotices] = useState<string[]>([]);
    // Ignore responses from a previous login state (e.g. logout during a fetch)
    const requestSeq = useRef(0);

    const apply = useCallback((cart: Pick<CartResponse, 'items' | 'total' | 'itemCount'>) => {
        setItems(cart.items);
        setTotal(cart.total);
        setItemCount(cart.itemCount);
    }, []);

    const empty = useCallback(() => apply({ items: [], total: 0, itemCount: 0 }), [apply]);

    const loadGuestCart = useCallback(async (seq: number) => {
        const lines = readGuestCart();
        if (lines.length === 0) {
            empty();
            return;
        }
        const cart = await api.previewGuestCart(lines);
        if (seq !== requestSeq.current) return;
        writeGuestCart(toGuestLines(cart));
        apply(cart);
        if (cart.issues?.length) setNotices(cart.issues.map(issueText));
    }, [apply, empty]);

    const loadServerCart = useCallback(async (seq: number) => {
        const guestLines = readGuestCart();
        if (guestLines.length > 0) {
            // Just logged in with items added as a guest: move them into the account cart
            try {
                const merged = await api.mergeGuestCart(guestLines);
                clearGuestCart();
                if (seq !== requestSeq.current) return;
                apply(merged);
                if (merged.issues?.length) setNotices(merged.issues.map(issueText));
                return;
            } catch (err) {
                // Keep the guest cart in storage so it can be retried next time
                console.error('Failed to merge guest cart:', err);
            }
        }
        const cart = await api.getCart();
        if (seq !== requestSeq.current) return;
        apply(cart);
    }, [apply]);

    const fetchCart = useCallback(async () => {
        if (authLoading) return;
        const seq = ++requestSeq.current;
        try {
            setLoading(true);
            if (isAuthenticated) {
                await loadServerCart(seq);
            } else {
                await loadGuestCart(seq);
            }
        } catch (err) {
            console.error('Failed to fetch cart:', err);
        } finally {
            if (seq === requestSeq.current) {
                setLoading(false);
                setReady(true);
            }
        }
    }, [authLoading, isAuthenticated, loadGuestCart, loadServerCart]);

    useEffect(() => {
        setReady(false);
        fetchCart();
    }, [fetchCart]);

    const addToCart = async (productId: string, quantity = 1, variantId?: string) => {
        setLoading(true);
        try {
            if (isAuthenticated) {
                await api.addToCart(productId, quantity, variantId);
                await fetchCart();
                return;
            }

            const next = addGuestLine(readGuestCart(), productId, quantity, variantId);
            const cart = await api.previewGuestCart(next);
            const problem = cart.issues?.find(
                (i) => i.productId === productId && (i.variantId || '') === (variantId || ''),
            );
            if (problem) {
                // Same behaviour as the logged-in cart: reject instead of silently changing it
                throw new Error(issueText(problem));
            }
            writeGuestCart(toGuestLines(cart));
            apply(cart);
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (lineId: string, quantity: number) => {
        setLoading(true);
        try {
            if (isAuthenticated) {
                await api.updateCartItem(lineId, quantity);
                await fetchCart();
                return;
            }
            const next = setGuestLineQuantity(readGuestCart(), lineId, quantity);
            const cart = next.length ? await api.previewGuestCart(next) : { items: [], total: 0, itemCount: 0 };
            writeGuestCart(toGuestLines(cart));
            apply(cart);
            if ('issues' in cart && cart.issues?.length) setNotices(cart.issues.map(issueText));
        } finally {
            setLoading(false);
        }
    };

    const removeItem = async (lineId: string) => {
        if (isAuthenticated) {
            setLoading(true);
            try {
                await api.removeFromCart(lineId);
                await fetchCart();
            } finally {
                setLoading(false);
            }
            return;
        }
        await updateQuantity(lineId, 0);
    };

    /** Clears local state after an order (the server already emptied the account cart). */
    const clearCart = async () => {
        if (!isAuthenticated) clearGuestCart();
        empty();
    };

    return (
        <CartContext.Provider
            value={{
                items,
                total,
                itemCount,
                loading,
                ready,
                isGuest: !isAuthenticated,
                notices,
                dismissNotices: () => setNotices([]),
                addToCart,
                updateQuantity,
                removeItem,
                clearCart,
                refreshCart: fetchCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
export default CartContext;
