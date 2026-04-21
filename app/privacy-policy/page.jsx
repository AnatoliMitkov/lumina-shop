export const metadata = {
    title: 'Privacy Policy',
    description: 'Read how The VA Store collects, uses, and protects personal information for orders, contact requests, and account services.',
    alternates: {
        canonical: '/privacy-policy',
    },
};

const privacySections = [
    {
        title: 'What we collect',
        body: 'We collect the information you submit directly to us when you place an order, create an account, request a password reset, submit a contact form, or communicate with the atelier. This can include your name, email address, phone number, delivery location, order details, custom measurements, and any message you choose to provide.',
    },
    {
        title: 'How we use it',
        body: 'We use your information to run the store, process and deliver orders, provide customer support, respond to inquiries, manage your account, send essential service messages, and protect the website against abuse or fraudulent activity. We also use limited technical information to understand storefront performance and reliability.',
    },
    {
        title: 'Payments and service providers',
        body: 'Payments are processed through Stripe, and account or order data may be stored through Supabase and other infrastructure providers that support this website. Those providers only receive the information needed to perform their services and process it under their own security and privacy obligations.',
    },
    {
        title: 'Cookies, sessions, and technical data',
        body: 'The website uses essential session technologies to keep your cart working, maintain sign-in state, and support core storefront functionality. We may also process device, browser, and interaction data needed for security, diagnostics, analytics, and performance monitoring.',
    },
    {
        title: 'How long we keep data',
        body: 'We keep personal information for as long as it is reasonably necessary to fulfill orders, provide customer support, maintain business records, comply with legal obligations, resolve disputes, and protect the store from misuse. Retention periods can vary depending on the type of record and the reason it was collected.',
    },
    {
        title: 'Your rights',
        body: 'Depending on your location, you may have rights to request access to, correction of, or deletion of your personal information, and to object to or restrict certain processing. You can contact us if you want to make a privacy request or have questions about how your information is handled.',
    },
    {
        title: 'Contact',
        body: 'For privacy questions or requests, contact The VA Store at sales@stylingbyva.com. If the business contact details change, this page should be updated to reflect the latest support address.',
    },
];

export default function PrivacyPolicyPage() {
    return (
        <div className="px-6 pb-24 pt-32 md:px-12 md:pb-28 md:pt-40">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
                <section className="border-b border-[#1C1C1C]/10 pb-10">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#1C1C1C]/45">Legal / Privacy</p>
                    <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] font-light uppercase leading-[0.9] tracking-[0.06em] text-[#1C1C1C]">Privacy Policy</h1>
                    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#1C1C1C]/65 md:text-base">
                        This policy explains how The VA Store and Styling by VA handle personal information collected through this website.
                        It is written to cover storefront browsing, customer contact, checkout, and account-related activity.
                    </p>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/38">Last updated: April 21, 2026</p>
                </section>

                <section className="grid gap-5">
                    {privacySections.map((section) => (
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