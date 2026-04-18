"use client";

import { useEffect, useMemo, useState } from 'react';
import { formatCustomMeasurementSummary } from '../utils/cart';
import {
    buildOrderAddressSummary,
    buildOrderCustomerLabel,
    buildOrderDeliverySummary,
    buildOrderDiscountSummary,
    buildOrderReference,
    orderStatusOptions,
} from '../utils/checkout';

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

export default function AdminOrdersPanel({ recentOrders = [] }) {
    const [orders, setOrders] = useState(recentOrders);
    const [selectedOrderId, setSelectedOrderId] = useState(recentOrders[0]?.id || '');
    const [statusValue, setStatusValue] = useState(recentOrders[0]?.status || 'pending');
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setOrders(recentOrders);
    }, [recentOrders]);

    useEffect(() => {
        if (!orders.some((order) => order.id === selectedOrderId)) {
            setSelectedOrderId(orders[0]?.id || '');
        }
    }, [orders, selectedOrderId]);

    const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) || orders[0] || null, [orders, selectedOrderId]);

    useEffect(() => {
        setStatusValue(selectedOrder?.status || 'pending');
        setFeedback({ type: 'idle', message: '' });
    }, [selectedOrder?.id]);

    const handleSaveStatus = async () => {
        if (!selectedOrder || isSaving) {
            return;
        }

        setIsSaving(true);
        setFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/admin/orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: selectedOrder.id, status: statusValue }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to update the order right now.');
            }

            setOrders((currentOrders) => currentOrders.map((order) => order.id === data.order.id ? data.order : order));
            setFeedback({ type: 'success', message: 'Order status updated.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Unable to update the order right now.' });
        } finally {
            setIsSaving(false);
        }
    };

    const quickStatusActions = orderStatusOptions.filter((option) => option.value !== selectedOrder?.status);

    return (
        <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-6 md:p-8 flex flex-col gap-5">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Order Review</p>
                    <h3 className="font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.12em]">Atelier Orders</h3>
                </div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">{orders.length} visible</p>
            </div>

            <p className="text-sm leading-relaxed text-[#1C1C1C]/58">
                Select an order, review the customer and delivery details, then move it through the atelier flow by setting it to <span className="font-medium text-[#1C1C1C]">Paid</span>, <span className="font-medium text-[#1C1C1C]">Fulfilled</span>, or <span className="font-medium text-[#1C1C1C]">Cancelled</span>.
            </p>

            {orders.length === 0 ? (
                <p className="text-sm text-[#1C1C1C]/58">No recent orders yet.</p>
            ) : (
                <>
                    <div className="flex flex-col gap-3">
                        {orders.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => setSelectedOrderId(order.id)}
                                className={`hover-target rounded-sm border p-4 text-left transition-colors ${selectedOrder?.id === order.id ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/75 text-[#1C1C1C] hover:bg-white'}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className={`text-[10px] uppercase tracking-[0.22em] mb-2 ${selectedOrder?.id === order.id ? 'text-[#EFECE8]/52' : 'text-[#1C1C1C]/42'}`}>{buildOrderReference(order)}</p>
                                        <p className="font-serif text-2xl font-light leading-none">{formatCurrency(order.total || 0)}</p>
                                    </div>
                                    <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${selectedOrder?.id === order.id ? 'border-white/12 bg-white/10 text-white/78' : getStatusClasses(order.status)}`}>{order.status || 'pending'}</span>
                                </div>
                                <p className={`mt-3 text-sm leading-relaxed ${selectedOrder?.id === order.id ? 'text-[#EFECE8]/72' : 'text-[#1C1C1C]/58'}`}>{buildOrderCustomerLabel(order)}</p>
                                <div className={`mt-3 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] ${selectedOrder?.id === order.id ? 'text-[#EFECE8]/48' : 'text-[#1C1C1C]/42'}`}>
                                    <span>{order.item_count || 0} piece{order.item_count === 1 ? '' : 's'}</span>
                                    <span>{formatDate(order.created_at)}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedOrder && (
                        <div className="border border-[#1C1C1C]/10 bg-[#EFECE8]/78 rounded-sm p-5 md:p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45 mb-2">Order Detail</p>
                                    <h4 className="font-serif text-3xl font-light uppercase tracking-[0.1em] leading-none text-[#1C1C1C]">{buildOrderReference(selectedOrder)}</h4>
                                    <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/58">Current status: <span className="font-medium text-[#1C1C1C]">{selectedOrder.status || 'pending'}</span>. Update it when the atelier has confirmed payment, completed the piece, or closed the request.</p>
                                </div>

                                <div className="flex flex-col gap-3 xl:items-end">
                                    <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)} className="h-12 min-w-[12rem] border border-[#1C1C1C]/12 bg-white px-4 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]">
                                        {orderStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <button type="button" onClick={handleSaveStatus} disabled={isSaving || statusValue === selectedOrder.status} className={`hover-target h-12 px-5 rounded-full bg-[#1C1C1C] text-[#EFECE8] text-[10px] uppercase tracking-[0.24em] font-medium transition-colors ${isSaving || statusValue === selectedOrder.status ? 'opacity-60' : 'hover:bg-black'}`}>
                                        {isSaving ? 'Saving' : 'Save Order Status'}
                                    </button>
                                </div>
                            </div>

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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <p className="text-sm text-[#1C1C1C]/62">{buildOrderAddressSummary(selectedOrder)}</p>
                                    {buildOrderDiscountSummary(selectedOrder) && <p className="text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/42">{buildOrderDiscountSummary(selectedOrder)}</p>}
                                </div>
                            </div>

                            {selectedOrder.customer_notes && (
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Customer Notes</p>
                                    <p className="text-sm leading-relaxed text-[#1C1C1C]/62">{selectedOrder.customer_notes}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3">
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Subtotal</p>
                                    <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(selectedOrder.subtotal ?? selectedOrder.total ?? 0)}</p>
                                </div>
                                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4">
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42 mb-2">Shipping</p>
                                    <p className="font-serif text-2xl font-light text-[#1C1C1C]">{formatCurrency(selectedOrder.shipping_amount ?? 0)}</p>
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
                </>
            )}
        </div>
    );
}