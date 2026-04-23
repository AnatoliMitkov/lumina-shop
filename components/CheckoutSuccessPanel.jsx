"use client";

import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, resolveLocalizedValue } from '../utils/language';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';

export default function CheckoutSuccessPanel({ orderCode = '', orderId = '', sessionId = '' }) {
  const { clearCart } = useCart();
  const siteCopy = useSiteCopy();
  const [isFinalizing, setIsFinalizing] = useState(true);
  const [finalizedOrderCode, setFinalizedOrderCode] = useState(orderCode);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const getText = (key, fallback) => siteCopy ? siteCopy.resolveText(key, fallback) : resolveLocalizedValue(fallback, DEFAULT_LANGUAGE);

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
            throw new Error(confirmData.error || getText(
              'checkout.success.messages.syncing',
              localizedFallback(
                'Payment confirmation is still syncing. Refresh the account page in a moment.',
                'Потвърждението на плащането още се синхронизира. Обновете профила след малко.'
              )
            ));
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
          setConfirmationMessage(error.message || getText(
            'checkout.success.messages.syncing',
            localizedFallback(
              'Payment confirmation is still syncing. Refresh the account page in a moment.',
              'Потвърждението на плащането още се синхронизира. Обновете профила след малко.'
            )
          ));
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
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="checkout.success.eyebrow" fallback={localizedFallback('Payment Received', 'Плащането е прието')} editorLabel="Checkout success eyebrow" /></p>
          <h1 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.1em] leading-[0.92] text-[#1C1C1C]">
            {finalizedOrderCode || 'THE VA STORE'}
          </h1>
        </div>

        <p className="max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
          {isFinalizing
            ? <EditableText contentKey="checkout.success.finalizing" fallback={localizedFallback('Your secure payment completed. Finalizing the local cart and starting a fresh session now.', 'Сигурното плащане приключи. Финализираме локалната количка и започваме нова сесия.')} editorLabel="Checkout success finalizing" />
            : confirmationMessage || <EditableText contentKey="checkout.success.copy" fallback={localizedFallback('Your secure payment completed successfully. The atelier has the paid order in the queue now, and your cart has been cleared for a fresh session.', 'Сигурното плащане приключи успешно. Ателието вече има платената поръчка, а количката ви е изчистена за нова сесия.')} editorLabel="Checkout success copy" />}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.success.order" fallback={localizedFallback('Order', 'Поръчка')} editorLabel="Checkout success order label" /></p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]">{finalizedOrderCode || getText('checkout.success.processing', localizedFallback('Processing', 'Обработка'))}</p>
          </div>
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.success.payment" fallback={localizedFallback('Payment', 'Плащане')} editorLabel="Checkout success payment label" /></p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]">{confirmationMessage ? getText('checkout.success.syncing', localizedFallback('Syncing', 'Синхронизиране')) : getText('checkout.success.paid', localizedFallback('Paid', 'Платено'))}</p>
          </div>
          <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 mb-2"><EditableText contentKey="checkout.success.next_step" fallback={localizedFallback('Next Step', 'Следваща стъпка')} editorLabel="Checkout success next step label" /></p>
            <p className="font-serif text-3xl font-light text-[#1C1C1C]"><EditableText contentKey="checkout.success.atelier_queue" fallback={localizedFallback('Atelier Queue', 'Опашка на ателието')} editorLabel="Checkout success atelier queue" /></p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/account" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors"><EditableText contentKey="checkout.success.open_account" fallback={localizedFallback('Open Account Archive', 'Отвори архива в профила')} editorLabel="Checkout success open account" /></a>
          <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.success.return_collections" fallback={localizedFallback('Return To Collections', 'Към колекциите')} editorLabel="Checkout success return collections" /></a>
        </div>
      </section>
    </div>
  );
}