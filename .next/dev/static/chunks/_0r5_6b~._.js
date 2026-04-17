(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/utils/cart.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CART_CURRENCY",
    ()=>CART_CURRENCY,
    "CART_LOCAL_STORAGE_KEY",
    ()=>CART_LOCAL_STORAGE_KEY,
    "CART_SESSION_COOKIE",
    ()=>CART_SESSION_COOKIE,
    "CART_SESSION_COOKIE_MAX_AGE",
    ()=>CART_SESSION_COOKIE_MAX_AGE,
    "CART_SESSION_COOKIE_OPTIONS",
    ()=>CART_SESSION_COOKIE_OPTIONS,
    "buildCartSnapshot",
    ()=>buildCartSnapshot,
    "createCartSessionId",
    ()=>createCartSessionId,
    "normalizeCartItem",
    ()=>normalizeCartItem,
    "readBrowserCartItems",
    ()=>readBrowserCartItems,
    "sanitizeCartItems",
    ()=>sanitizeCartItems,
    "writeBrowserCartItems",
    ()=>writeBrowserCartItems
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const CART_CURRENCY = 'EUR';
const CART_SESSION_COOKIE = 'va_cart_session';
const CART_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const CART_LOCAL_STORAGE_KEY = 'va_cart_items';
const CART_SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: ("TURBOPACK compile-time value", "development") === 'production',
    path: '/',
    maxAge: CART_SESSION_COOKIE_MAX_AGE
};
function toText(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}
function toPrice(value) {
    const parsedPrice = Number.parseFloat(String(value ?? 0));
    if (!Number.isFinite(parsedPrice)) {
        return 0;
    }
    return Number(parsedPrice.toFixed(2));
}
function createCartSessionId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function normalizeCartItem(product = {}) {
    return {
        id: product?.id ? String(product.id) : createCartSessionId(),
        name: toText(product?.name, 'Untitled Piece'),
        price: toPrice(product?.price),
        image_main: toText(product?.image_main),
        category: toText(product?.category),
        description: toText(product?.description)
    };
}
function sanitizeCartItems(items = []) {
    if (!Array.isArray(items)) {
        return [];
    }
    return items.filter(Boolean).map((item)=>normalizeCartItem(item));
}
function readBrowserCartItems() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const storedValue = window.localStorage.getItem(CART_LOCAL_STORAGE_KEY);
        if (!storedValue) {
            return [];
        }
        return sanitizeCartItems(JSON.parse(storedValue));
    } catch  {
        return [];
    }
}
function writeBrowserCartItems(items = []) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const snapshot = buildCartSnapshot(items);
        window.localStorage.setItem(CART_LOCAL_STORAGE_KEY, JSON.stringify(snapshot.items));
    } catch  {
    // Ignore storage write failures and keep the cart working in memory.
    }
}
function buildCartSnapshot(items = []) {
    const sanitizedItems = sanitizeCartItems(items);
    const total = Number(sanitizedItems.reduce((runningTotal, item)=>runningTotal + item.price, 0).toFixed(2));
    return {
        items: sanitizedItems,
        itemCount: sanitizedItems.length,
        total,
        currency: CART_CURRENCY
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/CartProvider.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CartProvider",
    ()=>CartProvider,
    "useCart",
    ()=>useCart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/cart.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
const CartContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function CartProvider({ children }) {
    _s();
    const [cartItems, setCartItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isCartOpen, setIsCartOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [cartStatus, setCartStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('idle');
    const [checkoutStatus, setCheckoutStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('idle');
    const [cartMessage, setCartMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [cartPersistenceMode, setCartPersistenceMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('browser');
    const [hasLoadedCart, setHasLoadedCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const skipNextSyncRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const didMutateBeforeLoadRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CartProvider.useEffect": ()=>{
            let isActive = true;
            async function loadCart() {
                setCartStatus('loading');
                const browserItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["readBrowserCartItems"])();
                if (browserItems.length) {
                    setCartItems(browserItems);
                }
                try {
                    const response = await fetch('/api/cart', {
                        cache: 'no-store'
                    });
                    const data = await response.json().catch({
                        "CartProvider.useEffect.loadCart": ()=>({})
                    }["CartProvider.useEffect.loadCart"]);
                    if (!isActive) {
                        return;
                    }
                    if (!response.ok) {
                        throw new Error(data.error || data.warning || 'Unable to restore the cart session.');
                    }
                    const persistenceMode = data?.persistence === 'supabase' ? 'supabase' : 'browser';
                    const incomingItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildCartSnapshot"])(data?.cart?.items).items;
                    setCartPersistenceMode(persistenceMode);
                    skipNextSyncRef.current = persistenceMode === 'supabase' && !didMutateBeforeLoadRef.current;
                    setCartItems({
                        "CartProvider.useEffect.loadCart": (currentItems)=>{
                            if (persistenceMode !== 'supabase') {
                                return currentItems.length ? currentItems : incomingItems;
                            }
                            if (didMutateBeforeLoadRef.current) {
                                return currentItems;
                            }
                            return incomingItems;
                        }
                    }["CartProvider.useEffect.loadCart"]);
                    if (data.warning) {
                        setCartStatus('error');
                        setCartMessage(data.warning);
                    } else {
                        setCartStatus('ready');
                        setCartMessage('');
                    }
                } catch (error) {
                    if (!isActive) {
                        return;
                    }
                    setCartPersistenceMode('browser');
                    if (browserItems.length) {
                        setCartStatus('ready');
                        setCartMessage('');
                    } else {
                        setCartStatus('error');
                        setCartMessage(error.message || 'Unable to restore the cart session.');
                    }
                } finally{
                    if (isActive) {
                        setHasLoadedCart(true);
                    }
                }
            }
            loadCart();
            return ({
                "CartProvider.useEffect": ()=>{
                    isActive = false;
                }
            })["CartProvider.useEffect"];
        }
    }["CartProvider.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CartProvider.useEffect": ()=>{
            if (!hasLoadedCart) {
                return;
            }
            const snapshot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildCartSnapshot"])(cartItems);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["writeBrowserCartItems"])(snapshot.items);
            if (cartPersistenceMode !== 'supabase') {
                setCartStatus('ready');
                return;
            }
            if (skipNextSyncRef.current) {
                skipNextSyncRef.current = false;
                return;
            }
            let isActive = true;
            const timer = window.setTimeout({
                "CartProvider.useEffect.timer": async ()=>{
                    setCartStatus('saving');
                    try {
                        const response = await fetch('/api/cart', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                items: snapshot.items
                            })
                        });
                        const data = await response.json().catch({
                            "CartProvider.useEffect.timer": ()=>({})
                        }["CartProvider.useEffect.timer"]);
                        if (!isActive) {
                            return;
                        }
                        if (!response.ok) {
                            throw new Error(data.error || data.warning || 'Unable to sync the cart.');
                        }
                        setCartStatus('ready');
                        setCartMessage(data.warning || '');
                    } catch (error) {
                        if (!isActive) {
                            return;
                        }
                        setCartStatus('error');
                        setCartMessage(error.message || 'Unable to sync the cart.');
                    }
                }
            }["CartProvider.useEffect.timer"], 250);
            return ({
                "CartProvider.useEffect": ()=>{
                    isActive = false;
                    window.clearTimeout(timer);
                }
            })["CartProvider.useEffect"];
        }
    }["CartProvider.useEffect"], [
        cartItems,
        cartPersistenceMode,
        hasLoadedCart
    ]);
    const markLocalMutation = ()=>{
        if (!hasLoadedCart) {
            didMutateBeforeLoadRef.current = true;
        }
        setCheckoutStatus('idle');
        setCartMessage('');
    };
    const addToCart = (product)=>{
        markLocalMutation();
        setCartItems((prev)=>[
                ...prev,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeCartItem"])(product)
            ]);
        setIsCartOpen(true); // Open sidebar instantly when adding an item
    };
    const removeFromCart = (indexToRemove)=>{
        markLocalMutation();
        setCartItems((prev)=>prev.filter((_, i)=>i !== indexToRemove));
    };
    const checkoutCart = async ()=>{
        const snapshot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildCartSnapshot"])(cartItems);
        if (snapshot.itemCount === 0 || checkoutStatus === 'submitting' || cartPersistenceMode !== 'supabase') {
            return null;
        }
        setCheckoutStatus('submitting');
        setCartMessage('');
        try {
            const response = await fetch('/api/cart/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: snapshot.items
                })
            });
            const data = await response.json().catch(()=>({}));
            if (!response.ok) {
                throw new Error(data.error || 'Unable to archive the selection right now.');
            }
            skipNextSyncRef.current = true;
            setCartItems([]);
            setCartStatus('ready');
            setCheckoutStatus('success');
            setCartMessage(data.message || 'Selection archived in your client account.');
            return data.order || null;
        } catch (error) {
            setCartStatus('error');
            setCheckoutStatus('error');
            setCartMessage(error.message || 'Unable to archive the selection right now.');
            return null;
        }
    };
    const cartTotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildCartSnapshot"])(cartItems).total;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CartContext.Provider, {
        value: {
            cartItems,
            addToCart,
            removeFromCart,
            cartTotal,
            isCartOpen,
            setIsCartOpen,
            cartStatus,
            checkoutStatus,
            cartMessage,
            cartPersistenceMode,
            hasLoadedCart,
            checkoutCart
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/components/CartProvider.jsx",
        lineNumber: 214,
        columnNumber: 9
    }, this);
}
_s(CartProvider, "rlE0Z9B1LKPnCmthfKhwOsyMj2k=");
_c = CartProvider;
function useCart() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider.');
    }
    return context;
}
_s1(useCart, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "CartProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ClientEngine.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ClientEngine
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/gsap/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/gsap/ScrollTrigger.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$gsap$2f$react$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@gsap/react/src/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$CartProvider$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/CartProvider.jsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].registerPlugin(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"]);
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].config({
    nullTargetWarn: false
});
const baseCursorClassName = 'hidden md:flex fixed top-0 left-0 relative rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 justify-center items-center text-white text-[10px] uppercase font-medium text-opacity-0 select-none';
function ClientEngine({ children }) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { cartItems, removeFromCart, cartTotal, isCartOpen, setIsCartOpen, cartPersistenceMode } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$CartProvider$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCart"])();
    const drawerNote = cartPersistenceMode === 'supabase' ? 'Account sync is active, and the full selection can be archived from the cart page.' : 'This selection is being held in this browser while the full atelier archive comes online.';
    const drawerPrimaryHref = cartItems.length === 0 ? '/collections' : '/cart';
    const drawerPrimaryLabel = cartItems.length === 0 ? 'Explore Pieces' : 'View Cart';
    // Dynamically set cinematic loader text based on the route
    let loaderTitle = "The VA Store";
    let loaderSub = "Editorial Macramé • Victoria";
    if (pathname === '/collections') {
        loaderTitle = "Collections";
        loaderSub = null;
    } else if (pathname === '/bespoke') {
        loaderTitle = "Spotlight";
        loaderSub = "Editorial Redirect";
    } else if (pathname === '/spotlight') {
        loaderTitle = "Spotlight";
        loaderSub = "Editorial Feature";
    } else if (pathname === '/account') {
        loaderTitle = "Account";
        loaderSub = "Private Client Access";
    } else if (pathname === '/contact') {
        loaderTitle = "Contact";
        loaderSub = "Atelier Correspondence";
    } else if (pathname === '/cart') {
        loaderTitle = "Cart";
        loaderSub = "Selection Review";
    } else if (pathname === '/admin') {
        loaderTitle = "Admin";
        loaderSub = "Catalog Control";
    }
    const cursorRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const cursorLabelRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const preloaderRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const hoverTargetRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const hasPlayedInitialLoadRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$gsap$2f$react$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useGSAP"])({
        "ClientEngine.useGSAP": ()=>{
            // --- 1. Advanced Custom Cursor ---
            const cursor = cursorRef.current;
            const setCursorX = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].quickTo(cursor, 'x', {
                duration: 0.2,
                ease: 'power2.out'
            });
            const setCursorY = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].quickTo(cursor, 'y', {
                duration: 0.2,
                ease: 'power2.out'
            });
            const animateCursor = {
                "ClientEngine.useGSAP.animateCursor": (config)=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(cursor, {
                        duration: 0.24,
                        ease: 'power2.out',
                        overwrite: 'auto',
                        ...config
                    });
                }
            }["ClientEngine.useGSAP.animateCursor"];
            const setCursorLabel = {
                "ClientEngine.useGSAP.setCursorLabel": (label = '')=>{
                    if (cursorLabelRef.current) {
                        cursorLabelRef.current.textContent = label;
                    }
                }
            }["ClientEngine.useGSAP.setCursorLabel"];
            const getViewModeWidth = {
                "ClientEngine.useGSAP.getViewModeWidth": (label)=>{
                    const trimmedLabel = String(label || '').trim();
                    return Math.max(60, Math.min(136, Math.round(trimmedLabel.length * 6.6 + 28)));
                }
            }["ClientEngine.useGSAP.getViewModeWidth"];
            const resetCursor = {
                "ClientEngine.useGSAP.resetCursor": ()=>{
                    cursor.className = baseCursorClassName;
                    setCursorLabel('');
                    hoverTargetRef.current = null;
                    animateCursor({
                        width: 14,
                        height: 14,
                        '--tw-text-opacity': 0
                    });
                }
            }["ClientEngine.useGSAP.resetCursor"];
            const onMouseMove = {
                "ClientEngine.useGSAP.onMouseMove": (e)=>{
                    const activeTarget = hoverTargetRef.current;
                    let targetX = e.clientX;
                    let targetY = e.clientY;
                    if (activeTarget && document.body.contains(activeTarget)) {
                        const bounds = activeTarget.getBoundingClientRect();
                        const centerX = bounds.left + bounds.width / 2;
                        const centerY = bounds.top + bounds.height / 2;
                        const attraction = activeTarget.classList.contains('view-img') ? 0.04 : 0.12;
                        targetX += (centerX - e.clientX) * attraction;
                        targetY += (centerY - e.clientY) * attraction;
                    }
                    setCursorX(targetX);
                    setCursorY(targetY);
                }
            }["ClientEngine.useGSAP.onMouseMove"];
            window.addEventListener('mousemove', onMouseMove);
            // Event delegation for hover states
            const onMouseOver = {
                "ClientEngine.useGSAP.onMouseOver": (e)=>{
                    const target = e.target.closest('.hover-target');
                    if (target) {
                        hoverTargetRef.current = target;
                        if (target.classList.contains('view-img')) {
                            const cursorText = target.getAttribute('data-cursor-text') || 'View';
                            cursor.classList.remove('hovered');
                            cursor.classList.add('view-mode');
                            setCursorLabel(cursorText);
                            animateCursor({
                                width: getViewModeWidth(cursorText),
                                height: 42,
                                '--tw-text-opacity': 1
                            });
                        } else {
                            cursor.classList.remove('view-mode');
                            setCursorLabel('');
                            cursor.classList.add('hovered');
                            animateCursor({
                                width: 34,
                                height: 34,
                                '--tw-text-opacity': 0
                            });
                        }
                    }
                }
            }["ClientEngine.useGSAP.onMouseOver"];
            const onMouseOut = {
                "ClientEngine.useGSAP.onMouseOut": (e)=>{
                    const target = e.target.closest('.hover-target');
                    const relatedTarget = e.relatedTarget;
                    if (target && (!relatedTarget || !target.contains(relatedTarget))) {
                        resetCursor();
                    }
                }
            }["ClientEngine.useGSAP.onMouseOut"];
            document.addEventListener('mouseover', onMouseOver);
            document.addEventListener('mouseout', onMouseOut);
            return ({
                "ClientEngine.useGSAP": ()=>{
                    window.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseover', onMouseOver);
                    document.removeEventListener('mouseout', onMouseOut);
                    resetCursor();
                }
            })["ClientEngine.useGSAP"];
        }
    }["ClientEngine.useGSAP"]);
    // --- 3. Page Load & Scroll Animations (Triggers on Route Change) ---
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$gsap$2f$react$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useGSAP"])({
        "ClientEngine.useGSAP": ()=>{
            const isInitialLoad = !hasPlayedInitialLoadRef.current;
            const transitionTimings = isInitialLoad ? {
                loaderInDuration: 0.9,
                loaderInStagger: 0.12,
                loaderInDelay: 0.08,
                loaderOutDuration: 0.62,
                loaderOutStagger: 0.06,
                loaderOutDelay: 0.28,
                preloaderLiftDuration: 0.82,
                heroDuration: 1.5,
                heroTitleDuration: 1.05,
                heroTitleStagger: 0.08,
                heroSubDuration: 0.9,
                navDuration: 0.9
            } : {
                loaderInDuration: 0.56,
                loaderInStagger: 0.07,
                loaderInDelay: 0.03,
                loaderOutDuration: 0.44,
                loaderOutStagger: 0.04,
                loaderOutDelay: 0.14,
                preloaderLiftDuration: 0.76,
                heroDuration: 1.1,
                heroTitleDuration: 0.88,
                heroTitleStagger: 0.06,
                heroSubDuration: 0.7,
                navDuration: 0.68
            };
            // Initial Reveal Wipe
            const tl = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].timeline();
            tl.to('.loader-text', {
                y: '0%',
                opacity: 1,
                duration: transitionTimings.loaderInDuration,
                stagger: transitionTimings.loaderInStagger,
                ease: "power4.out",
                delay: transitionTimings.loaderInDelay
            }).to('.loader-text', {
                y: '-100%',
                opacity: 0,
                duration: transitionTimings.loaderOutDuration,
                stagger: transitionTimings.loaderOutStagger,
                ease: "power4.in",
                delay: transitionTimings.loaderOutDelay
            }).to(preloaderRef.current, {
                yPercent: -100,
                duration: transitionTimings.preloaderLiftDuration,
                ease: "power4.inOut"
            }).to('.hero-img', {
                opacity: 1,
                scale: 1,
                duration: transitionTimings.heroDuration,
                ease: "power3.out"
            }, "-=0.45").to('.hero-title', {
                y: '0%',
                duration: transitionTimings.heroTitleDuration,
                stagger: transitionTimings.heroTitleStagger,
                ease: "power4.out"
            }, "-=0.72").to('.hero-sub', {
                opacity: 1,
                duration: transitionTimings.heroSubDuration,
                stagger: 0.1,
                ease: "power3.out"
            }, "-=0.52").to('#nav', {
                opacity: 1,
                duration: transitionTimings.navDuration
            }, "-=0.5");
            hasPlayedInitialLoadRef.current = true;
            // Refresh ScrollTriggers for new page content
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$ScrollTrigger$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollTrigger"].refresh();
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].utils.toArray('.view-img img').forEach({
                "ClientEngine.useGSAP": (img)=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(img, {
                        yPercent: 20,
                        ease: "none",
                        scrollTrigger: {
                            trigger: img.parentElement,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true
                        }
                    });
                }
            }["ClientEngine.useGSAP"]);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].utils.toArray('.reveal-text').forEach({
                "ClientEngine.useGSAP": (text)=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(text, {
                        y: 0,
                        opacity: 1,
                        duration: 1.2,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: text,
                            start: "top 90%"
                        }
                    });
                }
            }["ClientEngine.useGSAP"]);
            // --- 6. Interactive Accordions ---
            document.querySelectorAll('.accordion-item').forEach({
                "ClientEngine.useGSAP": (item)=>{
                    const header = item.querySelector('.accordion-header');
                    const content = item.querySelector('.accordion-content');
                    const icon = item.querySelector('.accordion-icon');
                    let isOpen = false;
                    // Replace node to clean up any duplicate event listeners from previous renders
                    const newHeader = header.cloneNode(true);
                    header.parentNode.replaceChild(newHeader, header);
                    newHeader.addEventListener('click', {
                        "ClientEngine.useGSAP": ()=>{
                            isOpen = !isOpen;
                            if (isOpen) {
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(content, {
                                    height: 'auto',
                                    opacity: 1,
                                    duration: 0.4,
                                    ease: "power3.out"
                                });
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(icon, {
                                    rotate: 45,
                                    duration: 0.3,
                                    ease: "power2.out"
                                });
                            } else {
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(content, {
                                    height: 0,
                                    opacity: 0,
                                    duration: 0.4,
                                    ease: "power3.out"
                                });
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(icon, {
                                    rotate: 0,
                                    duration: 0.3,
                                    ease: "power2.out"
                                });
                            }
                        }
                    }["ClientEngine.useGSAP"]);
                }
            }["ClientEngine.useGSAP"]);
        }
    }["ClientEngine.useGSAP"], {
        dependencies: [
            pathname
        ]
    });
    // --- 4. Page Transition Interceptor ---
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ClientEngine.useEffect": ()=>{
            const handleLinkClick = {
                "ClientEngine.useEffect.handleLinkClick": (e)=>{
                    const link = e.target.closest('.transition-link');
                    if (link) {
                        e.preventDefault();
                        const url = link.getAttribute('href');
                        if (pathname === url) return;
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].set('.loader-text', {
                            opacity: 0
                        });
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to(preloaderRef.current, {
                            yPercent: 0,
                            duration: 0.78,
                            ease: "power4.inOut",
                            onComplete: {
                                "ClientEngine.useEffect.handleLinkClick": ()=>router.push(url)
                            }["ClientEngine.useEffect.handleLinkClick"]
                        });
                    }
                }
            }["ClientEngine.useEffect.handleLinkClick"];
            document.addEventListener('click', handleLinkClick);
            return ({
                "ClientEngine.useEffect": ()=>document.removeEventListener('click', handleLinkClick)
            })["ClientEngine.useEffect"];
        }
    }["ClientEngine.useEffect"], [
        pathname,
        router
    ]);
    // --- 5. Cart Toggle Animation ---
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ClientEngine.useEffect": ()=>{
            if (isCartOpen) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to('#cart-container', {
                    autoAlpha: 1,
                    duration: 0.01
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to('.cart-overlay', {
                    opacity: 1,
                    duration: 0.4,
                    ease: "power2.out"
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to('.cart-panel', {
                    x: '0%',
                    duration: 0.6,
                    ease: "power3.inOut"
                });
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to('.cart-panel', {
                    x: '100%',
                    duration: 0.5,
                    ease: "power3.in"
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to('.cart-overlay', {
                    opacity: 0,
                    duration: 0.4,
                    ease: "power2.in"
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].to('#cart-container', {
                    autoAlpha: 0,
                    duration: 0.01,
                    delay: 0.5
                });
            }
        }
    }["ClientEngine.useEffect"], [
        isCartOpen
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: cursorRef,
                id: "cursor",
                "aria-hidden": "true",
                className: baseCursorClassName,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "cursor-shell"
                    }, void 0, false, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 297,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "cursor-core"
                    }, void 0, false, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 298,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        ref: cursorLabelRef,
                        className: "cursor-label"
                    }, void 0, false, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 299,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ClientEngine.jsx",
                lineNumber: 296,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: preloaderRef,
                id: "preloader",
                className: "fixed inset-0 z-[100] bg-[#1C1C1C] text-[#EFECE8] flex flex-col justify-center items-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "loader-text font-serif text-5xl md:text-7xl font-light tracking-widest uppercase translate-y-full",
                            children: loaderTitle
                        }, void 0, false, {
                            fileName: "[project]/components/ClientEngine.jsx",
                            lineNumber: 303,
                            columnNumber: 50
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 303,
                        columnNumber: 17
                    }, this),
                    loaderSub && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-hidden mt-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "loader-text font-sans text-xs md:text-sm tracking-[0.3em] uppercase opacity-0",
                            children: loaderSub
                        }, void 0, false, {
                            fileName: "[project]/components/ClientEngine.jsx",
                            lineNumber: 304,
                            columnNumber: 69
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 304,
                        columnNumber: 31
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ClientEngine.jsx",
                lineNumber: 302,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                id: "nav",
                className: "fixed w-full flex justify-between items-center px-6 md:px-12 py-8 z-50 opacity-0 mix-blend-difference text-white",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: "/",
                        className: "hover-target transition-link font-serif text-2xl md:text-3xl font-medium tracking-widest uppercase",
                        children: "The VA Store"
                    }, void 0, false, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 308,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hidden md:flex gap-10 text-sm md:text-base uppercase tracking-[0.2em] font-medium",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/collections",
                                className: "hover-target transition-link",
                                children: "Collections"
                            }, void 0, false, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 310,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/spotlight",
                                className: "hover-target transition-link",
                                children: "Spotlight"
                            }, void 0, false, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 311,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/account",
                                className: "hover-target transition-link",
                                children: "Account"
                            }, void 0, false, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 312,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/contact",
                                className: "hover-target transition-link",
                                children: "Contact"
                            }, void 0, false, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 313,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/cart",
                                className: "hover-target transition-link",
                                children: [
                                    "Cart (",
                                    cartItems.length,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 314,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 309,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ClientEngine.jsx",
                lineNumber: 307,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: "smooth-wrapper",
                className: "w-full min-h-screen relative z-10 bg-[#EFECE8] mb-[70vh] md:mb-[60vh] shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    id: "smooth-content",
                    children: children
                }, void 0, false, {
                    fileName: "[project]/components/ClientEngine.jsx",
                    lineNumber: 320,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/ClientEngine.jsx",
                lineNumber: 319,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                className: "fixed bottom-0 left-0 w-full h-[70vh] md:h-[60vh] z-0 bg-[#1C1C1C] text-[#EFECE8] flex flex-col justify-between pt-24 px-6 md:px-12 pb-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col md:flex-row justify-between items-start gap-16 md:gap-0 max-w-[1800px] mx-auto w-full",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col gap-4 max-w-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-serif text-4xl md:text-5xl font-light uppercase tracking-widest",
                                        children: "The VA Store"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 327,
                                        columnNumber: 67
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs md:text-sm tracking-[0.24em] font-light uppercase text-white/70",
                                        children: "Beautiful People Smile More"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 327,
                                        columnNumber: 169
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs md:text-sm tracking-[0.2em] font-light uppercase text-white/50",
                                        children: "Elevating traditional craftsmanship into avant-garde fashion."
                                    }, void 0, false, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 327,
                                        columnNumber: 287
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 327,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-16 md:gap-32 text-xs uppercase tracking-[0.15em] font-medium",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col gap-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-white/30 mb-2",
                                                children: "Explore"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 329,
                                                columnNumber: 62
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "/",
                                                className: "hover-target transition-link hover:text-white/70 transition-colors",
                                                children: "Home"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 329,
                                                columnNumber: 113
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "/collections",
                                                className: "hover-target transition-link hover:text-white/70 transition-colors",
                                                children: "Collections"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 329,
                                                columnNumber: 212
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "/spotlight",
                                                className: "hover-target transition-link hover:text-white/70 transition-colors",
                                                children: "Spotlight"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 329,
                                                columnNumber: 329
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 329,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col gap-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-white/30 mb-2",
                                                children: "Client"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 330,
                                                columnNumber: 62
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "/account",
                                                className: "hover-target transition-link hover:text-white/70 transition-colors",
                                                children: "Account"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 330,
                                                columnNumber: 112
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "/cart",
                                                className: "hover-target transition-link hover:text-white/70 transition-colors",
                                                children: "Cart"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 330,
                                                columnNumber: 221
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "/contact",
                                                className: "hover-target transition-link hover:text-white/70 transition-colors",
                                                children: "Contact Form"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 330,
                                                columnNumber: 324
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "mailto:sales@stylingbyva.com",
                                                className: "hover-target hover:text-white/70 transition-colors normal-case tracking-normal text-sm",
                                                children: "sales@stylingbyva.com"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 330,
                                                columnNumber: 438
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 330,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col gap-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-white/30 mb-2",
                                                children: "Atelier"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 331,
                                                columnNumber: 62
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white/70 normal-case tracking-normal text-sm",
                                                children: "Ruse, Bulgaria"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 331,
                                                columnNumber: 113
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white/40 normal-case tracking-normal text-sm",
                                                children: "Styling by VA Atelier"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 331,
                                                columnNumber: 196
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white/40 normal-case tracking-normal text-sm",
                                                children: "Editorial spotlight and personal support for signature pieces"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 331,
                                                columnNumber: 286
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 331,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 328,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 326,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col md:flex-row justify-between items-center border-t border-white/10 pt-8 text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/40 max-w-[1800px] mx-auto w-full",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: "© 2026 The VA Store."
                            }, void 0, false, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 334,
                                columnNumber: 213
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-4 md:mt-0 hover-target",
                                children: "Crafted by Victoria"
                            }, void 0, false, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 334,
                                columnNumber: 245
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 334,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ClientEngine.jsx",
                lineNumber: 325,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: "cart-container",
                className: "fixed inset-0 z-[200] invisible flex justify-end",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>setIsCartOpen(false),
                        className: "cart-overlay absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-md opacity-0 cursor-pointer"
                    }, void 0, false, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 338,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "cart-panel relative w-full md:w-[30vw] h-full bg-[#EFECE8] translate-x-full flex flex-col shadow-2xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between items-center p-8 md:p-12 border-b border-[#1C1C1C]/10",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "font-serif text-3xl md:text-4xl font-light uppercase tracking-widest",
                                        children: "Cart"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 340,
                                        columnNumber: 109
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setIsCartOpen(false),
                                        className: "hover-target text-xs uppercase tracking-widest font-medium",
                                        children: "Close"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 340,
                                        columnNumber: 203
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 340,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 p-8 md:p-12 flex flex-col gap-8 overflow-y-auto",
                                children: cartItems.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm uppercase tracking-widest text-gray-500",
                                    children: "Your cart is empty."
                                }, void 0, false, {
                                    fileName: "[project]/components/ClientEngine.jsx",
                                    lineNumber: 343,
                                    columnNumber: 25
                                }, this) : cartItems.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-6 items-center group",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                src: item.image_main,
                                                className: "w-20 h-28 object-cover rounded-sm",
                                                alt: item.name
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 347,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-col flex-1 gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-between items-start",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                                className: "font-sans text-xs uppercase tracking-widest font-medium",
                                                                children: item.name
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ClientEngine.jsx",
                                                                lineNumber: 350,
                                                                columnNumber: 41
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>removeFromCart(i),
                                                                className: "text-[10px] uppercase tracking-widest text-gray-400 hover:text-[#1C1C1C] transition-colors",
                                                                children: "Remove"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ClientEngine.jsx",
                                                                lineNumber: 351,
                                                                columnNumber: 41
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/ClientEngine.jsx",
                                                        lineNumber: 349,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "font-sans text-sm font-medium",
                                                        children: [
                                                            "€",
                                                            Number(item.price).toFixed(2)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/ClientEngine.jsx",
                                                        lineNumber: 353,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 348,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 346,
                                        columnNumber: 29
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 341,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-8 md:p-12 border-t border-[#1C1C1C]/10 bg-[#EFECE8]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between items-center mb-8 font-medium uppercase tracking-widest text-xs",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Total"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 360,
                                                columnNumber: 123
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm",
                                                children: [
                                                    "€",
                                                    cartTotal.toFixed(2)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 360,
                                                columnNumber: 141
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 360,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mb-6 text-[10px] uppercase tracking-[0.18em] text-[#1C1C1C]/50",
                                        children: drawerNote
                                    }, void 0, false, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 361,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: drawerPrimaryHref,
                                                onClick: ()=>setIsCartOpen(false),
                                                className: "hover-target transition-link w-full py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium text-center transition-colors hover:bg-black",
                                                children: drawerPrimaryLabel
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 363,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setIsCartOpen(false),
                                                className: "hover-target w-full py-5 border border-[#1C1C1C]/12 text-[#1C1C1C] uppercase tracking-[0.2em] text-xs font-medium transition-colors hover:border-[#1C1C1C]/25 hover:bg-white/50",
                                                children: "Continue Shopping"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientEngine.jsx",
                                                lineNumber: 364,
                                                columnNumber: 25
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientEngine.jsx",
                                        lineNumber: 362,
                                        columnNumber: 21
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ClientEngine.jsx",
                                lineNumber: 359,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ClientEngine.jsx",
                        lineNumber: 339,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ClientEngine.jsx",
                lineNumber: 337,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
_s(ClientEngine, "fo4OH+Utb0h9bZ1EEpKVsxuzTgQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$CartProvider$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCart"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$gsap$2f$react$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useGSAP"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$gsap$2f$react$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useGSAP"]
    ];
});
_c = ClientEngine;
var _c;
__turbopack_context__.k.register(_c, "ClientEngine");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0r5_6b~._.js.map