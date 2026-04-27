"use client";

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import PromotionTrendChart from './PromotionTrendChart';
import { buildAffiliateCodeInsights } from '../utils/promotion-insights';
import {
    affiliateCommissionOptions,
    affiliateCustomerDiscountOptions,
    createCheckoutPricingPreview,
    formatPromotionCurrency,
    toPromotionDateInputValue,
} from '../utils/promotions';

const DARK_SELECT_OPTION_STYLE = {
    backgroundColor: '#EFECE8',
    color: '#1C1C1C',
};

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

function toPreviewSubtotal(value) {
    const parsedValue = Number.parseFloat(String(value ?? 0));

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return 0;
    }

    return Number(parsedValue.toFixed(2));
}

function getRetentionTone(retainedShare) {
    if (retainedShare < 50) {
        return {
            shell: 'border-red-200/30 bg-red-400/10 text-red-100',
            accent: 'text-red-100',
            copy: 'text-red-100/80',
        };
    }

    if (retainedShare < 75) {
        return {
            shell: 'border-amber-200/30 bg-amber-400/10 text-amber-100',
            accent: 'text-amber-100',
            copy: 'text-amber-100/80',
        };
    }

    return {
        shell: 'border-emerald-200/30 bg-emerald-400/10 text-emerald-100',
        accent: 'text-emerald-100',
        copy: 'text-emerald-100/80',
    };
}

function createPreviewAffiliateRecord(draft = {}) {
    return {
        id: 'preview-affiliate',
        code: draft.code || 'PARTNER',
        partner_name: draft.partner_name || draft.code || 'Preview Partner',
        notes: draft.notes || '',
        customer_discount_type: draft.customer_discount_type || 'none',
        customer_discount_value: Number(draft.customer_discount_value ?? 0),
        commission_type: draft.commission_type || 'percentage',
        commission_value: Number(draft.commission_value ?? 0),
        can_stack_with_discount: Boolean(draft.can_stack_with_discount),
        minimum_subtotal: Number(draft.minimum_subtotal ?? 0),
        usage_limit: null,
        usage_count: 0,
        is_active: true,
        starts_at: null,
        ends_at: null,
    };
}

function createEmptyDraft() {
    return {
        code: '',
        partner_name: '',
        notes: '',
        customer_discount_type: 'percentage',
        customer_discount_value: '10',
        commission_type: 'percentage',
        commission_value: '10',
        can_stack_with_discount: false,
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
        partner_name: record.partner_name || '',
        notes: record.notes || '',
        customer_discount_type: record.customer_discount_type || 'none',
        customer_discount_value: String(record.customer_discount_value ?? 0),
        commission_type: record.commission_type || 'percentage',
        commission_value: String(record.commission_value ?? 0),
        can_stack_with_discount: Boolean(record.can_stack_with_discount),
        minimum_subtotal: String(record.minimum_subtotal ?? 0),
        usage_limit: record.usage_limit == null ? '' : String(record.usage_limit),
        is_active: Boolean(record.is_active),
        starts_at: toPromotionDateInputValue(record.starts_at),
        ends_at: toPromotionDateInputValue(record.ends_at),
    };
}

function sortAffiliateCodes(records = []) {
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

function buildScheduleLabel(record) {
    if (!record?.is_active) {
        return 'Inactive';
    }

    if (record.starts_at || record.ends_at) {
        return `${formatDate(record.starts_at)} → ${formatDate(record.ends_at)}`;
    }

    return 'Always on';
}

export default function AdminAffiliateCodesPanel({ initialAffiliates = [], recentOrders = [], setupMessage = '' }) {
    const [affiliateCodes, setAffiliateCodes] = useState(sortAffiliateCodes(initialAffiliates));
    const [selectedAffiliateId, setSelectedAffiliateId] = useState(initialAffiliates[0]?.id || 'new');
    const [draft, setDraft] = useState(initialAffiliates[0] ? createDraft(initialAffiliates[0]) : createEmptyDraft());
    const [searchValue, setSearchValue] = useState('');
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMathNoteOpen, setIsMathNoteOpen] = useState(false);
    const [referenceSubtotal, setReferenceSubtotal] = useState('500');
    const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
    const isLocked = Boolean(setupMessage);

    useEffect(() => {
        setAffiliateCodes(sortAffiliateCodes(initialAffiliates));
    }, [initialAffiliates]);

    useEffect(() => {
        if (selectedAffiliateId !== 'new' && !affiliateCodes.some((record) => record.id === selectedAffiliateId)) {
            setSelectedAffiliateId(affiliateCodes[0]?.id || 'new');
        }
    }, [affiliateCodes, selectedAffiliateId]);

    useEffect(() => {
        if (selectedAffiliateId === 'new') {
            setDraft(createEmptyDraft());
            setFeedback({ type: 'idle', message: '' });
            return;
        }

        const selectedRecord = affiliateCodes.find((record) => record.id === selectedAffiliateId);

        if (selectedRecord) {
            setDraft(createDraft(selectedRecord));
            setFeedback({ type: 'idle', message: '' });
        }
    }, [affiliateCodes, selectedAffiliateId]);

    useEffect(() => {
        setIsMathNoteOpen(false);
    }, [selectedAffiliateId]);

    const filteredAffiliateCodes = useMemo(() => {
        return sortAffiliateCodes(affiliateCodes.filter((record) => {
            if (!deferredSearch) {
                return true;
            }

            return [record.code, record.partner_name, record.notes]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch);
        }));
    }, [affiliateCodes, deferredSearch]);

    const selectedAffiliate = selectedAffiliateId === 'new'
        ? null
        : affiliateCodes.find((record) => record.id === selectedAffiliateId) || null;
    const activeCount = affiliateCodes.filter((record) => record.is_active).length;
    const previewSubtotal = useMemo(() => toPreviewSubtotal(referenceSubtotal), [referenceSubtotal]);
    const affiliateInsights = useMemo(
        () => buildAffiliateCodeInsights(recentOrders, selectedAffiliate?.code || draft.code),
        [draft.code, recentOrders, selectedAffiliate?.code]
    );
    const affiliatePreview = useMemo(
        () => createCheckoutPricingPreview({
            subtotal: previewSubtotal,
            affiliateCode: draft.code || 'PARTNER',
            affiliateRecord: createPreviewAffiliateRecord(draft),
        }),
        [draft, previewSubtotal]
    );
    const retainedRevenue = Math.max(
        0,
        previewSubtotal
            - Number(affiliatePreview.affiliate.customerDiscountAmount ?? 0)
            - Number(affiliatePreview.affiliate.commissionAmount ?? 0)
    );
    const retainedShare = previewSubtotal > 0 ? Number(((retainedRevenue / previewSubtotal) * 100).toFixed(1)) : 0;
    const retentionTone = getRetentionTone(retainedShare);

    const handleDraftChange = (field, value) => {
        setDraft((currentDraft) => {
            const nextDraft = {
                ...currentDraft,
                [field]: value,
            };

            if (field === 'customer_discount_type') {
                if (value === 'none') {
                    nextDraft.customer_discount_value = '0';
                } else if (Number.parseFloat(String(currentDraft.customer_discount_value ?? 0)) <= 0) {
                    nextDraft.customer_discount_value = '10';
                }
            }

            if (field === 'customer_discount_value') {
                const parsedValue = Number.parseFloat(String(value ?? ''));

                if (currentDraft.customer_discount_type === 'none' && Number.isFinite(parsedValue) && parsedValue > 0) {
                    nextDraft.customer_discount_type = 'percentage';
                }
            }

            return nextDraft;
        });
    };

    const handleSave = async (event) => {
        event.preventDefault();

        if (isLocked || isSaving || isDeleting) {
            return;
        }

        setIsSaving(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/admin/affiliates', {
                method: selectedAffiliate ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedAffiliate ? { id: selectedAffiliate.id, ...draft } : draft),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to save this affiliate code.');
            }

            const savedAffiliate = data.affiliateCode;

            setAffiliateCodes((currentAffiliateCodes) => sortAffiliateCodes([
                savedAffiliate,
                ...currentAffiliateCodes.filter((record) => record.id !== savedAffiliate.id),
            ]));
            setSelectedAffiliateId(savedAffiliate.id);
            setDraft(createDraft(savedAffiliate));
            setFeedback({ type: 'success', message: selectedAffiliate ? 'Affiliate code saved.' : 'Affiliate code created.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to save this affiliate code.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (isLocked || isSaving || isDeleting || !selectedAffiliate) {
            return;
        }

        const confirmed = window.confirm(`Delete affiliate code ${selectedAffiliate.code}? This cannot be undone.`);

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch(`/api/admin/affiliates?id=${encodeURIComponent(selectedAffiliate.id)}`, {
                method: 'DELETE',
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to delete this affiliate code.');
            }

            const nextAffiliateCodes = sortAffiliateCodes(affiliateCodes.filter((record) => record.id !== selectedAffiliate.id));
            setAffiliateCodes(nextAffiliateCodes);
            setSelectedAffiliateId(nextAffiliateCodes[0]?.id || 'new');
            setFeedback({ type: 'success', message: 'Affiliate code deleted.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to delete this affiliate code.' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-8 flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 mb-3">Partner Attribution</p>
                    <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em]">Affiliate Codes</h3>
                </div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{activeCount} active / {affiliateCodes.length} total</p>
            </div>

            <p className="text-sm leading-relaxed text-white/66">
                Track partner attribution, optionally reward the shopper, decide whether the affiliate shopper benefit can stack with discounts, and keep the commission logic attached to the same code the client enters at checkout. If stacking is off on either side, the discount code keeps the shopper savings and this affiliate stays tracking-only.
            </p>

            {setupMessage && (
                <div className="border border-red-200/40 bg-red-400/10 rounded-sm px-4 py-4 text-sm leading-relaxed text-red-100">
                    {setupMessage}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
                <div className="flex flex-col gap-4">
                    <button type="button" onClick={() => setSelectedAffiliateId('new')} disabled={isLocked} className={`hover-target h-12 rounded-full border border-white/12 bg-white/8 text-white text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isLocked ? 'opacity-60' : 'hover:bg-white/12'}`}>
                        New Affiliate Code
                    </button>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/42">
                        Search
                        <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Code or partner" className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20" />
                    </label>

                    <div className="max-h-[38rem] overflow-auto pr-1 flex flex-col gap-3">
                        {filteredAffiliateCodes.length === 0 ? (
                            <p className="text-sm text-white/60">No affiliate codes match the current search.</p>
                        ) : (
                            filteredAffiliateCodes.map((record) => (
                                <button
                                    key={record.id}
                                    type="button"
                                    onClick={() => setSelectedAffiliateId(record.id)}
                                    className={`rounded-sm border p-4 text-left transition-colors ${selectedAffiliateId === record.id ? 'border-white/18 bg-white/10 text-white' : 'border-white/10 bg-white/[0.04] text-white/88 hover:bg-white/[0.06]'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className={`text-[10px] uppercase tracking-[0.22em] mb-2 ${selectedAffiliateId === record.id ? 'text-white/50' : 'text-white/40'}`}>{record.partner_name || 'Affiliate'}</p>
                                            <p className="font-serif text-2xl font-light leading-none">{record.code}</p>
                                        </div>
                                        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${selectedAffiliateId === record.id ? 'border-white/12 bg-white/10 text-white/78' : record.is_active ? 'border-emerald-200/30 bg-emerald-400/10 text-emerald-200' : 'border-white/12 bg-white/[0.06] text-white/54'}`}>{record.is_active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <p className={`mt-3 text-sm leading-relaxed ${selectedAffiliateId === record.id ? 'text-white/70' : 'text-white/64'}`}>
                                        {record.customer_discount_type === 'none' ? 'Tracking only' : record.customer_discount_type === 'percentage' ? `${record.customer_discount_value}% shopper benefit` : `${formatPromotionCurrency(record.customer_discount_value)} shopper benefit`}
                                    </p>
                                    <p className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${selectedAffiliateId === record.id ? 'text-white/45' : 'text-white/38'}`}>
                                        {record.can_stack_with_discount ? 'Stacks with discount shopper savings' : 'Blocks discount shopper stacking'}
                                    </p>
                                    <div className={`mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] ${selectedAffiliateId === record.id ? 'text-white/45' : 'text-white/38'}`}>
                                        <span>{record.commission_type === 'percentage' ? `${record.commission_value}% commission` : `${formatPromotionCurrency(record.commission_value)} commission`}</span>
                                        <span>{buildScheduleLabel(record)}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <form onSubmit={handleSave} className="border border-white/10 bg-white/[0.05] rounded-sm p-5 md:p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">Affiliate Editor</p>
                            <h4 className="mt-3 font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none">{selectedAffiliate ? selectedAffiliate.code : 'New Code'}</h4>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-white/48">
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">{draft.customer_discount_type === 'none' ? 'Tracking only' : draft.customer_discount_type === 'percentage' ? `${draft.customer_discount_value || '0'}% shopper benefit` : `${formatPromotionCurrency(draft.customer_discount_value || 0)} shopper benefit`}</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">{draft.commission_type === 'percentage' ? `${draft.commission_value || '0'}% commission` : `${formatPromotionCurrency(draft.commission_value || 0)} commission`}</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">{draft.can_stack_with_discount ? 'Stacks with discount savings' : 'Standalone shopper benefit'}</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">{draft.is_active ? 'Live' : 'Paused'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Code
                            <input value={draft.code} onChange={(event) => handleDraftChange('code', event.target.value.replace(/\s+/g, '').toUpperCase())} placeholder="PARTNER" disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-[0.18em] uppercase text-white outline-none transition-colors focus:border-white/20" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Partner Name
                            <input value={draft.partner_name} onChange={(event) => handleDraftChange('partner_name', event.target.value)} placeholder="Atelier Partner" disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Customer Discount Type
                            <select value={draft.customer_discount_type} onChange={(event) => handleDraftChange('customer_discount_type', event.target.value)} disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-[10px] uppercase tracking-[0.22em] text-white outline-none transition-colors focus:border-white/20">
                                {affiliateCustomerDiscountOptions.map((option) => (
                                    <option key={option.value} value={option.value} style={DARK_SELECT_OPTION_STYLE}>{option.label}</option>
                                ))}
                            </select>
                            <div className="flex flex-col gap-2 pt-1">
                                <button type="button" onClick={() => setIsMathNoteOpen(true)} className="self-start rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white/68 transition-colors hover:border-white/20 hover:text-white">
                                    Open Margin Note
                                </button>
                            </div>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Customer Discount
                            <input value={draft.customer_discount_value} onChange={(event) => handleDraftChange('customer_discount_value', event.target.value)} type="number" min="0" step="0.01" disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20" />
                            <span className="text-xs leading-relaxed text-white/56 normal-case tracking-normal">
                                {draft.customer_discount_type === 'none'
                                    ? 'Tracking-only mode does not reduce checkout. Entering a positive value here will switch the code to a percentage shopper discount.'
                                    : 'This is the shopper-facing savings applied when the affiliate code is entered at checkout.'}
                            </span>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Commission Type
                            <select value={draft.commission_type} onChange={(event) => handleDraftChange('commission_type', event.target.value)} disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-[10px] uppercase tracking-[0.22em] text-white outline-none transition-colors focus:border-white/20">
                                {affiliateCommissionOptions.map((option) => (
                                    <option key={option.value} value={option.value} style={DARK_SELECT_OPTION_STYLE}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Commission Value
                            <input value={draft.commission_value} onChange={(event) => handleDraftChange('commission_value', event.target.value)} type="number" min="0" step="0.01" disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Minimum Subtotal
                            <input value={draft.minimum_subtotal} onChange={(event) => handleDraftChange('minimum_subtotal', event.target.value)} type="number" min="0" step="0.01" disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Usage Limit
                            <input value={draft.usage_limit} onChange={(event) => handleDraftChange('usage_limit', event.target.value)} type="number" min="1" step="1" placeholder="Optional" disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            Start Date
                            <input value={draft.starts_at} onChange={(event) => handleDraftChange('starts_at', event.target.value)} type="date" disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20" />
                        </label>
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                            End Date
                            <input value={draft.ends_at} onChange={(event) => handleDraftChange('ends_at', event.target.value)} type="date" disabled={isLocked} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20" />
                        </label>
                    </div>

                    <p className="text-xs leading-relaxed text-white/56 normal-case tracking-normal">
                        Schedule dates are inclusive. The start date opens at the beginning of the day and the end date closes after that day finishes.
                    </p>

                    <label className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/[0.05] px-4 py-4 text-[10px] uppercase tracking-[0.22em] text-white/58">
                        <input type="checkbox" checked={draft.can_stack_with_discount} onChange={(event) => handleDraftChange('can_stack_with_discount', event.target.checked)} disabled={isLocked} className="h-4 w-4 border border-white/20 accent-white" />
                        Allow this affiliate shopper benefit to stack with discount codes when the discount also opts in
                    </label>

                    <label className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/[0.05] px-4 py-4 text-[10px] uppercase tracking-[0.22em] text-white/58">
                        <input type="checkbox" checked={draft.is_active} onChange={(event) => handleDraftChange('is_active', event.target.checked)} disabled={isLocked} className="h-4 w-4 border border-white/20 accent-white" />
                        Allow this affiliate code to apply at checkout
                    </label>

                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/52">
                        Internal Partner Note
                        <textarea value={draft.notes} onChange={(event) => handleDraftChange('notes', event.target.value)} rows={4} disabled={isLocked} className="border border-white/10 bg-white/[0.04] px-4 py-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/20 resize-none" />
                        <span className="text-xs leading-relaxed text-white/56 normal-case tracking-normal">Saved for admin context only. Shoppers do not see this note at checkout.</span>
                    </label>

                    {selectedAffiliate && (
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <div className="border border-white/10 bg-white/[0.05] rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 mb-2">Redemptions</p>
                                    <p className="font-serif text-2xl font-light text-white">{selectedAffiliate.usage_count || 0}</p>
                                </div>
                                <div className="border border-white/10 bg-white/[0.05] rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 mb-2">Saved Value</p>
                                    <p className="font-serif text-2xl font-light text-white">{formatPromotionCurrency(affiliateInsights.totalSaved)}</p>
                                </div>
                                <div className="border border-white/10 bg-white/[0.05] rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 mb-2">Earned Value</p>
                                    <p className="font-serif text-2xl font-light text-white">{formatPromotionCurrency(affiliateInsights.totalEarned)}</p>
                                </div>
                                <div className="border border-white/10 bg-white/[0.05] rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 mb-2">Avg Payout</p>
                                    <p className="font-serif text-2xl font-light text-white">{formatPromotionCurrency(affiliateInsights.averageEarned)}</p>
                                </div>
                                <div className="border border-white/10 bg-white/[0.05] rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 mb-2">Limit</p>
                                    <p className="font-serif text-2xl font-light text-white">{selectedAffiliate.usage_limit || 'Open'}</p>
                                </div>
                                <div className="border border-white/10 bg-white/[0.05] rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 mb-2">Updated</p>
                                    <p className="font-serif text-2xl font-light text-white">{formatDate(selectedAffiliate.updated_at)}</p>
                                </div>
                            </div>

                            <PromotionTrendChart
                                title="Earnings & Savings Timeline"
                                copy="Recent affiliate payout and shopper savings across the last 14 days loaded in admin."
                                points={affiliateInsights.timeline}
                                series={[
                                    { key: 'earned', label: 'Earned', color: '#EFECE8' },
                                    { key: 'saved', label: 'Saved', color: '#C7A76A' },
                                ]}
                                theme="dark"
                                emptyMessage="No recent orders have used this affiliate code yet."
                            />
                        </div>
                    )}

                    {feedback.message && <p className={`text-sm ${feedback.type === 'error' ? 'text-red-200' : 'text-white/70'}`}>{feedback.message}</p>}

                    <div className="flex flex-wrap justify-end gap-3">
                        {selectedAffiliate && (
                            <button type="button" onClick={handleDelete} disabled={isLocked || isSaving || isDeleting} className={`hover-target h-12 px-5 border border-red-200/40 bg-red-400/10 text-[10px] uppercase tracking-[0.22em] text-red-100 transition-colors ${isLocked || isSaving || isDeleting ? 'opacity-60' : 'hover:bg-red-400/20'}`}>
                                {isDeleting ? 'Deleting' : 'Delete Affiliate'}
                            </button>
                        )}
                        <button type="button" onClick={() => setSelectedAffiliateId('new')} disabled={isLocked || isSaving || isDeleting} className={`hover-target h-12 px-5 border border-white/12 bg-white/5 text-[10px] uppercase tracking-[0.22em] text-white/72 transition-colors ${isLocked || isSaving || isDeleting ? 'opacity-60' : 'hover:bg-white/10'}`}>
                            New Draft
                        </button>
                        <button disabled={isLocked || isSaving || isDeleting} className={`hover-target h-12 px-6 rounded-full bg-[#EFE7DA] text-[#1C1C1C] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isLocked || isSaving || isDeleting ? 'opacity-60' : 'hover:bg-white'}`}>
                            {isSaving ? 'Saving' : selectedAffiliate ? 'Save Affiliate' : 'Create Affiliate'}
                        </button>
                    </div>
                </form>
            </div>

            {isMathNoteOpen && (
                <div className="fixed inset-0 z-[230] flex items-center justify-center bg-[rgba(12,12,12,0.62)] px-4 py-6 backdrop-blur-sm" onClick={() => setIsMathNoteOpen(false)}>
                    <div className={`w-full max-w-[42rem] rounded-sm border px-5 py-5 shadow-[0_32px_90px_rgba(0,0,0,0.35)] md:px-6 md:py-6 ${retentionTone.shell}`} onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 border-b border-current/12 pb-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] opacity-60">Margin Note</p>
                                <h4 className="mt-2 font-serif text-3xl font-light uppercase tracking-[0.08em]">Affiliate Math Preview</h4>
                            </div>
                            <button type="button" onClick={() => setIsMathNoteOpen(false)} className="rounded-full border border-current/12 px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors hover:border-current/24">
                                Close
                            </button>
                        </div>

                        <div className="mt-5 flex flex-col gap-4">
                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.18em] normal-case">
                                Reference subtotal
                                <input value={referenceSubtotal} onChange={(event) => setReferenceSubtotal(event.target.value)} type="number" min="0" step="0.01" className="h-11 border border-current/15 bg-black/10 px-3 text-sm tracking-normal text-current outline-none transition-colors focus:border-current/30" />
                            </label>

                            {affiliatePreview.affiliate.status !== 'invalid' ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div>
                                        <p className="text-[9px] uppercase tracking-[0.18em] opacity-70">Shopper Saves</p>
                                        <p className={`mt-2 font-serif text-2xl font-light ${retentionTone.accent}`}>{formatPromotionCurrency(affiliatePreview.affiliate.customerDiscountAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] uppercase tracking-[0.18em] opacity-70">Affiliate Earns</p>
                                        <p className={`mt-2 font-serif text-2xl font-light ${retentionTone.accent}`}>{formatPromotionCurrency(affiliatePreview.affiliate.commissionAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] uppercase tracking-[0.18em] opacity-70">Revenue Kept</p>
                                        <p className={`mt-2 font-serif text-2xl font-light ${retentionTone.accent}`}>{retainedShare}%</p>
                                    </div>
                                </div>
                            ) : (
                                <p className={`text-sm leading-relaxed ${retentionTone.copy}`}>{affiliatePreview.affiliate.message || 'This preview is waiting for a valid subtotal and value.'}</p>
                            )}

                            <p className={`text-xs leading-relaxed ${retentionTone.copy}`}>
                                Affiliate payout is based on subtotal after any promo-code savings, but before this affiliate code's own shopper discount is applied.
                                Revenue kept is what remains after shopper savings and partner payout, before product cost, shipping, VAT, and payment fees.
                                {draft.can_stack_with_discount ? ' Because stacking is enabled here, an allowed discount code can reduce the commission base and retained share before checkout closes.' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}