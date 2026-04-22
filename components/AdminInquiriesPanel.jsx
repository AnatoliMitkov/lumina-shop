"use client";

import { useDeferredValue, useMemo, useState } from 'react';
import {
    ADMIN_ATTENTION_STATUS_OPTIONS,
    countAdminAttentionItems,
    getAdminAttentionMeta,
    normalizeAdminAttentionStatus,
} from '../utils/admin-attention';

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

function toTitleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildInquiryPreview(message) {
    const safeMessage = typeof message === 'string' ? message : '';
    const trimmedMessage = safeMessage.split('\n\nAttached selection:')[0].trim() || safeMessage.trim();

    if (!trimmedMessage) {
        return 'The inquiry is stored and ready for atelier follow-up.';
    }

    return trimmedMessage.length > 180 ? `${trimmedMessage.slice(0, 177)}...` : trimmedMessage;
}

function getInquiryStatusClasses(status) {
    switch (String(status || 'new').toLowerCase()) {
        case 'closed':
            return 'border-white/12 bg-white/[0.06] text-white/54';
        case 'in_progress':
            return 'border-[#D9C08A]/35 bg-[#D9C08A]/10 text-[#F0DEB4]';
        default:
            return 'border-emerald-200/30 bg-emerald-400/10 text-emerald-200';
    }
}

function sortInquiries(inquiries, sortMode) {
    const sortedInquiries = [...inquiries];

    sortedInquiries.sort((leftInquiry, rightInquiry) => {
        switch (sortMode) {
            case 'oldest':
                return new Date(leftInquiry.created_at || 0).getTime() - new Date(rightInquiry.created_at || 0).getTime();
            case 'name':
                return String(leftInquiry.full_name || leftInquiry.email || '').localeCompare(String(rightInquiry.full_name || rightInquiry.email || ''));
            default:
                return new Date(rightInquiry.created_at || 0).getTime() - new Date(leftInquiry.created_at || 0).getTime();
        }
    });

    return sortedInquiries;
}

function AttentionPill({ status }) {
    const meta = getAdminAttentionMeta(status);

    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${meta.darkClassName}`}>
            <span className={`h-2 w-2 rounded-full ${meta.dotClassName}`}></span>
            {meta.label}
        </span>
    );
}

export default function AdminInquiriesPanel({
    recentInquiries = [],
    onInquiriesChange,
    panelId = 'admin-inquiries-panel',
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [queryTypeFilter, setQueryTypeFilter] = useState('all');
    const [sortMode, setSortMode] = useState('newest');
    const [updatingInquiryId, setUpdatingInquiryId] = useState('');
    const [deletingInquiryId, setDeletingInquiryId] = useState('');
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const queryTypeOptions = useMemo(() => {
        return [...new Set(recentInquiries.map((inquiry) => String(inquiry.query_type || '').trim()).filter(Boolean))]
            .sort((leftValue, rightValue) => leftValue.localeCompare(rightValue));
    }, [recentInquiries]);

    const filteredInquiries = useMemo(() => {
        const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
        const matchingInquiries = recentInquiries.filter((inquiry) => {
            if (statusFilter !== 'all' && String(inquiry.status || 'new').toLowerCase() !== statusFilter) {
                return false;
            }

            if (queryTypeFilter !== 'all' && String(inquiry.query_type || '') !== queryTypeFilter) {
                return false;
            }

            if (!normalizedSearchQuery) {
                return true;
            }

            const searchHaystack = [
                inquiry.full_name,
                inquiry.email,
                inquiry.phone,
                inquiry.location,
                inquiry.query_type,
                inquiry.status,
                inquiry.message,
                inquiry.admin_attention_status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchHaystack.includes(normalizedSearchQuery);
        });

        return sortInquiries(matchingInquiries, sortMode);
    }, [deferredSearchQuery, queryTypeFilter, recentInquiries, sortMode, statusFilter]);

    const visibleLabel = filteredInquiries.length === recentInquiries.length
        ? `${recentInquiries.length} visible`
        : `${filteredInquiries.length} of ${recentInquiries.length} visible`;
    const attentionCounts = useMemo(() => countAdminAttentionItems(recentInquiries), [recentInquiries]);

    const pushInquiryUpdate = (nextInquiry) => {
        if (typeof onInquiriesChange !== 'function') {
            return;
        }

        onInquiriesChange((currentInquiries) => currentInquiries.map((inquiry) => inquiry.id === nextInquiry.id ? nextInquiry : inquiry));
    };

    const updateInquiryAttention = async (inquiryId, attentionStatus) => {
        const inquiryToUpdate = recentInquiries.find((inquiry) => inquiry.id === inquiryId) || null;

        setUpdatingInquiryId(inquiryId);
        setFeedback({ type: 'idle', message: '' });

        if (inquiryToUpdate) {
            pushInquiryUpdate({
                ...inquiryToUpdate,
                admin_attention_status: attentionStatus,
            });
        }

        try {
            const response = await fetch('/api/admin/inquiries', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: inquiryId, attentionStatus }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to update the inquiry right now.');
            }

            pushInquiryUpdate(data.inquiry);
            setFeedback({ type: 'success', message: `Inquiry marked ${attentionStatus}.` });
        } catch {
            setFeedback({ type: 'success', message: 'Review state saved in this browser. Run supabase/cart-orders.sql to persist it for all admins.' });
        } finally {
            setUpdatingInquiryId('');
        }
    };

    const deleteInquiry = async (inquiryId) => {
        setDeletingInquiryId(inquiryId);
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/admin/inquiries', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: inquiryId }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to delete this inquiry.');
            }

            onInquiriesChange((currentInquiries) => currentInquiries.filter((inquiry) => inquiry.id !== inquiryId));
            setFeedback({ type: 'success', message: 'Inquiry deleted successfully.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to delete this inquiry.' });
        } finally {
            setDeletingInquiryId('');
        }
    };

    return (
        <div id={panelId} className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-6 md:p-8 flex flex-col gap-5 scroll-mt-28">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 mb-3">Inquiry Review</p>
                    <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em]">Atelier Inbox</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                    <span>{visibleLabel}</span>
                    {attentionCounts.unseen > 0 && <AttentionPill status="unseen" />}
                    {attentionCounts.reviewing > 0 && <AttentionPill status="reviewing" />}
                    {attentionCounts.unseen === 0 && attentionCounts.reviewing === 0 && recentInquiries.length > 0 && <AttentionPill status="seen" />}
                </div>
            </div>

            <p className="text-sm leading-relaxed text-white/66">
                The inbox still keeps its compact review rail, but now every inquiry also carries a separate unseen, reviewing, or seen state so new notes stand out before they disappear into the normal workflow status.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_11rem_11rem_10rem] gap-3">
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/42">
                    Search
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Name, email, message"
                        className="h-12 border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/20"
                    />
                </label>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/42">
                    Status
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-[10px] uppercase tracking-[0.22em] text-white outline-none transition-colors focus:border-white/20">
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                    </select>
                </label>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/42">
                    Type
                    <select value={queryTypeFilter} onChange={(event) => setQueryTypeFilter(event.target.value)} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-[10px] uppercase tracking-[0.22em] text-white outline-none transition-colors focus:border-white/20">
                        <option value="all">All Types</option>
                        {queryTypeOptions.map((option) => (
                            <option key={option} value={option}>{toTitleCase(option)}</option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-white/42">
                    Sort
                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="h-12 border border-white/10 bg-white/[0.04] px-4 text-[10px] uppercase tracking-[0.22em] text-white outline-none transition-colors focus:border-white/20">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name">Name A-Z</option>
                    </select>
                </label>
            </div>

            <div className="max-h-[42rem] overflow-auto pr-1">
                <div className="flex flex-col gap-4">
                    {filteredInquiries.length === 0 ? (
                        <p className="text-sm text-white/60">No inquiries match the current filters.</p>
                    ) : (
                        filteredInquiries.map((inquiry) => {
                            const attentionStatus = normalizeAdminAttentionStatus(inquiry.admin_attention_status);

                            return (
                                <div key={inquiry.id} className="border border-white/10 bg-white/[0.04] rounded-sm p-4 md:p-5 flex flex-col gap-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">{toTitleCase(inquiry.query_type || 'other')}</p>
                                            <p className="font-serif text-2xl font-light leading-none text-white">{inquiry.full_name || inquiry.email}</p>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">{formatDate(inquiry.created_at)}</span>
                                    </div>

                                    <p className="text-sm leading-relaxed text-white/68">{buildInquiryPreview(inquiry.message)}</p>

                                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
                                        <span>{inquiry.email}</span>
                                        {inquiry.phone && <span className="text-white/26">•</span>}
                                        {inquiry.phone && <span>{inquiry.phone}</span>}
                                        {inquiry.location && <span className="text-white/26">•</span>}
                                        {inquiry.location && <span>{inquiry.location}</span>}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${getInquiryStatusClasses(inquiry.status)}`}>
                                                {toTitleCase(inquiry.status || 'new')}
                                            </span>
                                            <AttentionPill status={attentionStatus} />
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {ADMIN_ATTENTION_STATUS_OPTIONS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    suppressHydrationWarning
                                                    type="button"
                                                    onClick={() => updateInquiryAttention(inquiry.id, option.value)}
                                                    disabled={updatingInquiryId === inquiry.id || attentionStatus === option.value}
                                                    className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${attentionStatus === option.value ? 'border-white/18 bg-white/10 text-white' : 'border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/10'} ${updatingInquiryId === inquiry.id ? 'opacity-60' : ''}`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm(`Delete this inquiry from ${inquiry.full_name || inquiry.email}? This cannot be undone.`)) {
                                                        void deleteInquiry(inquiry.id);
                                                    }
                                                }}
                                                disabled={deletingInquiryId === inquiry.id}
                                                className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors border-red-400/40 bg-red-400/10 text-red-200 ${deletingInquiryId === inquiry.id ? 'opacity-60' : 'hover:bg-red-400/20'}`}
                                            >
                                                {deletingInquiryId === inquiry.id ? 'Deleting' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {feedback.message && <p className={`text-sm ${feedback.type === 'error' ? 'text-red-300' : 'text-white/68'}`}>{feedback.message}</p>}
        </div>
    );
}
