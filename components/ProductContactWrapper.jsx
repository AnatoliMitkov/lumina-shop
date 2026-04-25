'use client';

import { useState } from 'react';
import ProductPurchaseControls from './ProductPurchaseControls';
import EditableText from './site-copy/EditableText';
import { createLocalizedValue as localizedFallback } from '../utils/language';

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
                <a href={`/contact?${contactParams}`} className="transition-link hover-target lumina-button uppercase tracking-[0.18em] text-[0.82rem] lg:text-[0.92rem] font-medium"><EditableText contentKey="product.cta.ask_atelier" fallback={localizedFallback('Ask Atelier', 'Свържете се с ателието')} editorLabel="Product ask atelier CTA" /></a>
                <a href="/collections" className="transition-link hover-target lumina-button uppercase tracking-[0.18em] text-[0.82rem] lg:text-[0.92rem] font-medium"><EditableText contentKey="product.cta.return_to_archive" fallback={localizedFallback('Return To Archive', 'Към архива')} editorLabel="Product return to archive CTA" /></a>
            </div>
        </div>
    );
}
