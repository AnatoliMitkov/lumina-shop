"use client";

import { useDeferredValue, useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import AdminAffiliateCodesPanel from './AdminAffiliateCodesPanel';
import AdminCreatorApplicationsPanel from './AdminCreatorApplicationsPanel';
import AdminInquiriesPanel from './AdminInquiriesPanel';
import AdminDiscountCodesPanel from './AdminDiscountCodesPanel';
import AdminOrdersPanel from './AdminOrdersPanel';
import { useSiteCopy } from './site-copy/SiteCopyProvider';
import { countAdminAttentionItems, normalizeAdminAttentionStatus } from '../utils/admin-attention';
import { ADMIN_MEDIA_UPLOAD_BUCKETS, uploadAdminMedia } from '../utils/admin-media-upload-client';
import {
    PRODUCT_DEFAULTS,
    PRODUCT_CATEGORY_OPTIONS,
    PRODUCT_COLLECTION_OPTIONS,
    PRODUCT_LANGUAGE_VISIBILITY_OPTIONS,
    PRODUCT_STATUS_OPTIONS,
    buildProductMutationInput,
    createEmptyProductDraft,
    createProductEditorState,
    formatProductCurrency,
    normalizeProductRecord,
    resolveProductGallery,
    slugifyProductName,
    sortProducts,
} from '../utils/products';
import { getTaxonomyStorageKey } from '../utils/product-taxonomy';
import {
    buildCollectionMediaKey,
    parseCollectionMediaValue,
    slugifyCollectionName,
} from '../utils/fifth-avenue-stage-media';

const supabase = createClient();
const BULK_EDIT_FIELD_LABELS = {
    status: 'Status',
    language_visibility: 'Language Visibility',
    category: 'Category',
    collection: 'Collection',
    featured: 'Featured',
    inventory_count: 'Inventory',
    lead_time_days: 'Lead Time',
};
const BULK_EDIT_FIELD_DEFAULTS = {
    status: PRODUCT_DEFAULTS.status,
    language_visibility: PRODUCT_DEFAULTS.language_visibility,
    category: PRODUCT_DEFAULTS.category,
    collection: PRODUCT_DEFAULTS.collection,
    featured: String(PRODUCT_DEFAULTS.featured),
    inventory_count: String(PRODUCT_DEFAULTS.inventory_count),
    lead_time_days: String(PRODUCT_DEFAULTS.lead_time_days),
};
const BULK_GRID_COLUMN_DEFINITIONS = [
    { key: 'name', label: 'Product', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: PRODUCT_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })) },
    { key: 'language_visibility', label: 'Visibility', type: 'select', options: PRODUCT_LANGUAGE_VISIBILITY_OPTIONS.map((option) => ({ value: option.value, label: option.label })) },
    { key: 'category', label: 'Category', type: 'select', options: PRODUCT_CATEGORY_OPTIONS.map((option) => ({ value: option, label: option })) },
    { key: 'collection', label: 'Collection', type: 'select', options: PRODUCT_COLLECTION_OPTIONS.map((option) => ({ value: option, label: option })) },
    { key: 'featured', label: 'Featured', type: 'boolean' },
    { key: 'price', label: 'Price', type: 'number', min: '0', step: '0.01' },
    { key: 'compare_at_price', label: 'Compare Price', type: 'number', min: '0', step: '0.01' },
    { key: 'inventory_count', label: 'Inventory', type: 'number', min: '0', step: '1' },
    { key: 'lead_time_days', label: 'Lead Time', type: 'number', min: '1', step: '1' },
    { key: 'sort_order', label: 'Sort Order', type: 'number', step: '1' },
];
const DEFAULT_BULK_GRID_COLUMNS = ['name', 'status', 'language_visibility', 'collection', 'featured', 'price'];

function createBulkGridRowDraft(product = PRODUCT_DEFAULTS) {
    return {
        name: String(product.name ?? ''),
        status: String(product.status ?? PRODUCT_DEFAULTS.status),
        language_visibility: String(product.language_visibility ?? PRODUCT_DEFAULTS.language_visibility),
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
        language_visibility: false,
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
        language_visibility: resolveSharedSelectionValue(products.map((product) => product.language_visibility), firstProduct.language_visibility || BULK_EDIT_FIELD_DEFAULTS.language_visibility),
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

function getLanguageVisibilityLabel(value) {
    return PRODUCT_LANGUAGE_VISIBILITY_OPTIONS.find((option) => option.value === value)?.label || value;
}

function buildUniqueDuplicateName(name = '', products = []) {
    const baseName = normalizeOptionValue(name) || 'Untitled Piece';
    const existingNames = new Set(
        products
            .map((product) => normalizeOptionValue(product.name).toLowerCase())
            .filter(Boolean)
    );

    let copyIndex = 1;
    let nextName = `${baseName} Copy`;

    while (existingNames.has(nextName.toLowerCase())) {
        copyIndex += 1;
        nextName = `${baseName} Copy ${copyIndex}`;
    }

    return nextName;
}

function buildUniqueDuplicateSlug(name = '', products = []) {
    const existingSlugs = new Set(
        products
            .map((product) => normalizeOptionValue(product.slug).toLowerCase())
            .filter(Boolean)
    );

    let copyIndex = 1;
    let nextSlug = slugifyProductName(name);

    while (existingSlugs.has(nextSlug.toLowerCase())) {
        copyIndex += 1;
        nextSlug = slugifyProductName(`${name} ${copyIndex}`);
    }

    return nextSlug;
}

function createDuplicateProductDraft(product, products = []) {
    const duplicateName = buildUniqueDuplicateName(product?.name, products);
    const duplicateDraft = createProductEditorState(product);

    return {
        ...duplicateDraft,
        id: '',
        name: duplicateName,
        slug: buildUniqueDuplicateSlug(duplicateName, products),
        status: PRODUCT_DEFAULTS.status,
    };
}

function formatBulkPreviewValue(field, value) {
    switch (field) {
        case 'status':
            return getStatusLabel(value);
        case 'language_visibility':
            return getLanguageVisibilityLabel(value);
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
        { label: 'Visibility', value: summarizeSelectionField(products, (product) => product.language_visibility, (value) => getLanguageVisibilityLabel(value)) },
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

function getAttentionStorageKey(scope, userId) {
    return `va_admin_attention:${scope}:${userId || 'local'}`;
}

function readAttentionStorage(scope, userId) {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const rawValue = window.localStorage.getItem(getAttentionStorageKey(scope, userId));

        if (!rawValue) {
            return {};
        }

        const parsedValue = JSON.parse(rawValue);
        return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
    } catch {
        return {};
    }
}

function applyStoredAttentionState(items = [], storedMap = {}) {
    return items.map((item) => ({
        ...item,
        admin_attention_status: normalizeAdminAttentionStatus(storedMap[item.id] || item.admin_attention_status),
    }));
}

function writeAttentionStorage(scope, userId, items = []) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const serializedMap = Object.fromEntries(
            items
                .filter((item) => item?.id)
                .map((item) => [item.id, normalizeAdminAttentionStatus(item.admin_attention_status)])
        );

        window.localStorage.setItem(getAttentionStorageKey(scope, userId), JSON.stringify(serializedMap));
    } catch {
        // Ignore localStorage write failures and keep the admin UI functional in memory.
    }
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

function normalizeOptionValue(value) {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (value == null) {
        return '';
    }

    return String(value).trim();
}

function buildManagedOptionList(seedOptions = [], values = []) {
    const normalizedSeedOptions = [...new Set(seedOptions.map((option) => normalizeOptionValue(option)).filter(Boolean))];
    const normalizedValues = [...new Set(values.map((value) => normalizeOptionValue(value)).filter(Boolean))];

    if (normalizedValues.length === 0) {
        return normalizedSeedOptions;
    }

    const seedOptionSet = new Set(normalizedSeedOptions.map((option) => option.toLowerCase()));
    const seededMatches = normalizedSeedOptions.filter((option) => normalizedValues.some((value) => value.toLowerCase() === option.toLowerCase()));
    const customMatches = normalizedValues
        .filter((option) => !seedOptionSet.has(option.toLowerCase()))
        .sort((leftOption, rightOption) => leftOption.localeCompare(rightOption));

    return [...seededMatches, ...customMatches];
}

function resolvePreferredOption(options = [], fallback = '') {
    if (options.includes(fallback)) {
        return fallback;
    }

    return options[0] || fallback;
}

function getTaxonomyLabel(field) {
    return field === 'collection' ? 'Collection' : 'Category';
}

function createTaxonomyLabelDialogState(overrides = {}) {
    return {
        open: false,
        field: 'category',
        value: '',
        englishLabel: '',
        bulgarianLabel: '',
        error: '',
        ...overrides,
    };
}

function normalizeStoredTextValue(value, fallback = '') {
    if (typeof value === 'string') {
        const trimmedValue = value.trim();

        return trimmedValue || fallback;
    }

    if (value == null) {
        return fallback;
    }

    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
}

function resolveStoredTaxonomyLabel(getStoredEntry, field, value, language) {
    const normalizedValue = normalizeOptionValue(value);

    if (!normalizedValue) {
        return '';
    }

    return normalizeStoredTextValue(
        getStoredEntry?.(getTaxonomyStorageKey(field, normalizedValue, language)),
        normalizedValue,
    );
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

function ValueDialog({
    open,
    title,
    copy,
    label,
    value,
    confirmLabel,
    onCancel,
    onChange,
    onConfirm,
}) {
    const trimmedValue = value.trim();

    return (
        <ModalShell open={open} onClose={onCancel} maxWidth="max-w-lg">
            <div className="flex flex-col gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Quick Add</p>
                    <h3 className="font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/70">{copy}</p>
                </div>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/55">
                    {label}
                    <input
                        autoFocus
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && trimmedValue) {
                                event.preventDefault();
                                onConfirm();
                            }
                        }}
                        className="h-14 border border-white/12 bg-white/6 px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/24"
                    />
                </label>

                <div className="flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="hover-target h-12 px-5 rounded-full border border-white/12 bg-white/5 text-[10px] uppercase tracking-[0.22em] text-white/72 transition-colors hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!trimmedValue}
                        className={`hover-target h-12 px-6 rounded-full bg-[#EFE7DA] text-[#1C1C1C] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${!trimmedValue ? 'opacity-60' : 'hover:bg-white'}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

function TaxonomyLabelDialog({
    open,
    field,
    value,
    englishLabel,
    bulgarianLabel,
    error,
    isLoading,
    onCancel,
    onChangeEnglish,
    onChangeBulgarian,
    onConfirm,
}) {
    const baseValue = normalizeOptionValue(value);

    return (
        <ModalShell open={open} onClose={isLoading ? undefined : onCancel} maxWidth="max-w-2xl">
            <div className="flex flex-col gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Taxonomy Labels</p>
                    <h3 className="font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none">{getTaxonomyLabel(field)} EN / BG Labels</h3>
                    <p className="text-sm leading-relaxed text-white/70">Keep one shared {field} value for products and filters, then set the visible shopper label for each language here.</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Base Value</p>
                    <p className="mt-3 font-serif text-2xl font-light leading-tight text-white">{baseValue}</p>
                    <p className="mt-3 text-xs leading-relaxed text-white/48">This shared value stays in the product record and filter URL. Only the visible English and Bulgarian labels change below.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/55">
                        English Label
                        <input
                            autoFocus
                            value={englishLabel}
                            onChange={(event) => onChangeEnglish(event.target.value)}
                            placeholder={baseValue}
                            className="h-14 border border-white/12 bg-white/6 px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/24"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/55">
                        Bulgarian Label
                        <input
                            value={bulgarianLabel}
                            onChange={(event) => onChangeBulgarian(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && baseValue) {
                                    event.preventDefault();
                                    onConfirm();
                                }
                            }}
                            placeholder={baseValue}
                            className="h-14 border border-white/12 bg-white/6 px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/24"
                        />
                    </label>
                </div>

                <p className="text-xs leading-relaxed text-white/48">If a field is left empty, the base value will be used as the visible label for that language.</p>
                {error ? <p className="text-sm text-red-200">{error}</p> : null}

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
                        disabled={!baseValue || isLoading}
                        className={`hover-target h-12 px-6 rounded-full bg-[#EFE7DA] text-[#1C1C1C] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${!baseValue || isLoading ? 'opacity-60' : 'hover:bg-white'}`}
                    >
                        {isLoading ? 'Saving Labels' : `Save ${getTaxonomyLabel(field)} Labels`}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

function AttentionDialog({
    open,
    orderCounts,
    inquiryCounts,
    onClose,
    onGoToOrders,
    onGoToInquiries,
}) {
    const orderNeedsAttention = orderCounts.unseen + orderCounts.reviewing;
    const inquiryNeedsAttention = inquiryCounts.unseen + inquiryCounts.reviewing;

    return (
        <ModalShell open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Admin Attention</p>
                    <h3 className="font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none">New Activity Needs A Look</h3>
                    <p className="text-sm leading-relaxed text-white/70">Unseen items stay highlighted until you open them, and reviewing items stay visible until you explicitly mark them as seen.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 flex flex-col gap-4">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">Orders</p>
                                <p className="font-serif text-4xl font-light leading-none text-white">{String(orderNeedsAttention).padStart(2, '0')}</p>
                            </div>
                            <div className="text-right text-[10px] uppercase tracking-[0.22em] text-white/42">
                                <p>{orderCounts.unseen} unseen</p>
                                <p>{orderCounts.reviewing} reviewing</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-white/66">Jump straight into the order queue and clear the items that still need a first look or final acknowledgement.</p>
                        <button
                            type="button"
                            onClick={onGoToOrders}
                            disabled={orderNeedsAttention === 0}
                            className={`hover-target h-12 px-6 rounded-full text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${orderNeedsAttention === 0 ? 'border border-white/12 bg-white/5 text-white/42' : 'bg-[#EFE7DA] text-[#1C1C1C] hover:bg-white'}`}
                        >
                            Go To Orders
                        </button>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 flex flex-col gap-4">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">Inbox</p>
                                <p className="font-serif text-4xl font-light leading-none text-white">{String(inquiryNeedsAttention).padStart(2, '0')}</p>
                            </div>
                            <div className="text-right text-[10px] uppercase tracking-[0.22em] text-white/42">
                                <p>{inquiryCounts.unseen} unseen</p>
                                <p>{inquiryCounts.reviewing} reviewing</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-white/66">Use the inbox shortcut when fresh messages land and need to be moved from unseen into the normal response flow.</p>
                        <button
                            type="button"
                            onClick={onGoToInquiries}
                            disabled={inquiryNeedsAttention === 0}
                            className={`hover-target h-12 px-6 rounded-full text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${inquiryNeedsAttention === 0 ? 'border border-white/12 bg-white/5 text-white/42' : 'bg-[#EFE7DA] text-[#1C1C1C] hover:bg-white'}`}
                        >
                            Open Inbox
                        </button>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="hover-target h-12 px-5 rounded-full border border-white/12 bg-white/5 text-[10px] uppercase tracking-[0.22em] text-white/72 transition-colors hover:bg-white/10"
                    >
                        Close
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

function TaxonomyField({
    label,
    value,
    options,
    helperText,
    displayLabels,
    className = '',
    onChange,
    onAdd,
    onEditLabels,
    onRemove,
    editLabelsDisabled,
    removeDisabled,
}) {
    return (
        <label className={`flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 ${className}`.trim()}>
            {label}
            <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_3rem_3rem] gap-3">
                <select value={value} onChange={(event) => onChange(event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                    {options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <button type="button" onClick={onEditLabels} disabled={editLabelsDisabled} className={`hover-target h-14 border border-[#1C1C1C]/12 bg-white px-2 text-[9px] uppercase tracking-[0.16em] text-[#1C1C1C] transition-colors ${editLabelsDisabled ? 'opacity-50' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'}`} aria-label={`Edit ${label} English and Bulgarian labels`}>
                    EN/BG
                </button>
                <button type="button" onClick={onAdd} className="hover-target h-14 border border-[#1C1C1C]/12 bg-white text-lg leading-none text-[#1C1C1C] transition-colors hover:bg-[#1C1C1C] hover:text-[#EFECE8]" aria-label={`Add ${label}`}>
                    +
                </button>
                <button type="button" onClick={onRemove} disabled={removeDisabled} className={`hover-target h-14 border border-red-200 bg-red-50 text-lg leading-none text-red-700 transition-colors ${removeDisabled ? 'opacity-50' : 'hover:bg-red-100'}`} aria-label={`Remove ${label}`}>
                    -
                </button>
            </div>
            {helperText ? <p className="text-[11px] normal-case tracking-normal leading-relaxed text-[#1C1C1C]/52">{helperText}</p> : null}
            {value && displayLabels ? (
                <div className="flex flex-wrap gap-2 text-[10px] normal-case tracking-normal text-[#1C1C1C]/62">
                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/75 px-3 py-2"><span className="text-[#1C1C1C]/42">EN:</span> {displayLabels.en}</span>
                    <span className="rounded-full border border-[#1C1C1C]/10 bg-white/75 px-3 py-2"><span className="text-[#1C1C1C]/42">BG:</span> {displayLabels.bg}</span>
                </div>
            ) : null}
        </label>
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
    categoryOptions,
    collectionOptions,
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
                        <div data-lenis-prevent-wheel className="bulk-grid-scrollbars max-h-[540px] overflow-scroll overscroll-contain xl:max-h-[820px]">
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
                                                    const resolvedOptions = columnKey === 'category'
                                                        ? categoryOptions.map((option) => ({ value: option, label: option }))
                                                        : columnKey === 'collection'
                                                            ? collectionOptions.map((option) => ({ value: option, label: option }))
                                                            : column.options;

                                                    return (
                                                        <td key={columnKey} className="border-b border-[#1C1C1C]/8 px-4 py-3 align-top min-w-[140px]">
                                                            {column.type === 'select' ? (
                                                                <select
                                                                    value={rowDraft[columnKey]}
                                                                    onChange={(event) => onGridChange(product.id, columnKey, event.target.value)}
                                                                    className="h-11 w-full border border-[#1C1C1C]/10 bg-white px-3 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                                                                >
                                                                    {resolvedOptions.map((option) => (
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

                    <BulkFieldRow active={enabledFields.language_visibility} label="Language Visibility" hint="Choose whether the selected products show in English, Bulgarian, or both storefront versions." onToggle={() => onToggleField('language_visibility')}>
                        <select value={value.language_visibility} onChange={(event) => onChange('language_visibility', event.target.value)} className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                            {PRODUCT_LANGUAGE_VISIBILITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </BulkFieldRow>

                    <BulkFieldRow active={enabledFields.category} label="Category" hint="Use one shared category value for the batch. If the shopper label should differ by language, update its EN/BG labels from the product editor instead of creating a second BG-only category." onToggle={() => onToggleField('category')}>
                        <select value={value.category} onChange={(event) => onChange('category', event.target.value)} className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                            {categoryOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </BulkFieldRow>

                    <BulkFieldRow active={enabledFields.collection} label="Collection" hint="Use one shared collection value for the batch. If the shopper label should differ by language, update its EN/BG labels from the product editor instead of creating a second BG-only collection." onToggle={() => onToggleField('collection')}>
                        <select value={value.collection} onChange={(event) => onChange('collection', event.target.value)} className="h-14 w-full border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                            {collectionOptions.map((option) => (
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
                        <span>{getLanguageVisibilityLabel(product.language_visibility)}</span>
                        <span>{formatProductCurrency(product.price)}</span>
                        <span>{formatDate(product.updated_at || product.created_at)}</span>
                    </div>
                </button>
            </div>
        </div>
    );
}

function ImageField({ label, value, field, onChange, onUpload, isUploading, uploadDisabled = false, uploadDisabledMessage = '' }) {
    const isUploadDisabled = isUploading || uploadDisabled;

    return (
        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
            {label}
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                <input value={value} onChange={(event) => onChange(field, event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                <label
                    title={uploadDisabled ? uploadDisabledMessage : undefined}
                    className={`h-14 border border-[#1C1C1C]/12 flex items-center justify-center bg-white text-[10px] uppercase tracking-[0.22em] ${isUploadDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#1C1C1C] hover:text-[#EFECE8]'} transition-colors`}
                >
                    {isUploading ? 'Uploading' : 'Upload'}
                    <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(event) => onUpload(event, field)} disabled={isUploadDisabled} />
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
    discountCodes,
    affiliateCodes,
    creatorApplications = [],
    maintenanceMessage,
    promotionMessage,
    creatorReviewMessage,
    initialCollectionStageMediaEntries = {},
}) {
    const sortedInitialProducts = sortProducts(initialProducts ?? []);
    const [products, setProducts] = useState(sortedInitialProducts);
    const [adminOrders, setAdminOrders] = useState(recentOrders ?? []);
    const [adminInquiries, setAdminInquiries] = useState(recentInquiries ?? []);
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
    const [languageVisibilityFilter, setLanguageVisibilityFilter] = useState('all');
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
    const [valueDialog, setValueDialog] = useState({ open: false, field: 'category', value: '' });
    const [taxonomyLabelDialog, setTaxonomyLabelDialog] = useState(createTaxonomyLabelDialogState);
    const [taxonomyDeleteDialog, setTaxonomyDeleteDialog] = useState({ open: false, field: 'category', value: '' });
    const [isTaxonomyUpdating, setIsTaxonomyUpdating] = useState(false);
    const [isTaxonomyLabelSaving, setIsTaxonomyLabelSaving] = useState(false);
    const [isAttentionDialogOpen, setIsAttentionDialogOpen] = useState(false);
    const [hasAttentionDialogOpened, setHasAttentionDialogOpened] = useState(false);
    const [collectionStageMediaEntries, setCollectionStageMediaEntries] = useState(initialCollectionStageMediaEntries);
    const [stageCollection, setStageCollection] = useState(PRODUCT_COLLECTION_OPTIONS[0] || 'Collection');
    const [stageMediaDraft, setStageMediaDraft] = useState({ primaryMedia: '', secondaryMedia: '' });
    const [isStageMediaSaving, setIsStageMediaSaving] = useState(false);
    const [isStageMediaUploading, setIsStageMediaUploading] = useState(false);
    const [stageMediaFeedback, setStageMediaFeedback] = useState({ type: 'idle', message: '' });
    const siteCopy = useSiteCopy();

    const activeCount = products.filter((product) => product.status === 'active').length;
    const draftCount = products.filter((product) => product.status === 'draft').length;
    const featuredCount = products.filter((product) => product.featured).length;
    const categoryOptions = buildManagedOptionList(PRODUCT_CATEGORY_OPTIONS, [
        ...products.map((product) => product.category),
        draft.category,
    ]);
    const collectionOptions = buildManagedOptionList(PRODUCT_COLLECTION_OPTIONS, [
        ...products.map((product) => product.collection),
        draft.collection,
        ...Object.keys(collectionStageMediaEntries),
    ]);
    const resolveAdminTaxonomyLabel = (field, value, language) => resolveStoredTaxonomyLabel(siteCopy?.getStoredEntry, field, value, language);
    const categoryDisplayLabels = {
        en: resolveAdminTaxonomyLabel('category', draft.category, 'en'),
        bg: resolveAdminTaxonomyLabel('category', draft.category, 'bg'),
    };
    const collectionDisplayLabels = {
        en: resolveAdminTaxonomyLabel('collection', draft.collection, 'en'),
        bg: resolveAdminTaxonomyLabel('collection', draft.collection, 'bg'),
    };

    useEffect(() => {
        setCollectionStageMediaEntries(initialCollectionStageMediaEntries || {});
    }, [initialCollectionStageMediaEntries]);

    useEffect(() => {
        if (!collectionOptions.length) {
            return;
        }

        if (!collectionOptions.includes(stageCollection)) {
            setStageCollection(collectionOptions[0]);
        }
    }, [collectionOptions, stageCollection]);

    useEffect(() => {
        const currentEntry = collectionStageMediaEntries[stageCollection] || { primaryMedia: '', secondaryMedia: '' };

        setStageMediaDraft({
            primaryMedia: String(currentEntry.primaryMedia || ''),
            secondaryMedia: String(currentEntry.secondaryMedia || ''),
        });
    }, [collectionStageMediaEntries, stageCollection]);
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
        const matchesLanguageVisibility = languageVisibilityFilter === 'all'
            || String(product.language_visibility ?? PRODUCT_DEFAULTS.language_visibility) === languageVisibilityFilter;
        const matchesSearch = !deferredSearch
            || [product.name, product.collection, product.category, ...(product.tags || [])]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch);

        return matchesStatus && matchesLanguageVisibility && matchesSearch;
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
    const orderAttentionCounts = countAdminAttentionItems(adminOrders);
    const inquiryAttentionCounts = countAdminAttentionItems(adminInquiries);
    const unresolvedActivityCount = orderAttentionCounts.unseen + orderAttentionCounts.reviewing + inquiryAttentionCounts.unseen + inquiryAttentionCounts.reviewing;

    useEffect(() => {
        setAdminOrders(applyStoredAttentionState(recentOrders ?? [], readAttentionStorage('orders', user?.id)));
    }, [recentOrders, user?.id]);

    useEffect(() => {
        setAdminInquiries(applyStoredAttentionState(recentInquiries ?? [], readAttentionStorage('inquiries', user?.id)));
    }, [recentInquiries, user?.id]);

    useEffect(() => {
        writeAttentionStorage('orders', user?.id, adminOrders);
    }, [adminOrders, user?.id]);

    useEffect(() => {
        writeAttentionStorage('inquiries', user?.id, adminInquiries);
    }, [adminInquiries, user?.id]);

    useEffect(() => {
        if (hasAttentionDialogOpened || unresolvedActivityCount === 0) {
            return;
        }

        setIsAttentionDialogOpen(true);
        setHasAttentionDialogOpened(true);
    }, [hasAttentionDialogOpened, unresolvedActivityCount]);

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

    const buildFreshDraft = (sourceProducts = products) => {
        const draftSourceProducts = Array.isArray(sourceProducts) ? sourceProducts : products;
        const highestSortOrder = draftSourceProducts.reduce((runningMax, product) => Math.max(runningMax, product.sort_order || 0), 0);
        const nextCategoryOptions = buildManagedOptionList(PRODUCT_CATEGORY_OPTIONS, draftSourceProducts.map((product) => product.category));
        const nextCollectionOptions = buildManagedOptionList(PRODUCT_COLLECTION_OPTIONS, draftSourceProducts.map((product) => product.collection));

        return createEmptyProductDraft({
            category: resolvePreferredOption(nextCategoryOptions, 'Top'),
            collection: resolvePreferredOption(nextCollectionOptions, 'Atelier Archive'),
            status: 'draft',
            sort_order: highestSortOrder + 10,
        });
    };

    const resetToNewDraft = (sourceProducts = products) => {
        const draftSourceProducts = Array.isArray(sourceProducts) ? sourceProducts : products;
        setEditorMode('single');
        setSelectedProductId('new');
        setDraft(buildFreshDraft(draftSourceProducts));
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

    const duplicateProduct = (product) => {
        if (!product) {
            return;
        }

        setEditorMode('single');
        setSelectedProductId('new');
        setDraft(createDuplicateProductDraft(product, products));
        setUploadFeedback({ type: 'idle', message: '' });
        setFeedback({ type: 'success', message: `Duplicate draft created from ${product.name || 'the selected product'}. Review it and save when ready.` });
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

    const resolveProductUploadFolder = (productDraft) => {
        const productName = String(productDraft?.name || '').trim();

        if (!productName) {
            return '';
        }

        return slugifyProductName(productDraft?.slug || productName);
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

    const openValueDialog = (field) => {
        setValueDialog({ open: true, field, value: '' });
    };

    const closeValueDialog = () => {
        setValueDialog((currentDialog) => ({ ...currentDialog, open: false, value: '' }));
    };

    const openTaxonomyLabelDialog = (field, value = draft[field]) => {
        const currentValue = normalizeOptionValue(value);

        if (!currentValue || isTaxonomyLabelSaving) {
            return;
        }

        setTaxonomyLabelDialog(createTaxonomyLabelDialogState({
            open: true,
            field,
            value: currentValue,
            englishLabel: resolveAdminTaxonomyLabel(field, currentValue, 'en'),
            bulgarianLabel: resolveAdminTaxonomyLabel(field, currentValue, 'bg'),
        }));
    };

    const closeTaxonomyLabelDialog = () => {
        if (isTaxonomyLabelSaving) {
            return;
        }

        setTaxonomyLabelDialog(createTaxonomyLabelDialogState());
    };

    const confirmValueDialog = () => {
        const nextValue = normalizeOptionValue(valueDialog.value);

        if (!nextValue) {
            return;
        }

        handleFieldChange(valueDialog.field, nextValue);
        closeValueDialog();
        openTaxonomyLabelDialog(valueDialog.field, nextValue);
        setFeedback({ type: 'success', message: `${getTaxonomyLabel(valueDialog.field)} added to the draft. Set its EN/BG labels here if shoppers should see different names per language.` });
    };

    const handleTaxonomyLabelSave = async () => {
        const field = taxonomyLabelDialog.field;
        const currentValue = normalizeOptionValue(taxonomyLabelDialog.value);

        if (!currentValue || isTaxonomyLabelSaving) {
            return;
        }

        const nextLabels = [
            {
                key: getTaxonomyStorageKey(field, currentValue, 'en'),
                value: normalizeOptionValue(taxonomyLabelDialog.englishLabel) || currentValue,
            },
            {
                key: getTaxonomyStorageKey(field, currentValue, 'bg'),
                value: normalizeOptionValue(taxonomyLabelDialog.bulgarianLabel) || currentValue,
            },
        ];

        setIsTaxonomyLabelSaving(true);
        setTaxonomyLabelDialog((currentDialog) => ({ ...currentDialog, error: '' }));

        try {
            const savedEntries = await Promise.all(nextLabels.map(async (entry) => {
                const response = await fetch('/api/admin/site-copy', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(entry),
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || `Unable to save this ${field} label right now.`);
                }

                return {
                    key: entry.key,
                    value: data.entry?.value ?? entry.value,
                };
            }));

            siteCopy?.mergeEntries?.(Object.fromEntries(savedEntries.map((entry) => [entry.key, entry.value])));
            setFeedback({ type: 'success', message: `${getTaxonomyLabel(field)} labels saved for ${currentValue}. Filters and menus will now show those labels by language.` });
            setTaxonomyLabelDialog(createTaxonomyLabelDialogState());
        } catch (error) {
            setTaxonomyLabelDialog((currentDialog) => ({
                ...currentDialog,
                error: error.message || `Unable to save this ${field} label right now.`,
            }));
        } finally {
            setIsTaxonomyLabelSaving(false);
        }
    };

    const openTaxonomyDeleteDialog = (field) => {
        const currentValue = normalizeOptionValue(draft[field]);

        if (!currentValue || isTaxonomyUpdating) {
            return;
        }

        setTaxonomyDeleteDialog({ open: true, field, value: currentValue });
    };

    const closeTaxonomyDeleteDialog = () => {
        setTaxonomyDeleteDialog({ open: false, field: 'category', value: '' });
    };

    const handleTaxonomyDelete = async () => {
        const field = taxonomyDeleteDialog.field;
        const currentValue = normalizeOptionValue(taxonomyDeleteDialog.value);

        if (!currentValue || isTaxonomyUpdating) {
            return;
        }

        const availableOptions = field === 'collection' ? collectionOptions : categoryOptions;
        const replacementValue = resolvePreferredOption(
            availableOptions.filter((option) => option !== currentValue),
            field === 'collection' ? PRODUCT_DEFAULTS.collection : PRODUCT_DEFAULTS.category
        );

        if (!replacementValue || replacementValue === currentValue) {
            setFeedback({ type: 'error', message: `Choose or create another ${field} before removing "${currentValue}".` });
            closeTaxonomyDeleteDialog();
            return;
        }

        const matchingProducts = products.filter((product) => normalizeOptionValue(product[field]) === currentValue);

        setIsTaxonomyUpdating(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            if (matchingProducts.length > 0) {
                const response = await fetch('/api/admin/products', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ids: matchingProducts.map((product) => product.id),
                        updates: { [field]: replacementValue },
                    }),
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || `Unable to remove this ${field} right now.`);
                }

                const updatedProducts = Array.isArray(data.products)
                    ? data.products.map((product) => normalizeProductRecord(product))
                    : [];
                const updatesById = new Map(updatedProducts.map((product) => [product.id, product]));
                const nextProducts = sortProducts(products.map((product) => updatesById.get(product.id) || product));

                setProducts(nextProducts);
                setBulkEditDraft((currentDraft) => currentDraft[field] === currentValue ? { ...currentDraft, [field]: replacementValue } : currentDraft);

                if (selectedProductId !== 'new' && updatesById.has(selectedProductId)) {
                    setDraft(createProductEditorState(updatesById.get(selectedProductId)));
                } else if (normalizeOptionValue(draft[field]) === currentValue) {
                    setDraft((currentDraft) => ({
                        ...currentDraft,
                        [field]: replacementValue,
                    }));
                }

                const nextSelectedProducts = sortProducts(nextProducts.filter((product) => selectedProductIds.includes(product.id)));
                setBulkGridDraft(createBulkGridDraft(nextSelectedProducts));
                setFeedback({ type: 'success', message: `${getTaxonomyLabel(field)} removed. ${matchingProducts.length} ${matchingProducts.length === 1 ? 'product' : 'products'} moved to ${replacementValue}.` });
            } else {
                setDraft((currentDraft) => ({
                    ...currentDraft,
                    [field]: replacementValue,
                }));
                setBulkEditDraft((currentDraft) => currentDraft[field] === currentValue ? { ...currentDraft, [field]: replacementValue } : currentDraft);
                setFeedback({ type: 'success', message: `${getTaxonomyLabel(field)} removed from the draft.` });
            }

            closeTaxonomyDeleteDialog();
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || `Unable to remove this ${field} right now.` });
        } finally {
            setIsTaxonomyUpdating(false);
        }
    };

    const handleUpload = async (event, field) => {
        const file = event.target.files?.[0];
        const productFolder = resolveProductUploadFolder(draft);

        if (!file) {
            return;
        }

        if (!productFolder) {
            event.target.value = '';
            setUploadFeedback({ type: 'error', message: 'Type the product name first so the upload can create its folder.' });
            return;
        }

        setIsUploading(true);
        setUploadFeedback({ type: 'idle', message: '' });

        try {
            const fileBaseName = slugifyProductName(file.name.replace(/\.[^.]+$/, '')) || 'image';
            const uploadedMedia = await uploadAdminMedia({
                file,
                bucket: ADMIN_MEDIA_UPLOAD_BUCKETS.storefront,
                folder: 'products',
                subfolder: productFolder,
                baseName: `${field.replace(/_/g, '-')}-${fileBaseName}`,
                imageMaxEdge: 2000,
            });
            const uploadedUrl = uploadedMedia.url;

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

            setUploadFeedback({
                type: 'success',
                message: uploadedMedia.optimized ? 'Image optimized and uploaded into this product folder.' : 'Media uploaded to Supabase Storage.',
            });
        } catch (error) {
            setUploadFeedback({ type: 'error', message: error.message || 'Unable to upload this image.' });
        } finally {
            event.target.value = '';
            setIsUploading(false);
        }
    };

    const handleStageMediaUpload = async (event, field) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setIsStageMediaUploading(true);
        setStageMediaFeedback({ type: 'idle', message: '' });

        try {
            const uploadedMedia = await uploadAdminMedia({
                file,
                bucket: ADMIN_MEDIA_UPLOAD_BUCKETS.storefront,
                folder: 'site-copy',
                subfolder: slugifyCollectionName(stageCollection || 'collection-media'),
                baseName: `${slugifyCollectionName(stageCollection || file.name.replace(/\.[^.]+$/, ''))}-${field === 'primaryMedia' ? 'primary-media' : 'secondary-media'}`,
                imageMaxEdge: 2200,
            });

            const uploadedUrl = uploadedMedia?.url || '';

            if (!uploadedUrl) {
                throw new Error('Upload finished, but URL generation failed.');
            }

            setStageMediaDraft((currentDraft) => ({
                ...currentDraft,
                [field]: uploadedUrl,
            }));
            setStageMediaFeedback({
                type: 'success',
                message: uploadedMedia.optimized
                    ? 'Collection stage image optimized and uploaded. Save to publish it on 5th Avenue.'
                    : 'Collection stage media uploaded. Save to publish it on 5th Avenue.',
            });
        } catch (error) {
            setStageMediaFeedback({ type: 'error', message: error.message || 'Unable to upload this media file.' });
        } finally {
            event.target.value = '';
            setIsStageMediaUploading(false);
        }
    };

    const productUploadFolder = resolveProductUploadFolder(draft);
    const canUploadProductMedia = Boolean(productUploadFolder);
    const productUploadDisabledMessage = 'Type the product name first to enable uploads and create its folder.';

    const handleStageMediaSave = async () => {
        if (!stageCollection || isStageMediaSaving) {
            return;
        }

        setIsStageMediaSaving(true);
        setStageMediaFeedback({ type: 'idle', message: '' });

        try {
            const payload = {
                collection: stageCollection,
                primaryMedia: String(stageMediaDraft.primaryMedia || '').trim(),
                secondaryMedia: String(stageMediaDraft.secondaryMedia || '').trim(),
            };

            const response = await fetch('/api/admin/site-copy', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    key: buildCollectionMediaKey(stageCollection),
                    value: JSON.stringify(payload),
                }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to save collection stage media right now.');
            }

            const nextEntry = parseCollectionMediaValue(data?.entry?.value, stageCollection);
            setCollectionStageMediaEntries((currentEntries) => ({
                ...currentEntries,
                [stageCollection]: {
                    primaryMedia: nextEntry.primaryMedia,
                    secondaryMedia: nextEntry.secondaryMedia,
                },
            }));
            setStageMediaFeedback({ type: 'success', message: `${stageCollection} visuals saved for 5th Avenue.` });
        } catch (error) {
            setStageMediaFeedback({ type: 'error', message: error.message || 'Unable to save collection stage media right now.' });
        } finally {
            setIsStageMediaSaving(false);
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

            if (method === 'POST') {
                setEditorMode('single');
                setSelectedProductId('new');
                setDraft(buildFreshDraft(nextProducts));
                setUploadFeedback({ type: 'idle', message: '' });
                setFeedback({ type: 'success', message: 'Product created. Ready for the next draft.' });
            } else {
                setSelectedProductId(savedProduct.id);
                setDraft(createProductEditorState(savedProduct));
                setFeedback({ type: 'success', message: 'Product saved.' });
            }
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

    const closeAttentionDialog = () => {
        setIsAttentionDialogOpen(false);
    };

    const jumpToPanel = (panelId) => {
        document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeAttentionDialog();
    };

    return (
        <>
            <div className="flex flex-col gap-10 md:gap-12">
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 md:gap-5">
                <MetricCard label="Catalog" value={String(products.length).padStart(2, '0')} copy="Total pieces in the current admin catalog." />
                <MetricCard label="Active" value={String(activeCount).padStart(2, '0')} copy="Visible on the storefront right now." />
                <MetricCard label="Drafts" value={String(draftCount).padStart(2, '0')} copy="Internal pieces waiting for polish or approval." />
                <MetricCard label="Featured" value={String(featuredCount).padStart(2, '0')} copy="Lead products carrying the archive direction." />
                <MetricCard label="Review" value={String(unresolvedActivityCount).padStart(2, '0')} copy="Orders and inbox items still waiting for a first look or final acknowledgement." />
                <MetricCard label="Inbox" value={String(adminInquiries.length).padStart(2, '0')} copy={`${inquiryAttentionCounts.unseen} unseen and ${inquiryAttentionCounts.reviewing} reviewing in the current inbox.`} />
            </section>

            <section className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">5th Avenue / Collection Visuals</p>
                    <h2 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em] leading-none">Collection Stage Media</h2>
                    <p className="text-sm leading-relaxed text-[#1C1C1C]/58">Set one primary and one secondary image per collection. These two visuals are what the 5th Avenue stage uses first for that collection.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)] gap-4 md:gap-5 items-end">
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        Collection
                        <select
                            value={stageCollection}
                            onChange={(event) => {
                                setStageCollection(event.target.value);
                                setStageMediaFeedback({ type: 'idle', message: '' });
                            }}
                            className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                        >
                            {collectionOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        Primary Stage Image
                        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                            <input
                                value={stageMediaDraft.primaryMedia}
                                onChange={(event) => setStageMediaDraft((currentDraft) => ({ ...currentDraft, primaryMedia: event.target.value }))}
                                className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                            />
                            <label className={`h-14 border border-[#1C1C1C]/12 flex items-center justify-center bg-white text-[10px] uppercase tracking-[0.22em] ${isStageMediaUploading ? 'opacity-60' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'} transition-colors cursor-pointer`}>
                                {isStageMediaUploading ? 'Uploading' : 'Upload'}
                                <input
                                    type="file"
                                    accept="image/*,.heic,.heif"
                                    className="hidden"
                                    onChange={(event) => handleStageMediaUpload(event, 'primaryMedia')}
                                    disabled={isStageMediaUploading}
                                />
                            </label>
                        </div>
                    </label>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        Secondary Stage Image
                        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                            <input
                                value={stageMediaDraft.secondaryMedia}
                                onChange={(event) => setStageMediaDraft((currentDraft) => ({ ...currentDraft, secondaryMedia: event.target.value }))}
                                className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                            />
                            <label className={`h-14 border border-[#1C1C1C]/12 flex items-center justify-center bg-white text-[10px] uppercase tracking-[0.22em] ${isStageMediaUploading ? 'opacity-60' : 'hover:bg-[#1C1C1C] hover:text-[#EFECE8]'} transition-colors cursor-pointer`}>
                                {isStageMediaUploading ? 'Uploading' : 'Upload'}
                                <input
                                    type="file"
                                    accept="image/*,.heic,.heif"
                                    className="hidden"
                                    onChange={(event) => handleStageMediaUpload(event, 'secondaryMedia')}
                                    disabled={isStageMediaUploading}
                                />
                            </label>
                        </div>
                    </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <p className="text-xs leading-relaxed text-[#1C1C1C]/52">Tip: upload, then click save. This setting is collection-level and no longer tied to any individual product record.</p>
                    <button
                        type="button"
                        onClick={handleStageMediaSave}
                        disabled={isStageMediaSaving || isStageMediaUploading}
                        className={`hover-target h-12 px-6 bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isStageMediaSaving || isStageMediaUploading ? 'opacity-60' : 'hover:bg-black'}`}
                    >
                        {isStageMediaSaving ? 'Saving' : 'Save Collection Visuals'}
                    </button>
                </div>

                {stageMediaFeedback.message && (
                    <p className={`text-sm ${stageMediaFeedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/68'}`}>{stageMediaFeedback.message}</p>
                )}
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

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                        Language Visibility
                        <select
                            value={languageVisibilityFilter}
                            onChange={(event) => setLanguageVisibilityFilter(event.target.value)}
                            className="h-14 border border-[#1C1C1C]/12 bg-white/75 px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                        >
                            <option value="all">All Languages</option>
                            {PRODUCT_LANGUAGE_VISIBILITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>

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
                            categoryOptions={categoryOptions}
                            collectionOptions={collectionOptions}
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
                                <button type="button" onClick={() => duplicateProduct(previewProduct)} className="hover-target h-12 px-5 border border-[#1C1C1C]/12 bg-white text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-[#1C1C1C] hover:text-[#EFECE8]">
                                    Duplicate Product
                                </button>
                            )}
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
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{getLanguageVisibilityLabel(previewProduct.language_visibility)}</span>
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{previewProduct.collection}</span>
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{previewProduct.category}</span>
                                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-2">{formatProductCurrency(previewProduct.price)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 items-start md:grid-cols-2 gap-5">
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
                                Language Visibility
                                <select value={draft.language_visibility} onChange={(event) => handleFieldChange('language_visibility', event.target.value)} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                    {PRODUCT_LANGUAGE_VISIBILITY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </label>

                            <TaxonomyField
                                label="Category"
                                value={draft.category}
                                options={categoryOptions}
                                helperText=""
                                displayLabels={categoryDisplayLabels}
                                className="md:col-span-2"
                                onChange={(value) => handleFieldChange('category', value)}
                                onAdd={() => openValueDialog('category')}
                                onEditLabels={() => openTaxonomyLabelDialog('category')}
                                onRemove={() => openTaxonomyDeleteDialog('category')}
                                editLabelsDisabled={!draft.category || isTaxonomyLabelSaving}
                                removeDisabled={!draft.category || isTaxonomyUpdating}
                            />

                            <TaxonomyField
                                label="Collection"
                                value={draft.collection}
                                options={collectionOptions}
                                helperText=""
                                displayLabels={collectionDisplayLabels}
                                className="md:col-span-2"
                                onChange={(value) => handleFieldChange('collection', value)}
                                onAdd={() => openValueDialog('collection')}
                                onEditLabels={() => openTaxonomyLabelDialog('collection')}
                                onRemove={() => openTaxonomyDeleteDialog('collection')}
                                editLabelsDisabled={!draft.collection || isTaxonomyLabelSaving}
                                removeDisabled={!draft.collection || isTaxonomyUpdating}
                            />

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
                            <p className="md:col-span-2 -mt-2 text-xs leading-relaxed text-[#1C1C1C]/52">Featured products stay at the front of the archive and continue to feed the Spotlight page. Use sort order to decide which lead piece appears first.</p>
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
                        <ImageField
                            label="Main Image URL"
                            value={draft.image_main}
                            field="image_main"
                            onChange={handleFieldChange}
                            onUpload={handleUpload}
                            isUploading={isUploading}
                            uploadDisabled={!canUploadProductMedia}
                            uploadDisabledMessage={productUploadDisabledMessage}
                        />
                        <ImageField
                            label="Detail Image URL"
                            value={draft.image_detail}
                            field="image_detail"
                            onChange={handleFieldChange}
                            onUpload={handleUpload}
                            isUploading={isUploading}
                            uploadDisabled={!canUploadProductMedia}
                            uploadDisabledMessage={productUploadDisabledMessage}
                        />
                        <label className="md:col-span-2 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Gallery URLs
                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px] gap-3 items-start">
                                <textarea value={draft.gallery} onChange={(event) => handleFieldChange('gallery', event.target.value)} rows={4} placeholder="One image URL per line" className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                                <label
                                    title={!canUploadProductMedia ? productUploadDisabledMessage : undefined}
                                    className={`h-14 border border-[#1C1C1C]/12 flex items-center justify-center bg-white text-[10px] uppercase tracking-[0.22em] ${isUploading || !canUploadProductMedia ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#1C1C1C] hover:text-[#EFECE8]'} transition-colors`}
                                >
                                    {isUploading ? 'Uploading' : 'Upload'}
                                    <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(event) => handleUpload(event, 'gallery')} disabled={isUploading || !canUploadProductMedia} />
                                </label>
                            </div>
                            {!canUploadProductMedia && <span className="text-xs normal-case tracking-normal text-[#1C1C1C]/52">Type the product name first. That name is used to create the product folder in Storage.</span>}
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

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">
                <AdminOrdersPanel recentOrders={adminOrders} onOrdersChange={setAdminOrders} panelId="admin-orders-panel" />
                <AdminInquiriesPanel recentInquiries={adminInquiries} onInquiriesChange={setAdminInquiries} panelId="admin-inquiries-panel" />
            </section>

            <section className="grid grid-cols-1 gap-6 items-start md:gap-8 xl:grid-cols-2 xl:items-stretch">
                <AdminDiscountCodesPanel initialDiscounts={discountCodes} recentOrders={adminOrders} setupMessage={promotionMessage} />
                <AdminAffiliateCodesPanel initialAffiliates={affiliateCodes} recentOrders={adminOrders} setupMessage={promotionMessage} />
            </section>

            <AdminCreatorApplicationsPanel
                initialApplications={creatorApplications}
                affiliateCodes={affiliateCodes}
                setupMessage={creatorReviewMessage}
            />

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

            <AttentionDialog
                open={isAttentionDialogOpen}
                orderCounts={orderAttentionCounts}
                inquiryCounts={inquiryAttentionCounts}
                onClose={closeAttentionDialog}
                onGoToOrders={() => jumpToPanel('admin-orders-panel')}
                onGoToInquiries={() => jumpToPanel('admin-inquiries-panel')}
            />

            <ConfirmDialog
                open={taxonomyDeleteDialog.open}
                title={`Remove ${getTaxonomyLabel(taxonomyDeleteDialog.field)}`}
                copy={`This removes "${taxonomyDeleteDialog.value}" from the available ${taxonomyDeleteDialog.field} list by reassigning any matching products to another value.`}
                detail={`Current replacement target: ${resolvePreferredOption((taxonomyDeleteDialog.field === 'collection' ? collectionOptions : categoryOptions).filter((option) => option !== taxonomyDeleteDialog.value), taxonomyDeleteDialog.field === 'collection' ? PRODUCT_DEFAULTS.collection : PRODUCT_DEFAULTS.category)}`}
                confirmLabel={`Remove ${getTaxonomyLabel(taxonomyDeleteDialog.field)}`}
                isLoading={isTaxonomyUpdating}
                onCancel={closeTaxonomyDeleteDialog}
                onConfirm={handleTaxonomyDelete}
            />

            <ValueDialog
                open={valueDialog.open}
                title={`Add ${getTaxonomyLabel(valueDialog.field)}`}
                copy={`Create a new ${valueDialog.field} value and apply it to the product draft immediately.`}
                label={getTaxonomyLabel(valueDialog.field)}
                value={valueDialog.value}
                confirmLabel={`Use ${getTaxonomyLabel(valueDialog.field)}`}
                onCancel={closeValueDialog}
                onChange={(nextValue) => setValueDialog((currentDialog) => ({ ...currentDialog, value: nextValue }))}
                onConfirm={confirmValueDialog}
            />

            <TaxonomyLabelDialog
                open={taxonomyLabelDialog.open}
                field={taxonomyLabelDialog.field}
                value={taxonomyLabelDialog.value}
                englishLabel={taxonomyLabelDialog.englishLabel}
                bulgarianLabel={taxonomyLabelDialog.bulgarianLabel}
                error={taxonomyLabelDialog.error}
                isLoading={isTaxonomyLabelSaving}
                onCancel={closeTaxonomyLabelDialog}
                onChangeEnglish={(nextValue) => setTaxonomyLabelDialog((currentDialog) => ({ ...currentDialog, englishLabel: nextValue, error: '' }))}
                onChangeBulgarian={(nextValue) => setTaxonomyLabelDialog((currentDialog) => ({ ...currentDialog, bulgarianLabel: nextValue, error: '' }))}
                onConfirm={handleTaxonomyLabelSave}
            />

            </div>
        </>
    );
}
