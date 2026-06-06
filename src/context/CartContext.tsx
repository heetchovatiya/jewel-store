'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api';
import { useAuth } from './AuthContext';
import type { CartItem } from '@/types/commerce';

interface CartContextType {
    items: CartItem[];
    total: number;
    itemCount: number;
    loading: boolean;
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
    addToCart: async () => { },
    updateQuantity: async () => { },
    removeItem: async () => { },
    clearCart: async () => { },
    refreshCart: async () => { },
});

export function CartProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);
    const [total, setTotal] = useState(0);
    const [itemCount, setItemCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchCart = async () => {
        if (!isAuthenticated) {
            setItems([]);
            setTotal(0);
            setItemCount(0);
            return;
        }

        try {
            setLoading(true);
            const cart = await api.getCart();
            setItems(cart.items);
            setTotal(cart.total);
            setItemCount(cart.itemCount);
        } catch (err) {
            console.error('Failed to fetch cart:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, [isAuthenticated]);

    const addToCart = async (productId: string, quantity = 1, variantId?: string) => {
        setLoading(true);
        try {
            await api.addToCart(productId, quantity, variantId);
            await fetchCart();
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (lineId: string, quantity: number) => {
        setLoading(true);
        try {
            await api.updateCartItem(lineId, quantity);
            await fetchCart();
        } finally {
            setLoading(false);
        }
    };

    const removeItem = async (lineId: string) => {
        setLoading(true);
        try {
            await api.removeFromCart(lineId);
            await fetchCart();
        } finally {
            setLoading(false);
        }
    };

    const clearCart = async () => {
        setItems([]);
        setTotal(0);
        setItemCount(0);
    };

    return (
        <CartContext.Provider
            value={{
                items,
                total,
                itemCount,
                loading,
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
