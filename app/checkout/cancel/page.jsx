export const dynamic = 'force-dynamic';

import EditableText from '../../../components/site-copy/EditableText';

export default async function CheckoutCancelPage({ searchParams = {} }) {
  const orderCode = searchParams?.orderCode || '';

  return (
    <div className="pt-32 md:pt-40 pb-24 md:pb-28 px-6 md:px-12 max-w-[1200px] mx-auto">
      <section className="border border-[#1C1C1C]/10 bg-white/58 rounded-sm p-8 md:p-10 flex flex-col gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="checkout.cancel.eyebrow" fallback="Payment Not Completed" editorLabel="Checkout cancel eyebrow" /></p>
          <h1 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.1em] leading-[0.92] text-[#1C1C1C]">
            {orderCode || 'Checkout Cancelled'}
          </h1>
        </div>

        <p className="max-w-2xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">
          <EditableText contentKey="checkout.cancel.copy" fallback="The secure checkout was not completed. Your current selection stays in place, so you can return to checkout, adjust the order, or choose another payment path if it is available for that delivery scope." editorLabel="Checkout cancel copy" />
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/checkout" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors"><EditableText contentKey="checkout.cancel.return_checkout" fallback="Return To Checkout" editorLabel="Checkout cancel return to checkout" /></a>
          <a href="/cart" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors"><EditableText contentKey="checkout.cancel.back_to_cart" fallback="Back To Cart" editorLabel="Checkout cancel back to cart" /></a>
        </div>
      </section>
    </div>
  );
}