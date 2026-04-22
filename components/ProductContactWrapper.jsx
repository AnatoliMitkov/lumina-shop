'use client';

import { useState } from 'react';
import ProductPurchaseControls from './ProductPurchaseControls';
import EditableText from './site-copy/EditableText';

export default function ProductContactWrapper({ product, sizeOptions, toneOptions }) {
    const [selectedSize, setSelectedSize] = useState(() => {
        if (sizeOptions.includes('M')) return 'M';
        if (sizeOptions.includes('S')) return 'S';
        return sizeOptions[0] || '';
    });
    const [selectedTone, setSelectedTone] = useState(() => toneOptions[0] || '');

    // Build URL with selected product info
    const contactParams = new URLSearchParams({
        product: product.name,
        size: selectedSize,
        tone: selectedTone,
    }).toString();

    return (
        <div>
            <ProductPurchaseControls 
                product={product} 
                sizeOptions={sizeOptions} 
                toneOptions={toneOptions}
                onSizeChange={setSelectedSize}
                onToneChange={setSelectedTone}
            />

            <div className="hero-sub opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <a href={`/contact?${contactParams}`} className="transition-link hover-target inline-flex items-center justify-center px-6 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:bg-white transition-colors"><EditableText contentKey="product.cta.ask_atelier" fallback="Ask Atelier" editorLabel="Product ask atelier CTA" /></a>
                <a href="/collections" className="transition-link hover-target inline-flex items-center justify-center px-6 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:bg-white transition-colors"><EditableText contentKey="product.cta.return_to_archive" fallback="Return To Archive" editorLabel="Product return to archive CTA" /></a>
            </div>
        </div>
    );
}
