"use client";

import { useState } from 'react';
import AddToCartBtn from './AddToCartBtn';

function getInitialSize(sizeOptions = []) {
    if (sizeOptions.includes('Small')) {
        return 'Small';
    }

    return sizeOptions[0] || '';
}

export default function ProductPurchaseControls({ product, sizeOptions = [], toneOptions = [] }) {
    const [selectedSize, setSelectedSize] = useState(() => getInitialSize(sizeOptions));
    const [selectedTone, setSelectedTone] = useState(() => toneOptions[0] || '');

    const cartProduct = {
        ...product,
        selected_size: selectedSize,
        selected_tone: selectedTone,
    };

    return (
        <div className="hero-sub opacity-0 flex flex-col gap-5">
            {sizeOptions.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/44">
                        <span>Choose Size</span>
                        <span>{selectedSize || 'Required'}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((sizeOption) => {
                            const isActive = selectedSize === sizeOption;

                            return (
                                <button
                                    key={sizeOption}
                                    type="button"
                                    onClick={() => setSelectedSize(sizeOption)}
                                    aria-pressed={isActive}
                                    className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors ${isActive ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/12 bg-white/70 text-[#1C1C1C]/58 hover:border-[#1C1C1C]/24 hover:text-[#1C1C1C]'}`}
                                >
                                    {sizeOption}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Measurements guide is available in the accordion below.</p>
                </div>
            )}

            {toneOptions.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-[#1C1C1C]/10 pt-5">
                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/44">
                        <span>Choose Tone</span>
                        <span>{selectedTone || toneOptions[0]}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {toneOptions.map((toneOption) => {
                            const isActive = selectedTone === toneOption;

                            return (
                                <button
                                    key={toneOption}
                                    type="button"
                                    onClick={() => setSelectedTone(toneOption)}
                                    aria-pressed={isActive}
                                    className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors ${isActive ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/12 bg-white/70 text-[#1C1C1C]/58 hover:border-[#1C1C1C]/24 hover:text-[#1C1C1C]'}`}
                                >
                                    {toneOption}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <AddToCartBtn product={cartProduct} label={selectedSize ? `Add ${selectedSize} To Cart` : 'Select Size First'} disabled={!selectedSize} />
        </div>
    );
}