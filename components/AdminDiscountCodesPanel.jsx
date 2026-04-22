"use client";

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { buildShippingBenefitLabel, shippingBenefitOptions } from '../utils/checkout';
import { discountTypeOptions, formatPromotionCurrency, toPromotionDateInputValue } from '../utils/promotions';

function formatDate(value) {
    if (!value) {
        return 'Open schedule';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function createEmptyDraft() {
    return {
        code: '',
        label: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '10',
        shipping_benefit: 'none',
        minimum_subtotal: '0',
        usage_limit: '',
        is_active: true,
        starts_at: '',
        ends_at: '',
    };
}

function createDraft(record) {
    if (!record) {
        return createEmptyDraft();
    }

    return {
        code: record.code || '',
        label: record.label || '',
        description: record.description || '',
        discount_type: record.discount_type || 'percentage',
        discount_value: String(record.discount_value ?? 0),
        shipping_benefit: record.shipping_benefit || 'none',
        minimum_subtotal: String(record.minimum_subtotal ?? 0),
        usage_limit: record.usage_limit == null ? '' : String(record.usage_limit),
        is_active: Boolean(record.is_active),
        starts_at: toPromotionDateInputValue(record.starts_at),
        ends_at: toPromotionDateInputValue(record.ends_at),
    };
}

function sortDiscountCodes(records = []) {
    return [...records].sort((leftRecord, rightRecord) => {
        if (Boolean(leftRecord.is_active) !== Boolean(rightRecord.is_active)) {
            return leftRecord.is_active ? -1 : 1;
        }

        const dateDifference = new Date(rightRecord.updated_at || rightRecord.created_at || 0).getTime() - new Date(leftRecord.updated_at || leftRecord.created_at || 0).getTime();

        if (dateDifference !== 0) {
            return dateDifference;
        }

        return String(leftRecord.code || '').localeCompare(String(rightRecord.code || ''));
    });
}

function buildStatusLabel(record) {
    if (!record?.is_active) {
        return 'Inactive';
    }

    if (record.starts_at || record.ends_at) {
        return `${formatDate(record.starts_at)} → ${formatDate(record.ends_at)}`;
    }

    return 'Always on';
}

export default function AdminDiscountCodesPanel({ initialDiscounts = [], setupMessage = '' }) {
    const [discounts, setDiscounts] = useState(sortDiscountCodes(initialDiscounts));
    const [selectedDiscountId, setSelectedDiscountId] = useState(initialDiscounts[0]?.id || 'new');
    const [draft, setDraft] = useState(initialDiscounts[0] ? createDraft(initialDiscounts[0]) : createEmptyDraft());
    const [searchValue, setSearchValue] = useState('');
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
    const isLocked = Boolean(setupMessage);

    useEffect(() => {
        setDiscounts(sortDiscountCodes(initialDiscounts));
    }, [initialDiscounts]);

    useEffect(() => {
        if (selectedDiscountId !== 'new' && !discounts.some((record) => record.id === selectedDiscountId)) {
            setSelectedDiscountId(discounts[0]?.id || 'new');
        }
    }, [discounts, selectedDiscountId]);

    useEffect(() => {
        if (selectedDiscountId === 'new') {
            setDraft(createEmptyDraft());
            setFeedback({ type: 'idle', message: '' });
            return;
        }

        const selectedRecord = discounts.find((record) => record.id === selectedDiscountId);

        if (selectedRecord) {
            setDraft(createDraft(selectedRecord));
            setFeedback({ type: 'idle', message: '' });
        }
    }, [discounts, selectedDiscountId]);

    const filteredDiscounts = useMemo(() => {
        return sortDiscountCodes(discounts.filter((record) => {
            if (!deferredSearch) {
                return true;
            }

            return [record.code, record.label, record.description]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch);
        }));
    }, [deferredSearch, discounts]);

    const selectedDiscount = selectedDiscountId === 'new'
        ? null
        : discounts.find((record) => record.id === selectedDiscountId) || null;
    const activeCount = discounts.filter((record) => record.is_active).length;
    const selectedDiscountRemainingUses = selectedDiscount?.usage_limit
        ? Math.max(Number(selectedDiscount.usage_limit || 0) - Number(selectedDiscount.usage_count || 0), 0)
        : null;

    const handleDraftChange = (field, value) => {
        setDraft((currentDraft) => ({
            ...currentDraft,
            [field]: value,
        }));
    };

    const handleSave = async (event) => {
        event.preventDefault();

        if (isLocked || isSaving || isDeleting) {
            return;
        }

        setIsSaving(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/admin/discounts', {
                method: selectedDiscount ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedDiscount ? { id: selectedDiscount.id, ...draft } : draft),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to save this discount code.');
            }

            const savedDiscount = data.discountCode;

            setDiscounts((currentDiscounts) => sortDiscountCodes([
                savedDiscount,
                ...currentDiscounts.filter((record) => record.id !== savedDiscount.id),
            ]));
            setSelectedDiscountId(savedDiscount.id);
            setDraft(createDraft(savedDiscount));
            setFeedback({ type: 'success', message: selectedDiscount ? 'Discount code saved.' : 'Discount code created.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to save this discount code.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (isLocked || isSaving || isDeleting || !selectedDiscount) {
            return;
        }

        const confirmed = window.confirm(`Delete discount code ${selectedDiscount.code}? This cannot be undone.`);

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch(`/api/admin/discounts?id=${encodeURIComponent(selectedDiscount.id)}`, {
                method: 'DELETE',
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to delete this discount code.');
            }

            const nextDiscounts = sortDiscountCodes(discounts.filter((record) => record.id !== selectedDiscount.id));
            setDiscounts(nextDiscounts);
            setSelectedDiscountId(nextDiscounts[0]?.id || 'new');
            setFeedback({ type: 'success', message: 'Discount code deleted.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to delete this discount code.' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-6 md:p-8 flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Promotion Pricing</p>
                    <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em]">Discount Codes</h3>
                </div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{activeCount} active / {discounts.length} total</p>
            </div>

            <p className="text-sm leading-relaxed text-[#1C1C1C]/58">
                Create percentage or fixed-value offers, set minimum subtotals, add optional domestic shipping overrides, and decide whether a code runs continuously or inside a time window.
            </p>

            {setupMessage && (
                <div className="border border-red-200 bg-red-50 rounded-sm px-4 py-4 text-sm leading-relaxed text-red-700">
                    {setupMessage}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
                <div className="flex flex-col gap-4">
                    <button type="button" onClick={() => setSelectedDiscountId('new')} disabled={isLocked} className={`hover-target h-12 rounded-full bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isLocked ? 'opacity-60' : 'hover:bg-black'}`}>
                        New Discount Code
                    </button>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                        Search
                        <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Code or label" className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </label>

                    <div className="max-h-[38rem] overflow-auto pr-1 flex flex-col gap-3">
                        {filteredDiscounts.length === 0 ? (
                            <p className="text-sm text-[#1C1C1C]/58">No discount codes match the current search.</p>
                        ) : (
                            filteredDiscounts.map((record) => (
                                <button
                                    key={record.id}
                                    type="button"
                                    onClick={() => setSelectedDiscountId(record.id)}
                                    className={`rounded-sm border p-4 text-left transition-colors ${selectedDiscountId === record.id ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/75 text-[#1C1C1C] hover:bg-white'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className={`text-[10px] uppercase tracking-[0.22em] mb-2 ${selectedDiscountId === record.id ? 'text-[#EFECE8]/55' : 'text-[#1C1C1C]/42'}`}>{record.label || 'Discount'}</p>
                                            <p className="font-serif text-2xl font-light leading-none">{record.code}</p>
                                        </div>
                                        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${selectedDiscountId === record.id ? 'border-white/12 bg-white/10 text-white/78' : record.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#1C1C1C]/12 bg-[#EFE7DA] text-[#1C1C1C]/62'}`}>{record.is_active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <p className={`mt-3 text-sm leading-relaxed ${selectedDiscountId === record.id ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}>
                                        {record.discount_type === 'percentage' ? `${record.discount_value}% off` : `${formatPromotionCurrency(record.discount_value)} off`}
                                    </p>
                                    {record.shipping_benefit && record.shipping_benefit !== 'none' && (
                                        <p className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${selectedDiscountId === record.id ? 'text-[#EFECE8]/52' : 'text-[#1C1C1C]/45'}`}>
                                            {buildShippingBenefitLabel(record.shipping_benefit)}
                                        </p>
                                    )}
                                    <div className={`mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] ${selectedDiscountId === record.id ? 'text-[#EFECE8]/50' : 'text-[#1C1C1C]/42'}`}>
                                        <span>Min {formatPromotionCurrency(record.minimum_subtotal || 0)}</span>
                                        <span>{buildStatusLabel(record)}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <form onSubmit={handleSave} className="border border-[#1C1C1C]/10 bg-[#EFECE8]/65 rounded-sm p-5 md:p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45">Discount Editor</p>
                            <h4 className="mt-3 font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]">{selectedDiscount ? selectedDiscount.code : 'New Code'}</h4>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/48">
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/72 px-3 py-2">{draft.discount_type === 'percentage' ? `${draft.discount_value || '0'}%` : formatPromotionCurrency(draft.discount_value || 0)}</span>
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/72 px-3 py-2">Min {formatPromotionCurrency(draft.minimum_subtotal || 0)}</span>
                            {draft.shipping_benefit !== 'none' && <span className="rounded-full border border-[#1C1C1C]/10 bg-white/72 px-3 py-2">{buildShippingBenefitLabel(draft.shipping_benefit)}</span>}
                            <span className="rounded-full border border-[#1C1C1C]/10 bg-white/72 px-3 py-2">{draft.is_active ? 'Live' : 'Paused'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Code
                            <input value={draft.code} onChange={(event) => handleDraftChange('code', event.target.value.replace(/\s+/g, '').toUpperCase())} placeholder="PROMO" disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-[0.18em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Label
                            <input value={draft.label} onChange={(event) => handleDraftChange('label', event.target.value)} placeholder="Spring Preview" disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Type
                            <select value={draft.discount_type} onChange={(event) => handleDraftChange('discount_type', event.target.value)} disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                {discountTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Value
                            <input value={draft.discount_value} onChange={(event) => handleDraftChange('discount_value', event.target.value)} type="number" min="0" step="0.01" disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Shipping Coverage
                            <select value={draft.shipping_benefit} onChange={(event) => handleDraftChange('shipping_benefit', event.target.value)} disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                {shippingBenefitOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal">Useful for collaborations or exceptions where domestic shipping should be marked as covered by the sender or by the receiver.</span>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Minimum Subtotal
                            <input value={draft.minimum_subtotal} onChange={(event) => handleDraftChange('minimum_subtotal', event.target.value)} type="number" min="0" step="0.01" disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Usage Limit
                            <input value={draft.usage_limit} onChange={(event) => handleDraftChange('usage_limit', event.target.value)} type="number" min="1" step="1" placeholder="Optional" disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            Start Date
                            <input value={draft.starts_at} onChange={(event) => handleDraftChange('starts_at', event.target.value)} type="date" disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                            End Date
                            <input value={draft.ends_at} onChange={(event) => handleDraftChange('ends_at', event.target.value)} type="date" disabled={isLocked} className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                        </label>
                    </div>

                    <p className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal">
                        Schedule dates are inclusive. The start date opens at the beginning of the day and the end date closes after that day finishes.
                    </p>

                    <label className="flex items-center gap-3 rounded-sm border border-[#1C1C1C]/10 bg-white/72 px-4 py-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        <input type="checkbox" checked={draft.is_active} onChange={(event) => handleDraftChange('is_active', event.target.checked)} disabled={isLocked} className="h-4 w-4 border border-[#1C1C1C]/20 accent-[#1C1C1C]" />
                        Allow this discount to apply at checkout
                    </label>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        Internal Studio Note
                        <textarea value={draft.description} onChange={(event) => handleDraftChange('description', event.target.value)} rows={4} disabled={isLocked} className="border border-[#1C1C1C]/12 bg-white px-4 py-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none" />
                        <span className="text-xs leading-relaxed text-[#1C1C1C]/55 normal-case tracking-normal">Saved for admin search and studio context only. Shoppers do not see this note at checkout.</span>
                    </label>

                    {selectedDiscount && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Redemptions</p>
                                <p className="font-serif text-2xl font-light text-[#1C1C1C]">{selectedDiscount.usage_count || 0}</p>
                            </div>
                            <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Remaining</p>
                                <p className="font-serif text-2xl font-light text-[#1C1C1C]">{selectedDiscountRemainingUses == null ? 'Open' : selectedDiscountRemainingUses}</p>
                            </div>
                            <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Limit</p>
                                <p className="font-serif text-2xl font-light text-[#1C1C1C]">{selectedDiscount.usage_limit || 'Open'}</p>
                            </div>
                            <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Window</p>
                                <p className="font-serif text-xl font-light text-[#1C1C1C] leading-tight">{buildStatusLabel(selectedDiscount)}</p>
                            </div>
                        </div>
                    )}

                    {feedback.message && <p className={`text-sm ${feedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/68'}`}>{feedback.message}</p>}

                    <div className="flex flex-wrap justify-end gap-3">
                        {selectedDiscount && (
                            <button type="button" onClick={handleDelete} disabled={isLocked || isSaving || isDeleting} className={`hover-target h-12 px-5 border border-red-200 bg-red-50 text-[10px] uppercase tracking-[0.22em] text-red-700 transition-colors ${isLocked || isSaving || isDeleting ? 'opacity-60' : 'hover:bg-red-100'}`}>
                                {isDeleting ? 'Deleting' : 'Delete Discount'}
                            </button>
                        )}
                        <button type="button" onClick={() => setSelectedDiscountId('new')} disabled={isLocked || isSaving || isDeleting} className={`hover-target h-12 px-5 border border-[#1C1C1C]/12 text-[10px] uppercase tracking-[0.22em] transition-colors ${isLocked || isSaving || isDeleting ? 'opacity-60' : 'hover:bg-white'}`}>
                            New Draft
                        </button>
                        <button disabled={isLocked || isSaving || isDeleting} className={`hover-target h-12 px-6 rounded-full bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isLocked || isSaving || isDeleting ? 'opacity-60' : 'hover:bg-black'}`}>
                            {isSaving ? 'Saving' : selectedDiscount ? 'Save Discount' : 'Create Discount'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}