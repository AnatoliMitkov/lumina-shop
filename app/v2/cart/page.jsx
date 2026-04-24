"use client";

import { useCart } from '../../../components/CartProvider';
import { formatProductCurrency } from '../../../utils/products';

export default function V2CartPage() {
    const { cartItems, removeFromCart, cartTotal, cartStatus } = useCart();

    const isEmpty = cartItems.length === 0;

    return (
        <div className="v2-page">
            <div className="v2-container v2-section">
                {/* Header */}
                <header className="mb-12 md:mb-16 pb-8 border-b border-[#1C1C1C]/10">
                    <p className="v2-label text-[#1C1C1C]/40 mb-3">The VA Store</p>
                    <h1 className="v2-heading-display">Cart</h1>
                </header>

                {cartStatus === 'loading' && (
                    <p className="v2-label text-[#1C1C1C]/40 py-20 text-center">
                        Loading your cart…
                    </p>
                )}

                {cartStatus !== 'loading' && isEmpty && (
                    <div className="py-20 text-center flex flex-col items-center gap-6">
                        <p className="v2-heading-lg text-[#1C1C1C]/35">Your cart is empty</p>
                        <p className="v2-body-sm text-[#1C1C1C]/45 max-w-xs">
                            Explore the collection and add pieces you love.
                        </p>
                        <a href="/v2/collections" className="v2-btn v2-btn-primary">
                            Browse Collections
                        </a>
                    </div>
                )}

                {!isEmpty && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-start">
                        {/* Cart items */}
                        <div className="flex flex-col divide-y divide-[#1C1C1C]/8">
                            {cartItems.map((item, index) => (
                                <div key={`${item.id}-${index}`} className="py-6 flex gap-5 items-start">
                                    {/* Image */}
                                    <div className="shrink-0 w-20 md:w-24 aspect-[3/4] overflow-hidden bg-[#D9CBB9]">
                                        {item.image_main ? (
                                            <img
                                                src={item.image_main}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        ) : null}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <p className="v2-label text-[#1C1C1C]/40 mb-1">{item.category}</p>
                                                <h2 className="v2-heading-lg leading-tight">{item.name}</h2>
                                            </div>
                                            <p className="v2-price shrink-0">
                                                {formatProductCurrency(item.price)}
                                            </p>
                                        </div>

                                        {/* Size / tone */}
                                        {(item.selected_size || item.selected_tone) && (
                                            <div className="flex flex-wrap gap-2">
                                                {item.selected_size && (
                                                    <span className="v2-badge">
                                                        Size {item.selected_size}
                                                    </span>
                                                )}
                                                {item.selected_tone && (
                                                    <span className="v2-badge">
                                                        Tone {item.selected_tone}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Remove */}
                                        <button
                                            type="button"
                                            onClick={() => removeFromCart(index)}
                                            className="v2-label text-[#1C1C1C]/35 hover:text-[#1C1C1C] transition-colors w-fit mt-1"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order summary */}
                        <div className="lg:sticky lg:top-[calc(var(--v2-nav-height)+2rem)] flex flex-col gap-6 border border-[#1C1C1C]/10 p-6 md:p-8 bg-white/50">
                            <h2 className="v2-label text-[#1C1C1C]/45">Order Summary</h2>

                            <div className="flex flex-col gap-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="v2-body-sm text-[#1C1C1C]/60">
                                        Subtotal ({cartItems.length} piece{cartItems.length !== 1 ? 's' : ''})
                                    </span>
                                    <span className="v2-price">{formatProductCurrency(cartTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="v2-body-sm text-[#1C1C1C]/60">Shipping</span>
                                    <span className="v2-label text-[#1C1C1C]/50">
                                        {cartTotal >= 300 ? 'Free' : 'Calculated at checkout'}
                                    </span>
                                </div>
                            </div>

                            <hr className="v2-divider" />

                            <div className="flex justify-between items-center">
                                <span className="v2-label text-[#1C1C1C]/60">Total</span>
                                <span className="font-serif text-2xl font-light">
                                    {formatProductCurrency(cartTotal)}
                                </span>
                            </div>

                            <a
                                href="/checkout"
                                className="v2-btn v2-btn-primary w-full text-center py-4"
                            >
                                Proceed to Checkout
                            </a>

                            <a
                                href="/v2/collections"
                                className="v2-btn v2-btn-secondary w-full text-center py-3"
                            >
                                Continue Shopping
                            </a>

                            <p className="v2-label text-[#1C1C1C]/35 text-center text-[9px]">
                                Free worldwide shipping on orders above €300
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
