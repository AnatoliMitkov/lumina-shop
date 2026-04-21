"use client";

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { formatCustomMeasurementSummary } from '../utils/cart';
import {
    buildOrderAddressSummary,
    buildOrderCustomerLabel,
    buildOrderDeliverySummary,
    buildOrderDiscountSummary,
    buildOrderMapUrl,
    buildOrderReference,
    buildOrderShippingMessage,
    buildOrderShippingSummary,
    orderStatusOptions,
} from '../utils/checkout';
import { buildOrderPaymentSummary, getPaymentStatusMeta } from '../utils/payments';
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

function formatCurrency(value) {
    return `€${Number(value ?? 0).toFixed(2)}`;
}

function getStatusClasses(status) {
    switch (String(status || 'pending').toLowerCase()) {
        case 'paid':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'fulfilled':
            return 'border-[#1C1C1C]/12 bg-[#EFE7DA] text-[#1C1C1C]/62';
        case 'cancelled':
            return 'border-red-200 bg-red-50 text-red-700';
        default:
            return 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]';
    }
}

function sortOrders(orders, sortMode) {
    const sortedOrders = [...orders];

    sortedOrders.sort((leftOrder, rightOrder) => {
        switch (sortMode) {
            case 'oldest':
                return new Date(leftOrder.created_at || 0).getTime() - new Date(rightOrder.created_at || 0).getTime();
            case 'highest_total':
                return Number(rightOrder.total || 0) - Number(leftOrder.total || 0);
            case 'lowest_total':
                return Number(leftOrder.total || 0) - Number(rightOrder.total || 0);
            default:
                return new Date(rightOrder.created_at || 0).getTime() - new Date(leftOrder.created_at || 0).getTime();
        }
    });

    return sortedOrders;
}

function AttentionPill({ status, inverse = false, compact = false }) {
    const meta = getAdminAttentionMeta(status);
    const sizeClassName = compact
        ? 'gap-1.5 px-2.5 py-1.5 text-[9px] tracking-[0.18em]'
        : 'gap-2 px-3 py-2 text-[10px] tracking-[0.22em]';
    const dotClassName = compact ? 'h-1.5 w-1.5' : 'h-2 w-2';

    return (
        <span className={`inline-flex items-center rounded-full border uppercase ${sizeClassName} ${inverse ? meta.darkClassName : meta.lightClassName}`}>
            <span className={`${dotClassName} rounded-full ${meta.dotClassName}`}></span>
            {meta.label}
        </span>
    );
}

function OrderItemRow({ item, index }) {
    const customMeasurementSummary = formatCustomMeasurementSummary(item);

    return (
        <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 flex gap-4 items-start">
            <div className="w-16 h-20 shrink-0 overflow-hidden rounded-sm bg-[#E4DED5]">
                {item.image_main ? <img src={item.image_main} alt={item.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#1C1C1C]/42 mb-2">Piece {String(index + 1).padStart(2, '0')}</p>
                        <p className="font-serif text-xl font-light leading-none break-words text-[#1C1C1C]">{item.name}</p>
                    </div>
                    <p className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/58">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/46">
                    {item.category && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">{item.category}</span>}
                    {item.selected_size && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">Size {item.selected_size}</span>}
                    {item.selected_tone && <span className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">Tone {item.selected_tone}</span>}
                </div>
                {customMeasurementSummary && <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">Custom {customMeasurementSummary}</p>}
            </div>
        </div>
    );
}

export default function AdminOrdersPanel({
    recentOrders = [],
    onOrdersChange,
    panelId = 'admin-orders-panel',
}) {
    const [selectedOrderId, setSelectedOrderId] = useState(recentOrders[0]?.id || '');
    const [statusValue, setStatusValue] = useState(recentOrders[0]?.status || 'pending');
    const [attentionValue, setAttentionValue] = useState(normalizeAdminAttentionStatus(recentOrders[0]?.admin_attention_status));
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
    const [isStatusSaving, setIsStatusSaving] = useState(false);
    const [isAttentionSaving, setIsAttentionSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortMode, setSortMode] = useState('newest');
    const deferredSearchQuery = useDeferredValue(searchQuery);

    useEffect(() => {
        if (!recentOrders.some((order) => order.id === selectedOrderId)) {
            setSelectedOrderId(recentOrders[0]?.id || '');
        }
    }, [recentOrders, selectedOrderId]);

    const filteredOrders = useMemo(() => {
        const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
        const matchingOrders = recentOrders.filter((order) => {
            if (statusFilter !== 'all' && String(order.status || 'pending').toLowerCase() !== statusFilter) {
                return false;
            }

            if (!normalizedSearchQuery) {
                return true;
            }

            const searchHaystack = [
                order.order_code,
                order.customer_name,
                order.customer_email,
                order.customer_phone,
                order.customer_location,
                order.payment_status,
                order.payment_provider,
                order.delivery_method,
                order.shipping_city,
                order.shipping_country,
                order.admin_attention_status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchHaystack.includes(normalizedSearchQuery);
        });

        return sortOrders(matchingOrders, sortMode);
    }, [deferredSearchQuery, recentOrders, sortMode, statusFilter]);

    const selectedOrder = useMemo(
        () => filteredOrders.find((order) => order.id === selectedOrderId) || filteredOrders[0] || null,
        [filteredOrders, selectedOrderId]
    );

    useEffect(() => {
        setStatusValue(selectedOrder?.status || 'pending');
        setAttentionValue(normalizeAdminAttentionStatus(selectedOrder?.admin_attention_status));
        setFeedback({ type: 'idle', message: '' });
    }, [selectedOrder?.id, selectedOrder?.status, selectedOrder?.admin_attention_status]);

    const attentionCounts = useMemo(() => countAdminAttentionItems(recentOrders), [recentOrders]);

    const pushOrderUpdate = (nextOrder) => {
        if (typeof onOrdersChange !== 'function') {
            return;
        }

        onOrdersChange((currentOrders) => currentOrders.map((order) => order.id === nextOrder.id ? nextOrder : order));
    };

    const updateOrder = async ({ orderId, status, attentionStatus, successMessage = '', silent = false, mode = 'status' }) => {
        const setSavingState = mode === 'attention' ? setIsAttentionSaving : setIsStatusSaving;
        const attentionOnlyUpdate = Boolean(attentionStatus && !status);
        const orderToUpdate = recentOrders.find((order) => order.id === orderId) || null;

        setSavingState(true);

        if (!silent) {
            setFeedback({ type: 'idle', message: '' });
        }

        if (attentionOnlyUpdate && orderToUpdate) {
            pushOrderUpdate({
                ...orderToUpdate,
                admin_attention_status: attentionStatus,
            });

            if (selectedOrder?.id === orderId) {
                setAttentionValue(normalizeAdminAttentionStatus(attentionStatus));
            }
        }

        try {
            const response = await fetch('/api/admin/orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: orderId, ...(status ? { status } : {}), ...(attentionStatus ? { attentionStatus } : {}) }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to update the order right now.');
            }

            pushOrderUpdate(data.order);

            if (selectedOrder?.id === data.order.id) {
                setStatusValue(data.order.status || 'pending');
                setAttentionValue(normalizeAdminAttentionStatus(data.order.admin_attention_status));
            }

            if (!silent && successMessage) {
                setFeedback({ type: 'success', message: successMessage });
            }
        } catch (error) {
            if (attentionOnlyUpdate && orderToUpdate) {
                if (!silent) {
                    setFeedback({ type: 'success', message: 'Review state saved in this browser. Run supabase/cart-orders.sql to persist it for all admins.' });
                }

                return;
            }

            setFeedback({ type: 'error', message: error.message || 'Unable to update the order right now.' });
        } finally {
            setSavingState(false);
        }
    };

    const handleSelectOrder = (order) => {
        setSelectedOrderId(order.id);

        if (normalizeAdminAttentionStatus(order.admin_attention_status) === 'unseen') {
            void updateOrder({
                orderId: order.id,
                attentionStatus: 'reviewing',
                mode: 'attention',
                silent: true,
            });
        }
    };

    const quickStatusActions = selectedOrder ? orderStatusOptions.filter((option) => option.value !== selectedOrder.status) : [];
    const visibleLabel = filteredOrders.length === recentOrders.length
        ? `${recentOrders.length} visible`
        : `${filteredOrders.length} of ${recentOrders.length} visible`;
    const selectedAttentionMeta = getAdminAttentionMeta(attentionValue);

    return (
        <div id={panelId} className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-5 md:p-6 flex flex-col gap-4 scroll-mt-28">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-2">Order Review</p>
                    <h3 className="font-serif text-[1.75rem] md:text-[2.25rem] font-light uppercase tracking-[0.12em]">Atelier Orders</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                    <span>{visibleLabel}</span>
                    {attentionCounts.unseen > 0 && <AttentionPill status="unseen" />}
                    {attentionCounts.reviewing > 0 && <AttentionPill status="reviewing" />}
                    {attentionCounts.unseen === 0 && attentionCounts.reviewing === 0 && recentOrders.length > 0 && <AttentionPill status="seen" />}
                </div>
            </div>

            <p className="text-xs leading-relaxed text-[#1C1C1C]/58">
                The order rail now stays compact enough to show at least three entries at once, while the full order detail opens below without trapping the rest of the record inside another scroll box.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_10rem_10rem] gap-2">
                <label className="flex flex-col gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                    Search
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Order code, client, email"
                        className="h-10 border border-[#1C1C1C]/12 bg-white px-3.5 text-xs tracking-normal text-[#1C1C1C] outline-none transition-colors placeholder:text-[#1C1C1C]/28 focus:border-[#1C1C1C]"
                    />
                </label>

                <label className="flex flex-col gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                    Status
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 border border-[#1C1C1C]/12 bg-white px-3 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                        <option value="all">All Statuses</option>
                        {orderStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                    Sort
                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="h-10 border border-[#1C1C1C]/12 bg-white px-3 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest_total">Highest Total</option>
                        <option value="lowest_total">Lowest Total</option>
                    </select>
                </label>
            </div>

            {recentOrders.length === 0 ? (
                <p className="text-sm text-[#1C1C1C]/58">No recent orders yet.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    <div data-lenis-prevent-wheel className="max-h-[30rem] overflow-y-auto overscroll-contain pr-1 lg:max-h-[34rem]">
                        <div className="flex flex-col gap-3">
                            {filteredOrders.length === 0 ? (
                                <p className="text-sm text-[#1C1C1C]/58">No orders match the current filters.</p>
                            ) : filteredOrders.map((order) => {
                                const isActive = selectedOrder?.id === order.id;

                                return (
                                    <button
                                        key={order.id}
                                        type="button"
                                        onClick={() => handleSelectOrder(order)}
                                        className={`hover-target rounded-sm border p-3 text-left transition-colors ${isActive ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/75 text-[#1C1C1C] hover:bg-white'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className={`text-[9px] uppercase tracking-[0.18em] mb-1 ${isActive ? 'text-[#EFECE8]/52' : 'text-[#1C1C1C]/42'}`}>{buildOrderReference(order)}</p>
                                                <p className="font-serif text-xl font-light leading-none md:text-2xl">{formatCurrency(order.total || 0)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <AttentionPill status={order.admin_attention_status} inverse={isActive} compact />
                                                <span className={`rounded-full border px-2.5 py-1.5 text-[9px] uppercase tracking-[0.18em] ${isActive ? 'border-white/12 bg-white/10 text-white/78' : getStatusClasses(order.status)}`}>{order.status || 'pending'}</span>
                                            </div>
                                        </div>
                                        <p className={`mt-2 truncate text-[11px] leading-relaxed ${isActive ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}>{buildOrderCustomerLabel(order)}</p>
                                        <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.18em] ${isActive ? 'text-[#EFECE8]/48' : 'text-[#1C1C1C]/42'}`}>
                                            <span className="truncate">{buildOrderPaymentSummary(order)}</span>
                                            <span>{order.item_count || 0} piece{order.item_count === 1 ? '' : 's'}</span>
                                            <span>{formatDate(order.created_at)}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {selectedOrder && (
                        <div className="border border-[#1C1C1C]/10 bg-[#EFECE8]/78 rounded-sm p-5 md:p-6 flex flex-col gap-5">
                            {(() => {
                                const paymentStatusMeta = getPaymentStatusMeta(selectedOrder.payment_status, selectedOrder.checkout_mode);

                                return (
                                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-5 xl:items-start">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45 mb-2">Order Detail</p>
                                            <h4 className="font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]">{buildOrderReference(selectedOrder)}</h4>
                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <AttentionPill status={selectedOrder.admin_attention_status} />
                                                <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${getStatusClasses(selectedOrder.status)}`}>{selectedOrder.status || 'pending'}</span>
                                            </div>
                                            <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/58">Current status: <span className="font-medium text-[#1C1C1C]">{selectedOrder.status || 'pending'}</span>. Update it when the atelier has confirmed payment, completed the piece, or closed the request.</p>
                                            <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/58">Review state: <span className="font-medium text-[#1C1C1C]">{selectedAttentionMeta.label}</span>. {selectedAttentionMeta.copy}</p>
                                            <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/58">Payment state: <span className="font-medium text-[#1C1C1C]">{paymentStatusMeta.label}</span>. {paymentStatusMeta.description}</p>
                                        </div>

                                        <div className="flex flex-col gap-3 xl:items-stretch">
                                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                                                Order Status
                                                <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)} className="h-12 min-w-[12rem] border border-[#1C1C1C]/12 bg-white px-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                                    {orderStatusOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => updateOrder({ orderId: selectedOrder.id, status: statusValue, successMessage: 'Order status updated.', mode: 'status' })}
                                                disabled={isStatusSaving || statusValue === selectedOrder.status}
                                                className={`hover-target h-12 px-5 rounded-full bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isStatusSaving || statusValue === selectedOrder.status ? 'opacity-60' : 'hover:bg-black'}`}
                                            >
                                                {isStatusSaving ? 'Saving' : 'Save Order Status'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex flex-wrap gap-2">
                                {quickStatusActions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setStatusValue(option.value)}
                                        className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${statusValue === option.value ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C]/58 hover:bg-white hover:text-[#1C1C1C]'}`}
                                    >
                                        Mark {option.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {ADMIN_ATTENTION_STATUS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => updateOrder({ orderId: selectedOrder.id, attentionStatus: option.value, successMessage: `Order marked ${option.label.toLowerCase()}.`, mode: 'attention' })}
                                        disabled={isAttentionSaving || attentionValue === option.value}
                                        className={`hover-target rounded-full border px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${attentionValue === option.value ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C]/58 hover:bg-white hover:text-[#1C1C1C]'} ${isAttentionSaving ? 'opacity-60' : ''}`}
                                    >
                                        Mark {option.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 flex flex-col gap-2">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Customer</p>
                                    <p className="font-serif text-2xl font-light leading-tight text-[#1C1C1C]">{buildOrderCustomerLabel(selectedOrder)}</p>
                                    {selectedOrder.customer_email && <p className="text-sm text-[#1C1C1C]/62 break-all">{selectedOrder.customer_email}</p>}
                                    {selectedOrder.customer_phone && <p className="text-sm text-[#1C1C1C]/62">{selectedOrder.customer_phone}</p>}
                                    {selectedOrder.customer_location && <p className="text-sm text-[#1C1C1C]/62">{selectedOrder.customer_location}</p>}
                                </div>

                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 flex flex-col gap-2">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Delivery</p>
                                    <p className="font-serif text-2xl font-light leading-tight text-[#1C1C1C]">{buildOrderDeliverySummary(selectedOrder)}</p>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">{buildOrderShippingSummary(selectedOrder)}</p>
                                    {buildOrderShippingMessage(selectedOrder) && <p className="text-xs leading-relaxed text-[#1C1C1C]/46">{buildOrderShippingMessage(selectedOrder)}</p>}
                                    <p className="text-sm text-[#1C1C1C]/62">{buildOrderAddressSummary(selectedOrder)}</p>
                                    {buildOrderMapUrl(selectedOrder) && <a href={buildOrderMapUrl(selectedOrder)} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/46 underline underline-offset-4">Open pinned map</a>}
                                    {buildOrderDiscountSummary(selectedOrder) && <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">{buildOrderDiscountSummary(selectedOrder)}</p>}
                                </div>

                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 flex flex-col gap-2">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Payment</p>
                                    <p className="font-serif text-2xl font-light leading-tight text-[#1C1C1C]">{buildOrderPaymentSummary(selectedOrder)}</p>
                                    <p className="text-sm text-[#1C1C1C]/62">Checkout route: {selectedOrder.checkout_mode === 'stripe_checkout' ? 'Stripe Checkout' : 'Pay on delivery'}</p>
                                    {selectedOrder.payment_reference && <p className="text-xs break-all text-[#1C1C1C]/52">Reference: {selectedOrder.payment_reference}</p>}
                                    {selectedOrder.paid_at && <p className="text-xs text-[#1C1C1C]/52">Paid on {formatDate(selectedOrder.paid_at)}</p>}
                                </div>
                            </div>

                            {selectedOrder.customer_notes && (
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Customer Notes</p>
                                    <p className="text-sm leading-relaxed text-[#1C1C1C]/62">{selectedOrder.customer_notes}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Subtotal</p>
                                    <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(selectedOrder.subtotal ?? selectedOrder.total ?? 0)}</p>
                                </div>
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Savings</p>
                                    <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(selectedOrder.discount_amount ?? selectedOrder.pricing_snapshot?.discount_amount ?? 0)}</p>
                                </div>
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Shipping</p>
                                    <p className="font-serif text-xl font-light leading-tight text-[#1C1C1C]">{buildOrderShippingSummary(selectedOrder)}</p>
                                    {buildOrderShippingMessage(selectedOrder) && <p className="mt-2 text-xs leading-relaxed text-[#1C1C1C]/46">{buildOrderShippingMessage(selectedOrder)}</p>}
                                </div>
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Total</p>
                                    <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(selectedOrder.total ?? 0)}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {(selectedOrder.items || []).map((item, index) => (
                                    <OrderItemRow key={`${selectedOrder.id}-${item.id || index}-${index}`} item={item} index={index} />
                                ))}
                            </div>

                            {feedback.message && <p className={`text-sm ${feedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/68'}`}>{feedback.message}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
