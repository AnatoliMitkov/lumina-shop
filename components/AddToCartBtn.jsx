"use client";

import { useCart } from './CartProvider';
import EditableText from './site-copy/EditableText';
import { createLocalizedValue as localizedFallback } from '../utils/language';

export default function AddToCartBtn({ product, label = localizedFallback('Add to Cart', 'Добави в количката'), labelKey, editorLabel, disabled = false }) {
    const { addToCart } = useCart();
    
    return (
        <button 
            type="button"
            disabled={disabled}
            onClick={() => addToCart(product)}
            className="hero-sub opacity-0 w-full py-6 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-sm lg:text-base font-medium hover-target transition-colors hover:bg-black disabled:pointer-events-none disabled:bg-[#1C1C1C]/60 disabled:text-[#EFECE8]/72"
        >
            <EditableText contentKey={labelKey || 'product.purchase.add_to_cart'} fallback={label} editorLabel={editorLabel || 'Add to cart label'} />
        </button>
    );
}