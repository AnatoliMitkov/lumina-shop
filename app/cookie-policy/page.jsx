export const metadata = {
    title: 'Cookie Policy',
    description: 'Read how The VA Store uses cookies, local storage, and similar technologies for cart, account, security, and performance features.',
    alternates: {
        canonical: '/cookie-policy',
    },
};

const cookieSections = [
    {
        title: 'Essential cookies',
        body: 'The store uses essential cookies and similar session technologies to keep core features running. These may be used to preserve your cart session, maintain secure sign-in state, protect forms and checkout flows, and support other functionality that is required for the website to operate properly.',
    },
    {
        title: 'Cart and account sessions',
        body: 'When you use the storefront, we may store a cart session identifier so your selected items can persist between visits. If you sign in, authentication-related cookies may also be used to keep your account session active and secure.',
    },
    {
        title: 'Preferences and local storage',
        body: 'The website may store non-cookie preferences in your browser, such as motion and experience settings, so the site can remember how you prefer it to behave on future visits.',
    },
    {
        title: 'Performance and analytics',
        body: 'We may use privacy-conscious analytics, diagnostics, or performance tooling to understand storefront reliability and visitor interactions. These tools may process technical signals such as browser type, pages visited, approximate device data, and performance events.',
    },
    {
        title: 'Third-party services',
        body: 'If you use features supported by third parties, such as payment or embedded services, those providers may set their own cookies or process data according to their own policies. You should review the relevant third-party notices when using those services.',
    },
    {
        title: 'Managing cookies',
        body: 'Most browsers let you block or delete cookies through their settings. Please note that disabling essential cookies can prevent parts of the store, including account, cart, and checkout features, from working correctly.',
    },
    {
        title: 'Contact',
        body: 'If you have questions about how cookies or similar technologies are used on this website, contact sales@stylingbyva.com.',
    },
];

export default function CookiePolicyPage() {
    return (
        <div className="shell-page-pad">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
                <section className="border-b border-[#1C1C1C]/10 pb-10">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45">Legal / Cookies</p>
                    <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] font-light uppercase leading-[0.9] tracking-[0.06em] text-[#1C1C1C]">Cookie Policy</h1>
                    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#1C1C1C]/65 md:text-base">
                        This page explains how The VA Store uses cookies, local storage, and similar technologies across the storefront,
                        account area, contact tools, and checkout flow.
                    </p>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/38">Last updated: April 21, 2026</p>
                </section>

                <section className="grid gap-5">
                    {cookieSections.map((section) => (
                        <article key={section.title} className="rounded-[1.6rem] border border-[#1C1C1C]/10 bg-white/55 p-6 md:p-8">
                            <h2 className="font-serif text-2xl font-light uppercase tracking-[0.06em] text-[#1C1C1C] md:text-3xl">{section.title}</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#1C1C1C]/66 md:text-base">{section.body}</p>
                        </article>
                    ))}
                </section>
            </div>
        </div>
    );
}