"use client";

import { useCart } from './CartProvider';

export default function AddToCartBtn({ product, label = 'Add to Cart', disabled = false }) {
    const { addToCart } = useCart();
    
    return (
        <button 
            type="button"
            disabled={disabled}
            onClick={() => addToCart(product)}
            className="hero-sub opacity-0 w-full py-6 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover-target transition-colors hover:bg-black disabled:pointer-events-none disabled:bg-[#1C1C1C]/60 disabled:text-[#EFECE8]/72"
        >
            {label}
        </button>
    );
}