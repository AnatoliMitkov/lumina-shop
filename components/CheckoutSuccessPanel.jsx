"use client";

import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';

export default function CheckoutSuccessPanel({ orderCode = '' }) {
  const { clearCart } = useCart();
  const [isFinalizing, setIsFinalizing] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function finalizeCheckoutState() {
      try {
        await fetch('/api/cart/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } finally {
        clearCart();

        if (isActive) {
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
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4">Payment Received</p>
          <h1 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.1em] leading-[0.92] text-[#1C1C1C]">
            {orderCode || 'THE VA STORE'}
          </h1>
        </div>

        <p className="max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
          {isFinalizing
            ? 'Your secure payment completed. Finalizing the local cart and starting a fresh session now.'
            : 'Your secure payment completed successfully. The atelier has the paid order in the queue now, and your cart has been cleared for a fresh session.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Order</p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]">{orderCode || 'Processing'}</p>
          </div>
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Payment</p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]">Paid</p>
          </div>
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2">Next Step</p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]">Atelier Queue</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/account" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors">Open Account Archive</a>
          <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors">Return To Collections</a>
        </div>
      </section>
    </div>
  );
}