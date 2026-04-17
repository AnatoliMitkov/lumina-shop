"use client";

import { useDeferredValue, useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import {
    PRODUCT_DEFAULTS,
    PRODUCT_CATEGORY_OPTIONS,
    PRODUCT_COLLECTION_OPTIONS,
    PRODUCT_STATUS_OPTIONS,
    PRODUCT_STORAGE_BUCKET,
    buildProductMutationInput,
    createEmptyProductDraft,
    createProductEditorState,
    formatProductCurrency,
    normalizeProductRecord,
    resolveProductGallery,
    slugifyProductName,
    sortProducts,
} from '../utils/products';

const supabase = createClient();
const BULK_EDIT_FIELD_LABELS = {
    status: 'Status',
    category: 'Category',
    collection: 'Collection',
    featured: 'Featured',
    inventory_count: 'Inventory',
    lead_time_days: 'Lead Time',
};
const BULK_EDIT_FIELD_DEFAULTS = {
    status: PRODUCT_DEFAULTS.status,
    category: PRODUCT_DEFAULTS.category,
    collection: PRODUCT_DEFAULTS.collection,
    featured: String(PRODUCT_DEFAULTS.featured),
    inventory_count: String(PRODUCT_DEFAULTS.inventory_count),
    lead_time_days: String(PRODUCT_DEFAULTS.lead_time_days),
};
const BULK_GRID_COLUMN_DEFINITIONS = [
    { key: 'name', label: 'Product', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: PRODUCT_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })) },
    { key: 'category', label: 'Category', type: 'select', options: PRODUCT_CATEGORY_OPTIONS.map((option) => ({ value: option, label: option })) },
    { key: 'collection', label: 'Collection', type: 'select', options: PRODUCT_COLLECTION_OPTIONS.map((option) => ({ value: option, label: option })) },
    { key: 'featured', label: 'Featured', type: 'boolean' },
    { key: 'price', label: 'Price', type: 'number', min: '0', step: '0.01' },
    { key: 'compare_at_price', label: 'Compare Price', type: 'number', min: '0', step: '0.01' },
    { key: 'inventory_count', label: 'Inventory', type: 'number', min: '0', step: '1' },
    { key: 'lead_time_days', label: 'Lead Time', type: 'number', min: '1', step: '1' },
    { key: 'sort_order', label: 'Sort Order', type: 'number', step: '1' },
];
const DEFAULT_BULK_GRID_COLUMNS = ['name', 'status', 'collection', 'featured', 'price', 'inventory_count'];

function createBulkGridRowDraft(product = PRODUCT_DEFAULTS) {
    return {
        name: String(product.name ?? ''),
        status: String(product.status ?? PRODUCT_DEFAULTS.status),
        category: String(product.category ?? PRODUCT_DEFAULTS.category),
        collection: String(product.collection ?? PRODUCT_DEFAULTS.collection),
        featured: Boolean(product.featured),
        price: String(product.price ?? PRODUCT_DEFAULTS.price),
        compare_at_price: product.compare_at_price == null ? '' : String(product.compare_at_price),
        inventory_count: String(product.inventory_count ?? PRODUCT_DEFAULTS.inventory_count),
        lead_time_days: String(product.lead_time_days ?? PRODUCT_DEFAULTS.lead_time_days),
        sort_order: String(product.sort_order ?? PRODUCT_DEFAULTS.sort_order),
    };
}

function createBulkGridDraft(products = []) {
    return Object.fromEntries(products.map((product) => [product.id, createBulkGridRowDraft(product)]));
}

function areBulkGridDraftsEqual(leftDraft = {}, rightDraft = {}) {
    const leftKeys = Object.keys(leftDraft);
    const rightKeys = Object.keys(rightDraft);

    if (leftKeys.length !== rightKeys.length) {
        return false;
    }

    return leftKeys.every((key) => {
        const leftRow = leftDraft[key] || {};
        const rightRow = rightDraft[key] || {};

        return BULK_GRID_COLUMN_DEFINITIONS.every(({ key: columnKey }) => leftRow[columnKey] === rightRow[columnKey]);
    });
}

function isBulkGridRowDirty(product, rowDraft = {}) {
    const baseline = createBulkGridRowDraft(product);

    return BULK_GRID_COLUMN_DEFINITIONS.some(({ key }) => baseline[key] !== rowDraft[key]);
}

function getBulkGridColumnDefinition(columnKey) {
    return BULK_GRID_COLUMN_DEFINITIONS.find((column) => column.key === columnKey) || BULK_GRID_COLUMN_DEFINITIONS[0];
}

function createBulkEditEnabledState() {
    return {
        status: false,
        category: false,
        collection: false,
        featured: false,
        inventory_count: false,
        lead_time_days: false,
    };
}

function resolveSharedSelectionValue(values, fallback) {
    const normalizedValues = values
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);

    if (normalizedValues.length === 0) {
        return String(fallback);
    }

    const uniqueValues = [...new Set(normalizedValues)];
    return uniqueValues.length === 1 ? uniqueValues[0] : String(fallback);
}

function buildBulkEditDraft(products = []) {
    const firstProduct = products[0] ?? PRODUCT_DEFAULTS;

    return {
        status: resolveSharedSelectionValue(products.map((product) => product.status), firstProduct.status || BULK_EDIT_FIELD_DEFAULTS.status),
        category: resolveSharedSelectionValue(products.map((product) => product.category), firstProduct.category || BULK_EDIT_FIELD_DEFAULTS.category),
        collection: resolveSharedSelectionValue(products.map((product) => product.collection), firstProduct.collection || BULK_EDIT_FIELD_DEFAULTS.collection),
        featured: resolveSharedSelectionValue(products.map((product) => String(Boolean(product.featured))), String(Boolean(firstProduct.featured))),
        inventory_count: resolveSharedSelectionValue(products.map((product) => String(product.inventory_count ?? PRODUCT_DEFAULTS.inventory_count)), String(firstProduct.inventory_count ?? PRODUCT_DEFAULTS.inventory_count)),
        lead_time_days: resolveSharedSelectionValue(products.map((product) => String(product.lead_time_days ?? PRODUCT_DEFAULTS.lead_time_days)), String(firstProduct.lead_time_days ?? PRODUCT_DEFAULTS.lead_time_days)),
    };
}

function getStatusLabel(value) {
    return PRODUCT_STATUS_OPTIONS.find((option) => option.value === value)?.label || value;
}

function formatBulkPreviewValue(field, value) {
    switch (field) {
        case 'status':
            return getStatusLabel(value);
        case 'featured':
            return value === 'true' ? 'On' : 'Off';
        case 'inventory_count':
            return `${value} units`;
        case 'lead_time_days':
            return `${value} days`;
        default:
            return value;
    }
}

function summarizeSelectionField(products = [], resolveValue, formatter = (value) => value) {
    const values = [...new Set(products.map(resolveValue).map((value) => String(value ?? '').trim()).filter(Boolean))];

    if (values.length === 0) {
        return 'None';
    }

    if (values.length === 1) {
        return formatter(values[0]);
    }

    return 'Mixed';
}

function buildSelectionSnapshot(products = []) {
    if (products.length === 0) {
        return [];
    }

    const featuredCount = products.filter((product) => product.featured).length;

    return [
        { label: 'Status', value: summarizeSelectionField(products, (product) => product.status, (value) => getStatusLabel(value)) },
        { label: 'Collection', value: summarizeSelectionField(products, (product) => product.collection) },
        { label: 'Category', value: summarizeSelectionField(products, (product) => product.category) },
        { label: 'Featured', value: featuredCount === 0 ? 'Off' : featuredCount === products.length ? 'On' : 'Mixed' },
        { label: 'Inventory', value: summarizeSelectionField(products, (product) => product.inventory_count, (value) => `${value} units`) },
        { label: 'Lead Time', value: summarizeSelectionField(products, (product) => product.lead_time_days, (value) => `${value} days`) },
    ];
}

function formatDate(value) {
    if (!value) {
        return 'Pending';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function getStatusClasses(status) {
    switch (status) {
        case 'active':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'archived':
            return 'border-[#1C1C1C]/12 bg-[#EFE7DA] text-[#1C1C1C]/62';
        default:
            return 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]';
    }
}

function buildOrderSummary(order) {
    if (!Array.isArray(order?.items) || order.items.length === 0) {
        return 'Selection archived in Supabase.';
    }

    const names = order.items.map((item) => item?.name).filter(Boolean);

    if (names.length === 0) {
        return 'Selection archived in Supabase.';
    }

    if (names.length <= 2) {
        return names.join(', ');
    }

    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

function buildInquiryPreview(message) {
    const safeMessage = typeof message === 'string' ? message : '';
    const trimmedMessage = safeMessage.split('\n\nAttached selection:')[0].trim() || safeMessage.trim();

    if (!trimmedMessage) {
        return 'Atelier note saved for follow-up.';
    }

    return trimmedMessage.length > 140 ? `${trimmedMessage.slice(0, 137)}...` : trimmedMessage;
}

function MetricCard({ label, value, copy }) {
    return (
        <div className="border border-[#1C1C1C]/10 bg-white/65 rounded-sm p-5 md:p-6 flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42">{label}</p>
            <p className="font-serif text-3xl md:text-4xl font-light leading-none text-[#1C1C1C]">{value}</p>
            <p className="text-sm leading-relaxed text-[#1C1C1C]/56">{copy}</p>
        </div>
    );
}

function FilterButton({ label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${active ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/12 bg-white/70 text-[#1C1C1C]/58 hover:text-[#1C1C1C]'}`}
        >
            {label}
        </button>
    );
}

function describeProductSelection(products = []) {
    if (products.length === 0) {
        return 'No products selected yet.';
    }

    const names = products
        .slice(0, 3)
        .map((product) => product.name || 'Untitled Piece');

    if (products.length > 3) {
        return `${names.join(', ')} +${products.length - 3} more`;
    }

    return names.join(', ');
}

function ModalShell({ open, onClose, children, maxWidth = 'max-w-xl' }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!open) {
            setIsVisible(false);
            return undefined;
        }

        const frame = window.requestAnimationFrame(() => setIsVisible(true));
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('keydown', handleKeyDown);
            setIsVisible(false);
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-end justify-center bg-[#1C1C1C]/55 p-4 backdrop-blur-sm transition-opacity duration-200 sm:items-center ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`w-full ${maxWidth} rounded-[28px] border border-white/12 bg-[#111111] text-[#EFECE8] shadow-[0_28px_90px_rgba(0,0,0,0.35)] transition-all duration-200 ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.985] opacity-0'}`}
                onClick={(event) => event.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

function ConfirmDialog({
    open,
    title,
    copy,
    detail,
    confirmLabel,
    isLoading,
    onCancel,
    onConfirm,
}) {
    return (
        <ModalShell open={open} onClose={isLoading ? undefined : onCancel}>
            <div className="flex flex-col gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Confirm Action</p>
                    <h3 className="font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/70">{copy}</p>
                    {detail && <p className="text-xs leading-relaxed text-white/42">{detail}</p>}
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`hover-target h-12 px-5 rounded-full border border-white/12 bg-white/5 text-[10px] uppercase tracking-[0.22em] text-white/72 transition-colors ${isLoading ? 'opacity-60' : 'hover:bg-white/10'}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`hover-target h-12 px-6 rounded-full bg-[#EFE7DA] text-[#1C1C1C] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isLoading ? 'opacity-60' : 'hover:bg-white'}`}
                    >
                        {isLoading ? 'Deleting' : confirmLabel}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

function BulkFieldRow({ active, label, hint, children, onToggle }) {
    return (
        <div className={`rounded-sm border p-4 transition-colors ${active ? 'border-[#1C1C1C]/18 bg-white' : 'border-[#1C1C1C]/10 bg-white/72'}`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={onToggle}
                        className="mt-1 h-4 w-4 border border-[#1C1C1C]/25 accent-[#1C1C1C]"
                    />
                    <span className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/52">{label}</span>
                        <span className="text-sm leading-relaxed text-[#1C1C1C]/62">{hint}</span>
                    </span>
                </label>
                <div className={`xl:w-[min(320px,100%)] ${active ? '' : 'pointer-events-none opacity-45'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

function BulkEditorPanel({
    selectedProducts,
    selectedProductId,
    enabledFields,
    value,
    gridColumns,
    gridDraft,
    dirtyCount,
    feedback,
    isSaving,
    onToggleField,
    onChange,
    onGridColumnToggle,
    onGridChange,
    onGridSave,
    onReset,
    onSubmit,
    onOpenProduct,
    onRemoveProduct,
    onExit,
}) {
    const selectionSnapshot = buildSelectionSnapshot(selectedProducts);
    const preparedChanges = Object.entries(enabledFields)
        .filter(([, isEnabled]) => isEnabled)
        .map(([field]) => ({
            field,
            label: BULK_EDIT_FIELD_LABELS[field],
            value: formatBulkPreviewValue(field, value[field]),
        }));

    return (
        <section className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-6 md:p-8 flex flex-col gap-8 md:gap-10">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Property Batch Editor</p>
                    <h2 className="font-serif text-4xl md:text-5xl font-light uppercase tracking-[0.12em] leading-none">Edit {selectedProducts.length} Products</h2>
                    <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/58 max-w-3xl">This editor behaves like a shared property panel: enable only the fields you want to overwrite, review the current selection state, then apply the same values across the batch.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={onReset} className="hover-target h-12 px-5 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-white">Reset Changes</button>
                    <button type="button" onClick={onExit} className="hover-target h-12 px-5 bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors hover:bg-black">Single Editor</button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.12fr)_0.88fr] gap-6 md:gap-8 items-start">
                <div className="flex flex-col gap-4">
                    <div className="rounded-sm border border-[#1C1C1C]/10 bg-white/78 p-4 md:p-5 flex flex-col gap-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">Bulk Grid</p>
                                <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/56 max-w-2xl">Rows behave like product records and columns behave like editable properties. Toggle only the columns you care about, edit inline, then save the changed rows together.</p>
                            </div>
                            <button
                                type="button"
                                onClick={onGridSave}
                                disabled={isSaving || dirtyCount === 0}
                                className={`hover-target h-12 px-5 rounded-full bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isSaving || dirtyCount === 0 ? 'opacity-60' : 'hover:bg-black'}`}
                            >
                                {isSaving ? 'Saving Grid' : dirtyCount === 0 ? 'No Grid Changes' : `Save ${dirtyCount} Changed ${dirtyCount === 1 ? 'Row' : 'Rows'}`}
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {selectionSnapshot.map((item) => (
                                <div key={item.label} className="rounded-full border border-[#1C1C1C]/10 bg-[#EFECE8] px-3 py-2">
                                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">{item.label}</span>
                                    <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-[#1C1C1C]/74">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {BULK_GRID_COLUMN_DEFINITIONS.map((column) => {
                                const isActive = gridColumns.includes(column.key);

                                return (
                                    <button
                                        key={column.key}
                                        type="button"
                                        onClick={() => onGridColumnToggle(column.key)}
                                        className={`hover-target rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.2em] transition-colors ${isActive ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}
                                    >
                                        {column.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-sm border border-[#1C1C1C]/10 bg-white/82 overflow-hidden">
                        <div data-lenis-prevent-wheel className="max-h-[540px] overflow-auto overscroll-contain">
                            <table className="min-w-full border-collapse">
                                <thead className="sticky top-0 z-10 bg-[#F4EFE7]">
                                    <tr>
                                        {gridColumns.map((columnKey) => {
                                            const column = getBulkGridColumnDefinition(columnKey);

                                            return (
                                                <th key={columnKey} className="border-b border-[#1C1C1C]/10 px-4 py-3 text-left text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45 whitespace-nowrap">
                                                    {column.label}
                                                </th>
                                            );
                                        })}
                                        <th className="border-b border-[#1C1C1C]/10 px-4 py-3 text-right text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45 whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product) => {
                                        const rowDraft = gridDraft[product.id] || createBulkGridRowDraft(product);
                                        const rowIsDirty = isBulkGridRowDirty(product, rowDraft);

                                        return (
                                            <tr key={product.id} className={`${selectedProductId === product.id ? 'bg-[#1C1C1C]/[0.04]' : 'bg-white/55'} ${rowIsDirty ? 'shadow-[inset_3px_0_0_#1C1C1C]' : ''}`}>
                                                {gridColumns.map((columnKey) => {
                                                    const column = getBulkGridColumnDefinition(columnKey);

                                                    return (
                                                        <td key={columnKey} className="border-b border-[#1C1C1C]/8 px-4 py-3 align-top min-w-[140px]">
                                                            {column.type === 'select' ? (
                                                                <select
                                                                    value={rowDraft[columnKey]}
                                                                    onChange={(event) => onGridChange(product.id, columnKey, event.target.value)}
                                                                    className="h-11 w-full border border-[#1C1C1C]/10 bg-white px-3 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                                                                >
                                                                    {column.options.map((option) => (
                                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                                    ))}
                                                                </select>
                                                            ) : column.type === 'boolean' ? (
                                                                <label className="flex h-11 items-center justify-center rounded-sm border border-[#1C1C1C]/10 bg-white">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(rowDraft[columnKey])}
                                                                        onChange={(event) => onGridChange(product.id, columnKey, event.target.checked)}
                                                                        className="h-4 w-4 border border-[#1C1C1C]/20 accent-[#1C1C1C]"
                                                                    />
                                                                </label>
                                                            ) : (
                                                                <div className="flex flex-col gap-2">
                                                                    <input
                                                                        value={rowDraft[columnKey]}
                                                                        onChange={(event) => onGridChange(product.id, columnKey, event.target.value)}
                                                                        type={column.type}
                                                                        min={column.min}
                                                                        step={column.step}
                                                                        className="h-11 w-full border border-[#1C1C1C]/10 bg-white px-3 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                                                                    />
                                                                    {columnKey === 'name' && (
                                                                        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-[#1C1C1C]/42">
                                                                            <span>{product.category}</span>
                                                                            <span>{formatProductCurrency(product.price)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                <td className="border-b border-[#1C1C1C]/8 px-4 py-3 align-top">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <button type="button" onClick={() => onOpenProduct(product)} className="hover-target rounded-full border border-[#1C1C1C]/12 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/62 transition-colors hover:bg-[#1C1C1C] hover:text-[#EFECE8]">Inspect</button>
                                                        <button type="button" onClick={() => onRemoveProduct(product.id)} className="hover-target rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-red-700 transition-colors hover:bg-red-100">Remove</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="rounded-sm border border-[#1C1C1C]/10 bg-[#EFECE8]/65 p-4 md:p-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-3">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">Property Matrix</p>
                            <h3 className="mt-3 font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none">Apply Shared Changes</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-[#1C1C1C]/60">Enabled rows overwrite the selected products. Disabled rows stay untouched, so you can stack deliberate changes without surprise edits.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {preparedChanges.length === 0 ? (
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">No pending changes yet</span>
                        ) : (
                            preparedChanges.map((change) => (
                                <div key={change.field} className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/68">
                                    <span className="text-[#1C1C1C]/42">{change.label}</span>
                                    <span className="ml-2">{change.value}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <BulkFieldRow active={enabledFields.status} label="Status" hint="Push the whole selection into the same publishing state." onToggle={() => onToggleField('status')}>
                        <select value={value.status} onChange={(event) => onChange('status', event.target.value)} className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                            {PRODUCT_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </BulkFieldRow>

                    <BulkFieldRow active={enabledFields.category} label="Category" hint="Reclassify the selection under one product category." onToggle={() => onToggleField('category')}>
                        <select value={value.category} onChange={(event) => onChange('category', event.target.value)} className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                            {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </BulkFieldRow>

                    <BulkFieldRow active={enabledFields.collection} label="Collection" hint="Move the selected products into a single storefront collection." onToggle={() => onToggleField('collection')}>
                        <select value={value.collection} onChange={(event) => onChange('collection', event.target.value)} className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                            {PRODUCT_COLLECTION_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </BulkFieldRow>

                    <BulkFieldRow active={enabledFields.featured} label="Featured" hint="Promote or demote every selected product together." onToggle={() => onToggleField('featured')}>
                        <select value={value.featured} onChange={(event) => onChange('featured', event.target.value)} className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                            <option value="true">Mark as featured</option>
                            <option value="false">Remove from featured</option>
                        </select>
                    </BulkFieldRow>

                    <BulkFieldRow active={enabledFields.inventory_count} label="Inventory" hint="Set the same available count across the selection." onToggle={() => onToggleField('inventory_count')}>
                        <input value={value.inventory_count} onChange={(event) => onChange('inventory_count', event.target.value)} type="number" min="0" step="1" className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </BulkFieldRow>

                    <BulkFieldRow active={enabledFields.lead_time_days} label="Lead Time" hint="Set the delivery lead time in days for the full batch." onToggle={() => onToggleField('lead_time_days')}>
                        <input value={value.lead_time_days} onChange={(event) => onChange('lead_time_days', event.target.value)} type="number" min="1" step="1" className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </BulkFieldRow>

                    {feedback.message && <p className={`text-sm ${feedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/68'}`}>{feedback.message}</p>}

                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button type="button" onClick={onReset} className="hover-target h-12 px-5 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-white">Reset</button>
                        <button disabled={isSaving} className={`hover-target h-12 px-6 bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isSaving ? 'opacity-60' : 'hover:bg-black'}`}>
                            {isSaving ? 'Applying Changes' : `Apply to ${selectedProducts.length} Products`}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}

function ProductListItem({ product, active, selected, onSelect, onToggleSelected }) {
    const shellClasses = active
        ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]'
        : selected
            ? 'border-[#1C1C1C]/28 bg-white text-[#1C1C1C]'
            : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C] hover:bg-white';

    return (
        <div className={`rounded-sm border transition-colors ${shellClasses}`}>
            <div className="flex items-start gap-3 p-4">
                <label className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${active ? 'border-white/30 bg-white/10' : selected ? 'border-[#1C1C1C] bg-[#1C1C1C]' : 'border-[#1C1C1C]/20 bg-white'}`}>
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleSelected(product.id)}
                        className="sr-only"
                        aria-label={`Select ${product.name}`}
                    />
                    <span className={`h-2.5 w-2.5 rounded-full ${selected ? (active ? 'bg-white' : 'bg-[#EFECE8]') : 'bg-transparent'}`} />
                </label>

                <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                            <p className="font-serif text-2xl font-light leading-none truncate">{product.name}</p>
                            <p className={`mt-2 text-[10px] uppercase tracking-[0.24em] ${active ? 'text-white/55' : 'text-[#1C1C1C]/42'}`}>{product.collection}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${active ? 'border-white/15 bg-white/10 text-white/70' : getStatusClasses(product.status)}`}>{product.status}</span>
                    </div>

                    <div className={`flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] ${active ? 'text-white/55' : 'text-[#1C1C1C]/45'}`}>
                        <span>{formatProductCurrency(product.price)}</span>
                        <span>{formatDate(product.updated_at || product.created_at)}</span>
                    </div>
                </button>
            </div>
        </div>
    );
}

function ImageField({ label, value, field, onChange, onUpload, isUploading }) {
    return (
        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
            {label}
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                <input value={value} onChange={(event) => onChange(field, event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                <label className={`h-14 border border-[#1C1C1C]/12 flex items-center justify-center bg-white text-[10px] uppercase tracking-[0.22em] ${isUploading ? 'opacity-60' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'} transition-colors cursor-pointer`}>
                    {isUploading ? 'Uploading' : 'Upload'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => onUpload(event, field)} disabled={isUploading} />
                </label>
            </div>
        </label>
    );
}

export default function AdminDashboard({
    user,
    profile,
    initialProducts,
    recentOrders,
    recentInquiries,
    maintenanceMessage,
}) {
    const sortedInitialProducts = sortProducts(initialProducts ?? []);
    const [products, setProducts] = useState(sortedInitialProducts);
    const [selectedProductId, setSelectedProductId] = useState(sortedInitialProducts[0]?.id || 'new');
    const [draft, setDraft] = useState(
        sortedInitialProducts[0]
            ? createProductEditorState(sortedInitialProducts[0])
            : createEmptyProductDraft({
                category: 'Top',
                collection: 'Atelier Archive',
                status: 'draft',
                sort_order: 10,
            })
    );
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
    const [uploadFeedback, setUploadFeedback] = useState({ type: 'idle', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState(sortedInitialProducts[0]?.id ? [sortedInitialProducts[0].id] : []);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteTargetIds, setDeleteTargetIds] = useState([]);
    const [editorMode, setEditorMode] = useState('single');
    const [enabledBulkFields, setEnabledBulkFields] = useState(createBulkEditEnabledState);
    const [bulkEditDraft, setBulkEditDraft] = useState(() => buildBulkEditDraft());
    const [bulkGridColumns, setBulkGridColumns] = useState(DEFAULT_BULK_GRID_COLUMNS);
    const [bulkGridDraft, setBulkGridDraft] = useState({});
    const [bulkFeedback, setBulkFeedback] = useState({ type: 'idle', message: '' });
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    const activeCount = products.filter((product) => product.status === 'active').length;
    const draftCount = products.filter((product) => product.status === 'draft').length;
    const featuredCount = products.filter((product) => product.featured).length;
    const previewProduct = normalizeProductRecord({
        ...draft,
        gallery: draft.gallery,
        highlights: draft.highlights,
        tags: draft.tags,
        palette: draft.palette,
    });
    const previewImages = resolveProductGallery(previewProduct);
    const visibleProducts = sortProducts(products).filter((product) => {
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
        const matchesSearch = !deferredSearch
            || [product.name, product.collection, product.category, ...(product.tags || [])]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch);

        return matchesStatus && matchesSearch;
    });
    const selectedProductIdSet = new Set(selectedProductIds);
    const visibleProductIds = visibleProducts.map((product) => product.id);
    const visibleProductIdSet = new Set(visibleProductIds);
    const allVisibleSelected = visibleProductIds.length > 0 && visibleProductIds.every((productId) => selectedProductIdSet.has(productId));
    const selectedProducts = sortProducts(products.filter((product) => selectedProductIdSet.has(product.id)));
    const deleteTargetProducts = sortProducts(products.filter((product) => deleteTargetIds.includes(product.id)));
    const uiSelectedProducts = selectedProducts;
    const selectedProductCount = selectedProducts.length;
    const hasSelectedProducts = selectedProductCount > 0;
    const dirtyBulkGridCount = selectedProducts.filter((product) => isBulkGridRowDirty(product, bulkGridDraft[product.id] || createBulkGridRowDraft(product))).length;

    useEffect(() => {
        const availableProductIds = new Set(products.map((product) => product.id));

        setSelectedProductIds((currentIds) => {
            const nextIds = currentIds.filter((productId) => availableProductIds.has(productId));
            return nextIds.length === currentIds.length ? currentIds : nextIds;
        });
    }, [products]);

    useEffect(() => {
        setBulkGridDraft((currentDraft) => {
            const nextDraft = {};

            selectedProducts.forEach((product) => {
                nextDraft[product.id] = currentDraft[product.id]
                    ? {
                        ...createBulkGridRowDraft(product),
                        ...currentDraft[product.id],
                    }
                    : createBulkGridRowDraft(product);
            });

            return areBulkGridDraftsEqual(currentDraft, nextDraft) ? currentDraft : nextDraft;
        });
    }, [products, selectedProductIds]);

    useEffect(() => {
        if (selectedProducts.length === 0 && editorMode === 'bulk') {
            setEditorMode('single');
            setEnabledBulkFields(createBulkEditEnabledState());
            setBulkEditDraft(buildBulkEditDraft());
            setBulkGridDraft({});
            setBulkFeedback({ type: 'idle', message: '' });
        }
    }, [selectedProducts, editorMode]);

    const resetToNewDraft = (sourceProducts = products) => {
        const highestSortOrder = sourceProducts.reduce((runningMax, product) => Math.max(runningMax, product.sort_order || 0), 0);

        setEditorMode('single');
        setSelectedProductId('new');
        setDraft(createEmptyProductDraft({
            category: 'Top',
            collection: 'Atelier Archive',
            status: 'draft',
            sort_order: highestSortOrder + 10,
        }));
        setFeedback({ type: 'idle', message: '' });
        setUploadFeedback({ type: 'idle', message: '' });
    };

    const openProductEditor = (product) => {
        setEditorMode('single');
        setSelectedProductId(product.id);
        setDraft(createProductEditorState(product));
        setUploadFeedback({ type: 'idle', message: '' });
    };

    const selectExistingProduct = (product) => {
        openProductEditor(product);
        setFeedback({ type: 'idle', message: '' });
        setUploadFeedback({ type: 'idle', message: '' });
    };

    const toggleProductSelection = (productId) => {
        setSelectedProductIds((currentIds) => (
            currentIds.includes(productId)
                ? currentIds.filter((id) => id !== productId)
                : [...currentIds, productId]
        ));
    };

    const toggleVisibleSelection = () => {
        if (visibleProductIds.length === 0) {
            return;
        }

        setSelectedProductIds((currentIds) => {
            if (allVisibleSelected) {
                return currentIds.filter((productId) => !visibleProductIdSet.has(productId));
            }

            return [...new Set([...currentIds, ...visibleProductIds])];
        });
    };

    const clearSelectedProducts = () => {
        setSelectedProductIds([]);
    };

    const handleFieldChange = (field, value) => {
        setDraft((currentDraft) => {
            const nextDraft = {
                ...currentDraft,
                [field]: value,
            };

            if (field === 'name') {
                const currentSlug = String(currentDraft.slug || '');
                const previousGeneratedSlug = slugifyProductName(currentDraft.name || '');

                if (!currentSlug || currentSlug === previousGeneratedSlug) {
                    nextDraft.slug = slugifyProductName(value);
                }
            }

            return nextDraft;
        });
    };

    const handleUpload = async (event, field) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setIsUploading(true);
        setUploadFeedback({ type: 'idle', message: '' });

        try {
            const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${Date.now()}-${slugifyProductName(file.name.replace(/\.[^.]+$/, ''))}.${extension}`;
            const filePath = `products/${fileName}`;
            const { error } = await supabase.storage.from(PRODUCT_STORAGE_BUCKET).upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || undefined,
            });

            if (error) {
                throw error;
            }

            const { data } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(filePath);
            const uploadedUrl = data.publicUrl;

            setDraft((currentDraft) => {
                if (field === 'gallery') {
                    const existingGallery = String(currentDraft.gallery || '').trim();

                    return {
                        ...currentDraft,
                        gallery: existingGallery ? `${existingGallery}\n${uploadedUrl}` : uploadedUrl,
                    };
                }

                return {
                    ...currentDraft,
                    [field]: uploadedUrl,
                };
            });

            setUploadFeedback({ type: 'success', message: 'Image uploaded to Supabase Storage.' });
        } catch (error) {
            setUploadFeedback({ type: 'error', message: error.message || 'Unable to upload this image.' });
        } finally {
            event.target.value = '';
            setIsUploading(false);
        }
    };

    const resetBulkEditor = (sourceProducts = selectedProducts) => {
        setEnabledBulkFields(createBulkEditEnabledState());
        setBulkEditDraft(buildBulkEditDraft(sourceProducts));
        setBulkGridDraft(createBulkGridDraft(sourceProducts));
        setBulkFeedback({ type: 'idle', message: '' });
    };

    const openBulkEditor = () => {
        if (selectedProductIds.length === 0) {
            return;
        }

        resetBulkEditor(selectedProducts);
        setFeedback({ type: 'idle', message: '' });
        setEditorMode('bulk');
    };

    const exitBulkEditor = () => {
        if (isBulkSaving) {
            return;
        }

        setEditorMode('single');
        resetBulkEditor(selectedProducts);
    };

    const handleBulkFieldToggle = (field) => {
        setEnabledBulkFields((currentFields) => ({
            ...currentFields,
            [field]: !currentFields[field],
        }));
        setBulkFeedback({ type: 'idle', message: '' });
    };

    const handleBulkFieldChange = (field, value) => {
        setBulkEditDraft((currentDraft) => ({
            ...currentDraft,
            [field]: value,
        }));
        setBulkFeedback({ type: 'idle', message: '' });
    };

    const handleBulkGridColumnToggle = (columnKey) => {
        setBulkGridColumns((currentColumns) => {
            if (currentColumns.includes(columnKey)) {
                return currentColumns.length === 1 ? currentColumns : currentColumns.filter((entry) => entry !== columnKey);
            }

            const columnOrder = BULK_GRID_COLUMN_DEFINITIONS.map((column) => column.key);
            return [...currentColumns, columnKey].sort((leftColumn, rightColumn) => columnOrder.indexOf(leftColumn) - columnOrder.indexOf(rightColumn));
        });
    };

    const handleBulkGridChange = (productId, field, value) => {
        setBulkGridDraft((currentDraft) => ({
            ...currentDraft,
            [productId]: {
                ...(currentDraft[productId] || createBulkGridRowDraft(selectedProducts.find((product) => product.id === productId) || PRODUCT_DEFAULTS)),
                [field]: value,
            },
        }));
        setBulkFeedback({ type: 'idle', message: '' });
    };

    const handleBulkGridSave = async () => {
        if (dirtyBulkGridCount === 0 || isBulkSaving) {
            return;
        }

        const changedProducts = selectedProducts
            .filter((product) => isBulkGridRowDirty(product, bulkGridDraft[product.id] || createBulkGridRowDraft(product)))
            .map((product) => ({
                ...product,
                ...(bulkGridDraft[product.id] || {}),
            }));

        setIsBulkSaving(true);
        setBulkFeedback({ type: 'idle', message: '' });
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/admin/products', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ products: changedProducts }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to save the changed grid rows.');
            }

            const updatedProducts = Array.isArray(data.products)
                ? data.products.map((product) => normalizeProductRecord(product))
                : [];
            const updatesById = new Map(updatedProducts.map((product) => [product.id, product]));
            const nextProducts = sortProducts(products.map((product) => updatesById.get(product.id) || product));

            setProducts(nextProducts);

            if (selectedProductId !== 'new' && updatesById.has(selectedProductId)) {
                setDraft(createProductEditorState(updatesById.get(selectedProductId)));
            }

            const nextSelectedProducts = sortProducts(nextProducts.filter((product) => selectedProductIds.includes(product.id)));
            const successMessage = `${changedProducts.length} ${changedProducts.length === 1 ? 'product row' : 'product rows'} saved.`;

            setFeedback({ type: 'success', message: successMessage });
            setBulkFeedback({ type: 'success', message: successMessage });
            setBulkGridDraft(createBulkGridDraft(nextSelectedProducts));
        } catch (error) {
            setBulkFeedback({ type: 'error', message: error.message || 'Unable to save the changed grid rows.' });
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const payload = buildProductMutationInput(draft);

            if (!payload.name) {
                throw new Error('Product name is required.');
            }

            if (!payload.image_main) {
                throw new Error('A main image is required before saving.');
            }

            const method = selectedProductId === 'new' ? 'POST' : 'PUT';
            const response = await fetch('/api/admin/products', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedProductId === 'new' ? payload : { id: selectedProductId, ...payload }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to save this product.');
            }

            const savedProduct = normalizeProductRecord(data.product);
            const nextProducts = sortProducts([
                savedProduct,
                ...products.filter((product) => product.id !== savedProduct.id),
            ]);

            setProducts(nextProducts);
            setSelectedProductId(savedProduct.id);
            setDraft(createProductEditorState(savedProduct));
            setFeedback({ type: 'success', message: method === 'POST' ? 'Product created.' : 'Product saved.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to save this product.' });
        } finally {
            setIsSaving(false);
        }
    };

    const openDeleteDialog = (productIds) => {
        if (productIds.length === 0 || isDeleting) {
            return;
        }

        setDeleteTargetIds(productIds);
        setIsDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        if (isDeleting) {
            return;
        }

        setIsDeleteDialogOpen(false);
        setDeleteTargetIds([]);
    };

    const confirmDelete = async () => {
        if (deleteTargetIds.length === 0 || isDeleting) {
            return;
        }

        const isBulkDelete = deleteTargetIds.length > 1;
        setIsDeleting(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch(
                isBulkDelete ? '/api/admin/products' : `/api/admin/products?id=${encodeURIComponent(deleteTargetIds[0])}`,
                isBulkDelete
                    ? {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ ids: deleteTargetIds }),
                    }
                    : {
                        method: 'DELETE',
                    }
            );
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to delete this product.');
            }

            const nextProducts = products.filter((product) => !deleteTargetIds.includes(product.id));
            setProducts(nextProducts);

            if (deleteTargetIds.includes(selectedProductId)) {
                if (nextProducts[0]) {
                    openProductEditor(nextProducts[0]);
                    setFeedback({ type: 'success', message: isBulkDelete ? `${deleteTargetIds.length} products deleted.` : 'Product deleted.' });
                } else {
                    resetToNewDraft(nextProducts);
                    setFeedback({ type: 'success', message: isBulkDelete ? `${deleteTargetIds.length} products deleted.` : 'Product deleted.' });
                }
            } else {
                setFeedback({ type: 'success', message: isBulkDelete ? `${deleteTargetIds.length} products deleted.` : 'Product deleted.' });
            }

            setSelectedProductIds((currentIds) => currentIds.filter((productId) => !deleteTargetIds.includes(productId)));
            setIsDeleteDialogOpen(false);
            setDeleteTargetIds([]);
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to delete this product.' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkSave = async (event) => {
        event.preventDefault();

        if (selectedProductIds.length === 0 || isBulkSaving) {
            return;
        }

        const updates = {};

        if (enabledBulkFields.status) {
            updates.status = bulkEditDraft.status;
        }

        if (enabledBulkFields.category) {
            updates.category = bulkEditDraft.category;
        }

        if (enabledBulkFields.collection) {
            updates.collection = bulkEditDraft.collection;
        }

        if (enabledBulkFields.featured) {
            updates.featured = bulkEditDraft.featured === 'true';
        }

        if (enabledBulkFields.inventory_count) {
            updates.inventory_count = bulkEditDraft.inventory_count;
        }

        if (enabledBulkFields.lead_time_days) {
            updates.lead_time_days = bulkEditDraft.lead_time_days;
        }

        if (Object.keys(updates).length === 0) {
            setBulkFeedback({ type: 'error', message: 'Enable at least one property before applying changes.' });
            return;
        }

        setIsBulkSaving(true);
        setBulkFeedback({ type: 'idle', message: '' });
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/admin/products', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: selectedProductIds, updates }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to update the selected products.');
            }

            const updatedProducts = Array.isArray(data.products)
                ? data.products.map((product) => normalizeProductRecord(product))
                : [];
            const updatesById = new Map(updatedProducts.map((product) => [product.id, product]));
            const nextProducts = sortProducts(products.map((product) => updatesById.get(product.id) || product));

            setProducts(nextProducts);

            if (selectedProductId !== 'new' && updatesById.has(selectedProductId)) {
                setDraft(createProductEditorState(updatesById.get(selectedProductId)));
            }

            const nextSelectedProducts = sortProducts(nextProducts.filter((product) => selectedProductIds.includes(product.id)));
            const successMessage = `${selectedProductIds.length} products updated.`;

            setFeedback({ type: 'success', message: successMessage });
            setBulkFeedback({ type: 'success', message: successMessage });
            setEnabledBulkFields(createBulkEditEnabledState());
            setBulkEditDraft(buildBulkEditDraft(nextSelectedProducts));
        } catch (error) {
            setBulkFeedback({ type: 'error', message: error.message || 'Unable to update the selected products.' });
        } finally {
            setIsBulkSaving(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-10 md:gap-12">
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-5">
                <MetricCard label="Catalog" value={String(products.length).padStart(2, '0')} copy="Total pieces in the current admin catalog." />
                <MetricCard label="Active" value={String(activeCount).padStart(2, '0')} copy="Visible on the storefront right now." />
                <MetricCard label="Drafts" value={String(draftCount).padStart(2, '0')} copy="Internal pieces waiting for polish or approval." />
                <MetricCard label="Featured" value={String(featuredCount).padStart(2, '0')} copy="Lead products carrying the archive direction." />
                <MetricCard label="Inbox" value={String(recentInquiries.length).padStart(2, '0')} copy="Recent inquiries visible from the same admin view." />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-8 md:gap-10 items-start">
                <aside className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-5 md:p-6 flex flex-col gap-5 xl:sticky xl:top-28">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Catalog Control</p>
                            <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em] leading-none">Products</h2>
                        </div>
                        <button type="button" onClick={resetToNewDraft} className="hover-target rounded-full border border-[#1C1C1C]/12 bg-white/70 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/62 transition-colors hover:text-[#1C1C1C]">
                            New Piece
                        </button>
                    </div>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                        Search Catalog
                        <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search name or collection" className="h-14 border border-[#1C1C1C]/12 bg-white/75 px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </label>

                    <div className="flex flex-wrap gap-2">
                        <FilterButton label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                        {PRODUCT_STATUS_OPTIONS.map((option) => (
                            <FilterButton key={option.value} label={option.label} active={statusFilter === option.value} onClick={() => setStatusFilter(option.value)} />
                        ))}
                    </div>

                    <div className="rounded-sm border border-[#1C1C1C]/10 bg-white/80 p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">Selection Studio</p>
                                <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/56">{hasSelectedProducts ? describeProductSelection(uiSelectedProducts) : 'Pick products with the round selectors to batch-edit or delete them together.'}</p>
                            </div>
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/58">{selectedProductCount} selected</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={toggleVisibleSelection}
                                disabled={visibleProductIds.length === 0}
                                className={`hover-target h-11 rounded-full border border-[#1C1C1C]/12 bg-white text-[10px] uppercase tracking-[0.22em] transition-colors ${visibleProductIds.length === 0 ? 'opacity-50' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'}`}
                            >
                                {allVisibleSelected ? 'Unselect Filtered' : 'Select Filtered'}
                            </button>
                            <button
                                type="button"
                                onClick={clearSelectedProducts}
                                disabled={!hasSelectedProducts}
                                className={`hover-target h-11 rounded-full border border-[#1C1C1C]/12 bg-white text-[10px] uppercase tracking-[0.22em] transition-colors ${!hasSelectedProducts ? 'opacity-50' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'}`}
                            >
                                Clear Selection
                            </button>
                        </div>

                        {hasSelectedProducts && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={openBulkEditor}
                                    className="hover-target h-11 rounded-full border border-[#1C1C1C]/12 bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-black"
                                >
                                    Open Bulk Editor
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openDeleteDialog(selectedProductIds)}
                                    disabled={isDeleting}
                                    className={`hover-target h-11 rounded-full border border-red-200 bg-red-50 text-[10px] uppercase tracking-[0.22em] text-red-700 transition-colors ${isDeleting ? 'opacity-60' : 'hover:bg-red-100'}`}
                                >
                                    Delete Selected
                                </button>
                            </div>
                        )}
                    </div>

                    <div data-lenis-prevent-wheel className="flex flex-col gap-3 max-h-[720px] overflow-y-auto overscroll-contain pr-1">
                        <button
                            type="button"
                            onClick={resetToNewDraft}
                            className={`w-full text-left rounded-sm border p-4 transition-colors ${selectedProductId === 'new' ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-dashed border-[#1C1C1C]/16 bg-white/75 text-[#1C1C1C]/72 hover:bg-white'}`}
                        >
                            <p className="font-serif text-2xl font-light leading-none">Create New Product</p>
                            <p className={`mt-3 text-[10px] uppercase tracking-[0.24em] ${selectedProductId === 'new' ? 'text-white/55' : 'text-[#1C1C1C]/42'}`}>Fresh entry with image upload and draft support.</p>
                        </button>

                        {visibleProducts.map((product) => (
                            <ProductListItem
                                key={product.id}
                                product={product}
                                active={selectedProductId === product.id}
                                selected={selectedProductIdSet.has(product.id)}
                                onSelect={() => selectExistingProduct(product)}
                                onToggleSelected={toggleProductSelection}
                            />
                        ))}
                    </div>
                </aside>

                <div className="flex flex-col gap-4">
                    {hasSelectedProducts && (
                        <div className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">Editing Mode</p>
                                <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/58">{selectedProductCount} products are in the current bulk selection.</p>
                            </div>
                            <div className="flex gap-2 border border-[#1C1C1C]/10 p-1 rounded-full bg-[#EFECE8]">
                                <button type="button" onClick={() => setEditorMode('single')} className={`hover-target rounded-full px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${editorMode === 'single' ? 'bg-[#1C1C1C] text-[#EFECE8]' : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}>Single Editor</button>
                                <button type="button" onClick={openBulkEditor} className={`hover-target rounded-full px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${editorMode === 'bulk' ? 'bg-[#1C1C1C] text-[#EFECE8]' : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}>Bulk Editor</button>
                            </div>
                        </div>
                    )}

                    {editorMode === 'bulk' && hasSelectedProducts ? (
                        <BulkEditorPanel
                            selectedProducts={selectedProducts}
                            selectedProductId={selectedProductId}
                            enabledFields={enabledBulkFields}
                            value={bulkEditDraft}
                            gridColumns={bulkGridColumns}
                            gridDraft={bulkGridDraft}
                            dirtyCount={dirtyBulkGridCount}
                            feedback={bulkFeedback}
                            isSaving={isBulkSaving}
                            onToggleField={handleBulkFieldToggle}
                            onChange={handleBulkFieldChange}
                            onGridColumnToggle={handleBulkGridColumnToggle}
                            onGridChange={handleBulkGridChange}
                            onGridSave={handleBulkGridSave}
                            onReset={() => resetBulkEditor(selectedProducts)}
                            onSubmit={handleBulkSave}
                            onOpenProduct={openProductEditor}
                            onRemoveProduct={toggleProductSelection}
                            onExit={exitBulkEditor}
                        />
                    ) : (
                <form onSubmit={handleSave} className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-6 md:p-8 flex flex-col gap-8 md:gap-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Studio Admin</p>
                            <h2 className="font-serif text-4xl md:text-5xl font-light uppercase tracking-[0.12em] leading-none">{selectedProductId === 'new' ? 'New Product' : draft.name || 'Edit Product'}</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/58">Signed in as {profile?.full_name || user.email}. The form below writes directly to Supabase through the guarded admin API.</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={resetToNewDraft} className="hover-target h-12 px-5 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-white">New Draft</button>
                            {selectedProductId !== 'new' && (
                                <button type="button" onClick={() => openDeleteDialog([selectedProductId])} disabled={isDeleting} className={`hover-target h-12 px-5 border border-red-200 bg-red-50 text-[10px] uppercase tracking-[0.22em] text-red-700 transition-colors ${isDeleting ? 'opacity-60' : 'hover:bg-red-100'}`}>
                                    Delete
                                </button>
                            )}
                            <button disabled={isSaving} className={`hover-target h-12 px-6 bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isSaving ? 'opacity-60' : 'hover:bg-black'}`}>
                                {isSaving ? 'Saving' : 'Save Product'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-6 md:gap-8 items-stretch">
                        <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm overflow-hidden min-h-[420px] flex flex-col">
                            <div className="aspect-[4/5] bg-black/20 overflow-hidden">
                                {previewImages[0] ? (
                                    <img src={previewImages[0]} alt={previewProduct.name || 'Preview'} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-[0.28em] text-white/38">Main image preview</div>
                                )}
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 mb-2">Storefront Preview</p>
                                        <h3 className="font-serif text-3xl font-light leading-none uppercase tracking-[0.1em]">{previewProduct.name || 'Untitled Piece'}</h3>
                                    </div>
                                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/68">{previewProduct.status}</span>
                                </div>
                                <p className="text-sm leading-relaxed text-white/68">{previewProduct.subtitle || previewProduct.description || 'Add copy so the storefront preview feels complete before publishing.'}</p>
                                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-white/45">
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{previewProduct.collection}</span>
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{previewProduct.category}</span>
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{formatProductCurrency(previewProduct.price)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                Product Name
                                <input value={draft.name} onChange={(event) => handleFieldChange('name', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 md:col-span-2">
                                Subtitle
                                <input value={draft.subtitle} onChange={(event) => handleFieldChange('subtitle', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Slug
                                <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                                    <input value={draft.slug} onChange={(event) => handleFieldChange('slug', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                                    <button type="button" onClick={() => handleFieldChange('slug', slugifyProductName(draft.name || draft.slug || 'atelier-piece'))} className="hover-target h-14 border border-[#1C1C1C]/12 bg-white text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-[#1C1C1C] hover:text-[#EFECE8]">Refresh</button>
                                </div>
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Status
                                <select value={draft.status} onChange={(event) => handleFieldChange('status', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {PRODUCT_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Category
                                <select value={draft.category} onChange={(event) => handleFieldChange('category', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Collection
                                <select value={draft.collection} onChange={(event) => handleFieldChange('collection', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {PRODUCT_COLLECTION_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Price
                                <input value={draft.price} onChange={(event) => handleFieldChange('price', event.target.value)} type="number" min="0" step="0.01" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Compare At Price
                                <input value={draft.compare_at_price} onChange={(event) => handleFieldChange('compare_at_price', event.target.value)} type="number" min="0" step="0.01" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>

                            <label className="md:col-span-2 flex items-center gap-3 rounded-sm border border-[#1C1C1C]/10 bg-white/70 px-4 py-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                <input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => handleFieldChange('featured', event.target.checked)} className="h-4 w-4 border border-[#1C1C1C]/20" />
                                Featured Product
                            </label>
                            <p className="md:col-span-2 -mt-2 text-xs leading-relaxed text-[#1C1C1C]/52">Featured products now power both the collections carousel and the Spotlight page. Use sort order to decide which featured piece appears first.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Short Description
                            <textarea value={draft.description} onChange={(event) => handleFieldChange('description', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Story Section
                            <textarea value={draft.story} onChange={(event) => handleFieldChange('story', event.target.value)} rows={5} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Materials
                            <textarea value={draft.materials} onChange={(event) => handleFieldChange('materials', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Care
                            <textarea value={draft.care} onChange={(event) => handleFieldChange('care', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Fit Notes
                            <textarea value={draft.fit_notes} onChange={(event) => handleFieldChange('fit_notes', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Artisan Note
                            <textarea value={draft.artisan_note} onChange={(event) => handleFieldChange('artisan_note', event.target.value)} rows={4} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ImageField label="Main Image URL" value={draft.image_main} field="image_main" onChange={handleFieldChange} onUpload={handleUpload} isUploading={isUploading} />
                        <ImageField label="Detail Image URL" value={draft.image_detail} field="image_detail" onChange={handleFieldChange} onUpload={handleUpload} isUploading={isUploading} />
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Gallery URLs
                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px] gap-3 items-start">
                                <textarea value={draft.gallery} onChange={(event) => handleFieldChange('gallery', event.target.value)} rows={4} placeholder="One image URL per line" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                                <label className={`h-14 border border-[#1C1C1C]/12 flex items-center justify-center bg-white text-[10px] uppercase tracking-[0.22em] ${isUploading ? 'opacity-60' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'} transition-colors cursor-pointer`}>
                                    {isUploading ? 'Uploading' : 'Upload'}
                                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleUpload(event, 'gallery')} disabled={isUploading} />
                                </label>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Highlights
                            <textarea value={draft.highlights} onChange={(event) => handleFieldChange('highlights', event.target.value)} rows={4} placeholder="One highlight per line" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Tags
                            <textarea value={draft.tags} onChange={(event) => handleFieldChange('tags', event.target.value)} rows={4} placeholder="Comma-separated tags" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Palette
                            <textarea value={draft.palette} onChange={(event) => handleFieldChange('palette', event.target.value)} rows={3} placeholder="Comma-separated tones" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Inventory
                                <input value={draft.inventory_count} onChange={(event) => handleFieldChange('inventory_count', event.target.value)} type="number" min="0" step="1" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Lead Time
                                <input value={draft.lead_time_days} onChange={(event) => handleFieldChange('lead_time_days', event.target.value)} type="number" min="1" step="1" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Sort Order
                                <input value={draft.sort_order} onChange={(event) => handleFieldChange('sort_order', event.target.value)} type="number" step="1" className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                            </label>
                        </div>
                    </div>

                    {(feedback.message || uploadFeedback.message || maintenanceMessage) && (
                        <div className="flex flex-col gap-2">
                            {feedback.message && <p className={`text-sm ${feedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/68'}`}>{feedback.message}</p>}
                            {uploadFeedback.message && <p className={`text-sm ${uploadFeedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/68'}`}>{uploadFeedback.message}</p>}
                            {maintenanceMessage && <p className="text-sm text-[#1C1C1C]/55">{maintenanceMessage}</p>}
                        </div>
                    )}
                </form>
                    )}
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-6 md:p-8 flex flex-col gap-5">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Recent Orders</p>
                            <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em]">Atelier Archive</h3>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{recentOrders.length} visible</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-[#1C1C1C]/58">No recent orders yet.</p>
                        ) : (
                            recentOrders.map((order) => (
                                <div key={order.id} className="border border-[#1C1C1C]/10 bg-white/75 rounded-sm p-4 md:p-5 flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">#{String(order.id).slice(0, 8).toUpperCase()}</p>
                                            <p className="font-serif text-2xl font-light leading-none text-[#1C1C1C]">{formatProductCurrency(order.total || 0)}</p>
                                        </div>
                                        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${getStatusClasses(order.status || 'draft')}`}>{order.status || 'pending'}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{buildOrderSummary(order)}</p>
                                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                                        <span>{order.item_count || 0} piece{order.item_count === 1 ? '' : 's'}</span>
                                        <span>{formatDate(order.created_at)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-8 flex flex-col gap-5">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 mb-3">Recent Inquiries</p>
                            <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em]">Atelier Inbox</h3>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{recentInquiries.length} visible</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {recentInquiries.length === 0 ? (
                            <p className="text-sm text-white/60">No recent inquiries yet.</p>
                        ) : (
                            recentInquiries.map((inquiry) => (
                                <div key={inquiry.id} className="border border-white/10 bg-white/[0.04] rounded-sm p-4 md:p-5 flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">{inquiry.query_type || 'Other'}</p>
                                            <p className="font-serif text-2xl font-light leading-none text-white">{inquiry.full_name || inquiry.email}</p>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">{formatDate(inquiry.created_at)}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-white/68">{buildInquiryPreview(inquiry.message)}</p>
                                    <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-white/40">
                                        <span>{inquiry.email}</span>
                                        <span>{inquiry.status || 'new'}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <ConfirmDialog
                open={isDeleteDialogOpen}
                title={deleteTargetIds.length > 1 ? 'Delete Selected Products' : 'Delete Product'}
                copy={deleteTargetIds.length > 1 ? 'This will permanently remove the selected products from the catalog.' : 'This will permanently remove the selected product from the catalog.'}
                detail={describeProductSelection(deleteTargetProducts)}
                confirmLabel={deleteTargetIds.length > 1 ? `Delete ${deleteTargetIds.length} Products` : 'Delete Product'}
                isLoading={isDeleting}
                onCancel={closeDeleteDialog}
                onConfirm={confirmDelete}
            />

            </div>
        </>
    );
}
