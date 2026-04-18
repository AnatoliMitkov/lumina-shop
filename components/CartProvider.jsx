"use client";

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { buildCartSnapshot, normalizeCartItem, readBrowserCartItems, writeBrowserCartItems } from '../utils/cart';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartStatus, setCartStatus] = useState('idle');
    const [checkoutStatus, setCheckoutStatus] = useState('idle');
    const [cartMessage, setCartMessage] = useState('');
    const [cartPersistenceMode, setCartPersistenceMode] = useState('browser');
    const [hasLoadedCart, setHasLoadedCart] = useState(false);
    const skipNextSyncRef = useRef(false);
    const didMutateBeforeLoadRef = useRef(false);

    useEffect(() => {
        let isActive = true;

        async function loadCart() {
            setCartStatus('loading');
            const browserItems = readBrowserCartItems();

            if (browserItems.length) {
                setCartItems(browserItems);
            }

            try {
                const response = await fetch('/api/cart', { cache: 'no-store' });
                const data = await response.json().catch(() => ({}));

                if (!isActive) {
                    return;
                }

                if (!response.ok) {
                    throw new Error(data.error || data.warning || 'Unable to restore the cart session.');
                }

                const persistenceMode = data?.persistence === 'supabase' ? 'supabase' : 'browser';
                const incomingItems = buildCartSnapshot(data?.cart?.items).items;
                setCartPersistenceMode(persistenceMode);
                skipNextSyncRef.current = persistenceMode === 'supabase' && !didMutateBeforeLoadRef.current;
                setCartItems((currentItems) => {
                    if (persistenceMode !== 'supabase') {
                        return currentItems.length ? currentItems : incomingItems;
                    }

                    if (didMutateBeforeLoadRef.current) {
                        return currentItems;
                    }

                    return incomingItems;
                });

                if (data.warning) {
                    setCartStatus('error');
                    setCartMessage(data.warning);
                } else {
                    setCartStatus('ready');
                    setCartMessage('');
                }
            } catch (error) {
                if (!isActive) {
                    return;
                }

                setCartPersistenceMode('browser');

                if (browserItems.length) {
                    setCartStatus('ready');
                    setCartMessage('');
                } else {
                    setCartStatus('error');
                    setCartMessage(error.message || 'Unable to restore the cart session.');
                }
            } finally {
                if (isActive) {
                    setHasLoadedCart(true);
                }
            }
        }

        loadCart();

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (!hasLoadedCart) {
            return;
        }

        const snapshot = buildCartSnapshot(cartItems);
        writeBrowserCartItems(snapshot.items);

        if (cartPersistenceMode !== 'supabase') {
            setCartStatus('ready');
            return;
        }

        if (skipNextSyncRef.current) {
            skipNextSyncRef.current = false;
            return;
        }

        let isActive = true;
        const timer = window.setTimeout(async () => {
            setCartStatus('saving');

            try {
                const response = await fetch('/api/cart', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ items: snapshot.items }),
                });
                const data = await response.json().catch(() => ({}));

                if (!isActive) {
                    return;
                }

                if (!response.ok) {
                    throw new Error(data.error || data.warning || 'Unable to sync the cart.');
                }

                setCartStatus('ready');
                setCartMessage(data.warning || '');
            } catch (error) {
                if (!isActive) {
                    return;
                }

                setCartStatus('error');
                setCartMessage(error.message || 'Unable to sync the cart.');
            }
        }, 250);

        return () => {
            isActive = false;
            window.clearTimeout(timer);
        };
    }, [cartItems, cartPersistenceMode, hasLoadedCart]);

    const markLocalMutation = () => {
        if (!hasLoadedCart) {
            didMutateBeforeLoadRef.current = true;
        }

        setCheckoutStatus('idle');
        setCartMessage('');
    };

    const addToCart = (product) => {
        markLocalMutation();
        setCartItems((prev) => [...prev, normalizeCartItem(product)]);
        setIsCartOpen(true); // Open sidebar instantly when adding an item
    };

    const removeFromCart = (indexToRemove) => {
        markLocalMutation();
        setCartItems((prev) => prev.filter((_, i) => i !== indexToRemove));
    };

    const checkoutCart = async (checkoutDetails = null) => {
        const snapshot = buildCartSnapshot(cartItems);

        if (snapshot.itemCount === 0 || checkoutStatus === 'submitting' || cartPersistenceMode !== 'supabase') {
            return null;
        }

        setCheckoutStatus('submitting');
        setCartMessage('');

        try {
            const response = await fetch('/api/cart/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items: snapshot.items, checkout: checkoutDetails }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to submit the order right now.');
            }

            skipNextSyncRef.current = true;
            setCartItems([]);
            setCartStatus('ready');
            setCheckoutStatus('success');
            setCartMessage(data.message || 'Your order is now waiting for atelier review.');

            return data.order || null;
        } catch (error) {
            setCartStatus('error');
            setCheckoutStatus('error');
            setCartMessage(error.message || 'Unable to submit the order right now.');

            return null;
        }
    };

    const cartTotal = buildCartSnapshot(cartItems).total;

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, cartTotal, isCartOpen, setIsCartOpen, cartStatus, checkoutStatus, cartMessage, cartPersistenceMode, hasLoadedCart, checkoutCart }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error('useCart must be used within CartProvider.');
    }

    return context;
}