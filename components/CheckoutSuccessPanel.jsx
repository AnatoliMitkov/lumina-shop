"use client";

import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';
import EditableText from './site-copy/EditableText';

export default function CheckoutSuccessPanel({ orderCode = '', orderId = '', sessionId = '' }) {
  const { clearCart } = useCart();
  const [isFinalizing, setIsFinalizing] = useState(true);
  const [finalizedOrderCode, setFinalizedOrderCode] = useState(orderCode);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    async function finalizeCheckoutState() {
      let nextOrderCode = orderCode;

      try {
        const hasSessionReference = sessionId && !sessionId.includes('{');

        if (hasSessionReference) {
          const confirmResponse = await fetch('/api/payments/stripe/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId, sessionId }),
          });
          const confirmData = await confirmResponse.json().catch(() => ({}));

          if (!confirmResponse.ok) {
            throw new Error(confirmData.error || 'Payment confirmation is still syncing. Refresh the account page in a moment.');
          }

          nextOrderCode = confirmData?.order?.orderCode || nextOrderCode;
        }

        await fetch('/api/cart/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        if (isActive) {
          setConfirmationMessage(error.message || 'Payment confirmation is still syncing. Refresh the account page in a moment.');
        }
      } finally {
        clearCart();

        if (isActive) {
          setFinalizedOrderCode(nextOrderCode);
          setIsFinalizing(false);
        }
      }
    }

    finalizeCheckoutState();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="pt-32 md:pt-40 pb-24 md:pb-28 px-6 md:px-12 max-w-[1200px] mx-auto">
      <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-8 md:p-10 flex flex-col gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="checkout.success.eyebrow" fallback="Payment Received" editorLabel="Checkout success eyebrow" /></p>
          <h1 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.1em] leading-[0.92] text-[#1C1C1C]">
            {finalizedOrderCode || 'THE VA STORE'}
          </h1>
        </div>

        <p className="max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
          {isFinalizing
            ? <EditableText contentKey="checkout.success.finalizing" fallback="Your secure payment completed. Finalizing the local cart and starting a fresh session now." editorLabel="Checkout success finalizing" />
            : confirmationMessage || <EditableText contentKey="checkout.success.copy" fallback="Your secure payment completed successfully. The atelier has the paid order in the queue now, and your cart has been cleared for a fresh session." editorLabel="Checkout success copy" />}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.success.order" fallback="Order" editorLabel="Checkout success order label" /></p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]">{finalizedOrderCode || 'Processing'}</p>
          </div>
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.success.payment" fallback="Payment" editorLabel="Checkout success payment label" /></p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]">{confirmationMessage ? 'Syncing' : 'Paid'}</p>
          </div>
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.success.next_step" fallback="Next Step" editorLabel="Checkout success next step label" /></p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]"><EditableText contentKey="checkout.success.atelier_queue" fallback="Atelier Queue" editorLabel="Checkout success atelier queue" /></p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/account" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors"><EditableText contentKey="checkout.success.open_account" fallback="Open Account Archive" editorLabel="Checkout success open account" /></a>
          <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.success.return_collections" fallback="Return To Collections" editorLabel="Checkout success return collections" /></a>
        </div>
      </section>
    </div>
  );
}