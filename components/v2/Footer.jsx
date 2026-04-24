const FOOTER_LINKS = {
    Explore: [
        { href: '/v2', label: 'Home' },
        { href: '/v2/collections', label: 'Collections' },
        { href: '/contact', label: 'Bespoke' },
    ],
    Client: [
        { href: '/account', label: 'Account' },
        { href: '/v2/cart', label: 'Cart' },
        { href: '/contact', label: 'Contact' },
    ],
    Legal: [
        { href: '/privacy-policy', label: 'Privacy Policy' },
        { href: '/cookie-policy', label: 'Cookie Policy' },
    ],
};

const SOCIAL_LINKS = [
    { href: 'https://www.instagram.com/va.storeofficial/', label: 'Instagram' },
    { href: 'https://www.facebook.com/profile.php?id=61584052437151', label: 'Facebook' },
    { href: 'https://www.tiktok.com/@2hotbyva', label: 'TikTok' },
];

export default function Footer() {
    return (
        <footer className="bg-[#1C1C1C] text-[#EFECE8]">
            <div className="v2-container py-16 md:py-20">
                {/* Top row */}
                <div className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr_1fr_1fr] gap-10 md:gap-12 pb-10 md:pb-14 border-b border-[#EFECE8]/10">
                    {/* Brand */}
                    <div className="flex flex-col gap-4 max-w-xs">
                        <a
                            href="/v2"
                            className="font-serif text-3xl md:text-4xl font-light uppercase tracking-widest text-[#EFECE8] hover:text-[#D7B56D] transition-colors leading-none"
                        >
                            The VA Store
                        </a>
                        <p className="v2-label text-[#EFECE8]/40">
                            Beautiful People Smile More
                        </p>
                        <p className="v2-body-sm text-[#EFECE8]/50 leading-relaxed">
                            Elevating traditional craftsmanship into avant-garde fashion. Hand-knotted by Victoria, Ruse, Bulgaria.
                        </p>
                        <div className="flex gap-5 mt-2">
                            {SOCIAL_LINKS.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="v2-label text-[#EFECE8]/45 hover:text-[#EFECE8] transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(FOOTER_LINKS).map(([group, links]) => (
                        <div key={group} className="flex flex-col gap-3">
                            <span className="v2-label text-[#EFECE8]/30 mb-1">{group}</span>
                            {links.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="v2-label text-[#EFECE8]/60 hover:text-[#EFECE8] transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Bottom row */}
                <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[#EFECE8]/35 v2-label">
                    <p>© 2026 The VA Store. All rights reserved.</p>
                    <p className="text-center">
                        <a href="mailto:sales@stylingbyva.com" className="hover:text-[#EFECE8]/65 transition-colors normal-case tracking-normal text-sm font-light">
                            sales@stylingbyva.com
                        </a>
                    </p>
                    <p>Crafted by Victoria</p>
                </div>
            </div>
        </footer>
    );
}
