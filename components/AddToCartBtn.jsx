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
            className="hero-sub opacity-0 lumina-button lumina-button--solid lumina-button--block hover-target uppercase tracking-[0.2em] text-sm lg:text-[0.98rem] font-medium"
        >
            <EditableText contentKey={labelKey || 'product.purchase.add_to_cart'} fallback={label} editorLabel={editorLabel || 'Add to cart label'} />
        </button>
    );
}