"use client";

import { useCart } from './CartProvider';

export default function AddToCartBtn({ product }) {
    const { addToCart } = useCart();
    
    return (
        <button 
            onClick={() => addToCart(product)}
            className="hero-sub opacity-0 w-full py-6 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover-target transition-colors hover:bg-black"
        >
            Add to Cart
        </button>
    );
}