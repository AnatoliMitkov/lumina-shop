"use client";

import { useState } from 'react';
import AddToCartBtn from './AddToCartBtn';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, resolveLocalizedValue } from '../utils/language';
import { getProductOptionCopyKey, resolveProductOptionText } from '../utils/product-copy';

const CUSTOM_SIZE_OPTION = 'Custom';
const customMeasurementFields = [
    { key: 'bust', label: 'Bust / Chest', placeholder: '84' },
    { key: 'waist', label: 'Waist', placeholder: '66' },
    { key: 'hips', label: 'Hips', placeholder: '92' },
    { key: 'back', label: 'Back', placeholder: '39' },
];

function getInitialSize(sizeOptions = []) {
    if (sizeOptions.includes('M')) {
        return 'M';
    }

    if (sizeOptions.includes('S')) {
        return 'S';
    }

    return sizeOptions[0] || '';
}

function createEmptyCustomMeasurements() {
    return customMeasurementFields.reduce((measurements, field) => {
        measurements[field.key] = '';
        return measurements;
    }, {});
}

export default function ProductPurchaseControls({ product, sizeOptions = [], toneOptions = [], onSizeChange, onToneChange }) {
    const siteCopy = useSiteCopy();
    const [selectedSize, setSelectedSize] = useState(() => getInitialSize(sizeOptions));
    const [selectedTone, setSelectedTone] = useState(() => toneOptions[0] || '');
    const [customMeasurementUnit, setCustomMeasurementUnit] = useState('CM');
    const [customMeasurements, setCustomMeasurements] = useState(() => createEmptyCustomMeasurements());
    const resolveStaticText = (key, fallback) => siteCopy ? siteCopy.resolveText(key, fallback) : resolveLocalizedValue(fallback, DEFAULT_LANGUAGE);
    const resolveToneLabel = (toneOption) => resolveProductOptionText(siteCopy, product, 'palette', toneOption);

    const isCustomSize = selectedSize === CUSTOM_SIZE_OPTION;
    const hasCompleteCustomMeasurements = customMeasurementFields.every(({ key }) => customMeasurements[key].trim().length > 0);
    const canAddToCart = Boolean(selectedSize) && (!isCustomSize || hasCompleteCustomMeasurements);
    const sizeStatusLabel = isCustomSize
        ? `${resolveStaticText('product.purchase.custom_short', localizedFallback('Custom', 'По мярка'))} / ${customMeasurementUnit}`
        : selectedSize || resolveStaticText('product.purchase.required_short', localizedFallback('Required', 'Задължително'));
    const buttonLabel = !selectedSize
        ? localizedFallback('Select Size First', 'Първо изберете размер')
        : isCustomSize && !hasCompleteCustomMeasurements
            ? localizedFallback('Enter Custom Measurements', 'Въведете индивидуалните мерки')
            : localizedFallback(`Add ${selectedSize} To Cart`, `Добави ${selectedSize} в количката`);
    const buttonLabelKey = !selectedSize
        ? 'product.purchase.add_to_cart.select_size'
        : isCustomSize && !hasCompleteCustomMeasurements
            ? 'product.purchase.add_to_cart.enter_custom'
            : 'product.purchase.add_to_cart.add_selected';

    const cartProduct = {
        ...product,
        selected_size: selectedSize,
        selected_tone: selectedTone,
        selected_size_unit: isCustomSize ? customMeasurementUnit : '',
        custom_measurements: isCustomSize ? customMeasurements : null,
    };

    const handleSizeSelect = (sizeOption) => {
        setSelectedSize(sizeOption);
        onSizeChange?.(sizeOption);
    };

    const handleCustomMeasurementChange = (fieldKey, nextValue) => {
        setCustomMeasurements((currentMeasurements) => ({
            ...currentMeasurements,
            [fieldKey]: nextValue,
        }));
    };

    return (
        <div className="hero-sub opacity-0 flex flex-col gap-5">
            {sizeOptions.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/44">
                        <span><EditableText contentKey="product.purchase.choose_size" fallback={localizedFallback('Choose Size', 'Изберете размер')} editorLabel="Product choose size label" /></span>
                        <span>{sizeStatusLabel}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((sizeOption) => {
                            const isActive = selectedSize === sizeOption;

                            return (
                                <button
                                    key={sizeOption}
                                    type="button"
                                    onClick={() => handleSizeSelect(sizeOption)}
                                    aria-pressed={isActive}
                                    className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors ${isActive ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/12 bg-white/70 text-[#1C1C1C]/58 hover:border-[#1C1C1C]/24 hover:text-[#1C1C1C]'}`}
                                >
                                    {sizeOption}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                        {isCustomSize
                            ? <EditableText contentKey="product.purchase.custom_size_help" fallback={localizedFallback('Enter all four measurements below for a custom atelier fit.', 'Въведете и четирите мерки по-долу за индивидуална atelierna кройка.')} editorLabel="Product custom size help" />
                            : <EditableText contentKey="product.purchase.measurements_help" fallback={localizedFallback('Measurements guide is available in the accordion below.', 'Ръководството за мерките е достъпно по-долу.')} editorLabel="Product measurements help" />}
                    </p>

                    {isCustomSize && (
                        <div className="grid grid-cols-1 gap-4 border border-[#1C1C1C]/10 bg-white/70 rounded-sm p-4 md:p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {customMeasurementFields.map((field) => (
                                    <label key={field.key} className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/46">
                                        <span><EditableText contentKey={`product.purchase.custom_measurements.${field.key}.label`} fallback={localizedFallback(field.label, field.label)} editorLabel={`${field.label} measurement label`} /></span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            inputMode="decimal"
                                            value={customMeasurements[field.key]}
                                            onChange={(event) => handleCustomMeasurementChange(field.key, event.target.value)}
                                            placeholder={field.placeholder}
                                            className="hover-target h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]/30"
                                        />
                                    </label>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_9rem] gap-3 items-end">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                                    <EditableText contentKey="product.purchase.custom_measurements.copy" fallback={localizedFallback('These measurements will be sent with the cart item so the atelier can review the fit before final confirmation.', 'Тези мерки се изпращат заедно с артикула в количката, за да може ателието да прегледа пасването преди финалното потвърждение.')} editorLabel="Product custom measurements copy" />
                                </p>

                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/46">
                                    <span><EditableText contentKey="product.purchase.custom_measurements.units" fallback={localizedFallback('Units', 'Единици')} editorLabel="Product custom measurement units" /></span>
                                    <select
                                        value={customMeasurementUnit}
                                        onChange={(event) => setCustomMeasurementUnit(event.target.value)}
                                        className="hover-target h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.16em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]/30"
                                    >
                                        <option value="CM">CM</option>
                                        <option value="INCH">INCH</option>
                                    </select>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {toneOptions.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-[#1C1C1C]/10 pt-5">
                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/44">
                        <span><EditableText contentKey="product.purchase.choose_tone" fallback={localizedFallback('Choose Tone', 'Изберете тон')} editorLabel="Product choose tone label" /></span>
                        <span>{resolveToneLabel(selectedTone || toneOptions[0] || '')}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {toneOptions.map((toneOption) => {
                            const isActive = selectedTone === toneOption;

                            return (
                                <button
                                    key={toneOption}
                                    type="button"
                                    onClick={() => {
                                        setSelectedTone(toneOption);
                                        onToneChange?.(toneOption);
                                    }}
                                    aria-pressed={isActive}
                                    className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors ${isActive ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/12 bg-white/70 text-[#1C1C1C]/58 hover:border-[#1C1C1C]/24 hover:text-[#1C1C1C]'}`}
                                >
                                    <EditableText contentKey={getProductOptionCopyKey(product, 'palette', toneOption)} fallback={toneOption} editorLabel={`${product.name || 'Product'} tone ${toneOption}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <AddToCartBtn product={cartProduct} label={buttonLabel} labelKey={buttonLabelKey} editorLabel="Product add to cart label" disabled={!canAddToCart} />
        </div>
    );
}