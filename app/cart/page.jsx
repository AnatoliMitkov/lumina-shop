"use client";

import { useCart } from '../../components/CartProvider';

function CartImage({ item }) {
    if (!item.image_main) {
        return (
            <div className="w-full h-full min-h-64 bg-[#E4DED5] rounded-sm flex items-center justify-center text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/35">
                Atelier Piece
            </div>
        );
    }

    return <img src={item.image_main} alt={item.name} className="w-full h-full min-h-64 object-cover rounded-sm" />;
}

export default function CartPage() {
    const {
        cartItems,
        removeFromCart,
        cartTotal,
        cartStatus,
        checkoutStatus,
        cartMessage,
        cartPersistenceMode,
        hasLoadedCart,
        checkoutCart,
    } = useCart();

    const isSupabaseMode = cartPersistenceMode === 'supabase';
    const isArchiving = checkoutStatus === 'submitting';
    const cartFeedback = isArchiving
        ? 'Archiving your selection into the client account...'
        : cartStatus === 'saving' && isSupabaseMode
            ? 'Syncing your selection quietly in the background...'
            : cartMessage;
    const feedbackTone = checkoutStatus === 'error' || cartStatus === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : checkoutStatus === 'success'
            ? 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C]/75'
            : 'border-[#1C1C1C]/10 bg-white/40 text-[#1C1C1C]/60';
    const storageLabel = isSupabaseMode ? 'Account-Linked' : 'Browser-Held';
    const storageCopy = isSupabaseMode
        ? 'The selection can be archived into the client account when you are ready.'
        : 'For now, the selection stays in this browser, so the experience feels polished even before the account archive is switched on.';
    const primaryHref = cartItems.length === 0 ? '/collections' : '/contact';
    const primaryLabel = cartItems.length === 0
        ? 'Explore Collections'
        : isSupabaseMode
            ? (isArchiving ? 'Archiving...' : 'Archive Selection')
            : 'Request Through Atelier';

    return (
        <div className="pt-32 md:pt-40 pb-24 md:pb-28 px-6 md:px-12 max-w-[1800px] mx-auto">
            <div className="mb-12 md:mb-16 border-b border-[#1C1C1C]/10 pb-8 md:pb-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
                <div>
                    <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4">Selection / The VA Store</p>
                    <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full">Cart</h1></div>
                </div>

                <p className="hero-sub storefront-copy-measure opacity-0 text-sm md:text-base max-w-xl text-[#1C1C1C]/60 leading-relaxed">
                    This is a selection room rather than a rushed payment screen. Keep editing the pieces, remove what no longer feels right, and send the atelier forward only when the mix feels finished.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.78fr] gap-10 md:gap-14 items-start">
                <section className="flex flex-col gap-5 md:gap-6">
                    {!hasLoadedCart ? (
                        <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 rounded-sm p-8 md:p-10">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-4">Loading</p>
                            <p className="font-serif text-2xl md:text-3xl font-light leading-tight">Bringing your selection back into view.</p>
                        </div>
                    ) : cartItems.length === 0 ? (
                        <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 rounded-sm p-8 md:p-10 flex flex-col gap-6">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">Empty Cart</p>
                            <p className="font-serif text-2xl md:text-4xl font-light leading-tight max-w-2xl">Nothing is waiting here yet. Start with a piece that deserves a closer look.</p>
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <a href="/collections" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover:bg-black transition-colors">Explore Collections</a>
                                <a href="/spotlight" className="hover-target transition-link inline-flex items-center justify-center px-8 py-4 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors">Open Spotlight</a>
                            </div>
                        </div>
                    ) : (
                        cartItems.map((item, index) => (
                            <article key={`${item.id}-${index}`} className="reveal-text opacity-0 translate-y-8 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6 md:gap-8 border border-[#1C1C1C]/10 bg-white/40 rounded-sm p-5 md:p-6 items-start">
                                <div className="overflow-hidden rounded-sm bg-[#E4DED5]">
                                    <CartImage item={item} />
                                </div>

                                <div className="flex flex-col gap-5 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/40 mb-3">Piece {String(index + 1).padStart(2, '0')}</p>
                                            <h2 className="font-serif text-3xl md:text-4xl font-light leading-none break-words">{item.name}</h2>
                                        </div>

                                        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                                            <p className="font-sans text-lg md:text-xl font-medium">€{Number(item.price).toFixed(2)}</p>
                                            <button onClick={() => removeFromCart(index)} className="hover-target text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45 hover:text-[#1C1C1C] transition-colors">Remove</button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">
                                        <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/55 rounded-full">{item.category || 'Atelier Piece'}</span>
                                        <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/55 rounded-full">Hand-picked for review</span>
                                    </div>

                                    <p className="text-sm md:text-base leading-relaxed text-[#1C1C1C]/62 max-w-2xl">
                                        {item.description || 'This piece is now part of your current atelier selection and will stay here while you compare silhouettes, materials, and timing.'}
                                    </p>
                                </div>
                            </article>
                        ))
                    )}
                </section>

                <aside className="xl:sticky xl:top-32 flex flex-col gap-5 md:gap-6">
                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Selection Status</p>
                            <p className="font-serif text-3xl md:text-4xl font-light leading-tight">{storageLabel}</p>
                        </div>

                        <p className="text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">{storageCopy}</p>

                        <div className="grid grid-cols-2 gap-3 text-[#1C1C1C]">
                            <div className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-4 md:p-5">
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/40 mb-2">Pieces</p>
                                <p className="font-serif text-3xl font-light">{cartItems.length}</p>
                            </div>
                            <div className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-4 md:p-5">
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/40 mb-2">Total</p>
                                <p className="font-serif text-3xl font-light">€{cartTotal.toFixed(2)}</p>
                            </div>
                        </div>

                        {cartFeedback && (
                            <div className={`border rounded-sm px-4 py-4 text-sm leading-relaxed ${feedbackTone}`}>
                                {cartFeedback}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-2">
                            {cartItems.length === 0 ? (
                                <a href="/collections" className="hover-target transition-link w-full py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center transition-colors hover:bg-black">
                                    Explore Collections
                                </a>
                            ) : isSupabaseMode ? (
                                <button onClick={() => checkoutCart()} disabled={isArchiving} className={`hover-target w-full py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium transition-colors ${isArchiving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black'}`}>
                                    {primaryLabel}
                                </button>
                            ) : (
                                <a href={primaryHref} className="hover-target transition-link w-full py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center transition-colors hover:bg-black">
                                    {primaryLabel}
                                </a>
                            )}

                            <a href="/collections" className="hover-target transition-link w-full py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium text-center hover:border-[#1C1C1C]/25 hover:bg-white/50 transition-colors">Continue Shopping</a>
                        </div>
                    </div>

                    <div className="reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 rounded-sm p-6 md:p-8">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45 mb-3">Atelier Note</p>
                        <p className="text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">The cart is intentionally editorial rather than transactional. It helps shape a selection before payment, fittings, and final confirmation are handled in a more personal way.</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}