"use client";

import { useState } from 'react';
import { useCart } from '../../../../components/CartProvider';
import { formatProductCurrency } from '../../../../utils/products';

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL'];

export default function ProductActions({ product }) {
    const { addToCart } = useCart();
    const [selectedSize, setSelectedSize] = useState('');
    const [added, setAdded] = useState(false);

    const isMadeToOrder = product.inventory_count === 0;
    const isLowStock = product.inventory_count > 0 && product.inventory_count <= 2;

    function handleAddToCart() {
        addToCart({
            ...product,
            selected_size: selectedSize,
        });

        setAdded(true);
        setTimeout(() => setAdded(false), 2200);
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Price */}
            <div className="flex items-baseline gap-4">
                <span className="font-serif text-3xl md:text-4xl font-light">
                    {formatProductCurrency(product.price)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price ? (
                    <span className="v2-price text-[#1C1C1C]/35 line-through">
                        {formatProductCurrency(product.compare_at_price)}
                    </span>
                ) : null}
            </div>

            {/* Stock / lead time */}
            {isMadeToOrder ? (
                <p className="v2-label text-[#1C1C1C]/45">
                    Made to Order · {product.lead_time_days}-day lead time
                </p>
            ) : isLowStock ? (
                <p className="v2-label text-[#A78B65]">
                    Only {product.inventory_count} left
                </p>
            ) : null}

            {/* Size selector */}
            <div>
                <p className="v2-label text-[#1C1C1C]/45 mb-3">Size</p>
                <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((size) => (
                        <button
                            key={size}
                            type="button"
                            aria-pressed={selectedSize === size}
                            onClick={() => setSelectedSize((prev) => (prev === size ? '' : size))}
                            className={`v2-btn py-2 px-4 text-[10px] ${
                                selectedSize === size
                                    ? 'v2-btn-primary'
                                    : 'v2-btn-secondary'
                            }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            {/* Add to cart */}
            <button
                type="button"
                onClick={handleAddToCart}
                disabled={added}
                className="v2-btn v2-btn-primary w-full py-4 text-xs"
                style={{ letterSpacing: 'var(--v2-tracking-widest)' }}
            >
                {added ? 'Added to Cart ✓' : 'Add to Cart'}
            </button>

            {/* Contact for bespoke */}
            <a
                href="/contact"
                className="v2-btn v2-btn-secondary w-full py-4 text-xs text-center"
                style={{ letterSpacing: 'var(--v2-tracking-widest)' }}
            >
                Commission Bespoke
            </a>
        </div>
    );
}
