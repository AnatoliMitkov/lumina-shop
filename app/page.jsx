"use client";

const categoryShowcaseItems = [
    {
        title: 'Atelier Archive',
        label: 'Signature Collection',
        href: '/collections',
        image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1800',
        layout: 'h-[16rem] md:h-[20rem] xl:h-[22rem]',
    },
    {
        title: 'Evening Structures',
        label: 'New Depth',
        href: '/collections',
        image: 'https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=1400',
        layout: 'h-[16rem] md:h-[20rem] xl:h-[22rem]',
    },
    {
        title: 'Private Commission',
        label: 'By Appointment',
        href: '/spotlight',
        image: 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=1800',
        layout: 'h-[16rem] md:h-[20rem] xl:h-[22rem]',
    },
];

const featuredProducts = [
    {
        name: 'Aura Vest',
        price: 'EUR 550',
        href: '/collections',
        primaryImage: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1200',
        secondaryImage: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
    {
        name: 'Lumen Drape',
        price: 'EUR 470',
        href: '/collections',
        primaryImage: 'https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=1200',
        secondaryImage: 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
    {
        name: 'Noir Column Set',
        price: 'EUR 610',
        href: '/collections',
        primaryImage: 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=1200',
        secondaryImage: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
    {
        name: 'Solstice Layer',
        price: 'EUR 445',
        href: '/collections',
        primaryImage: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1200',
        secondaryImage: 'https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
];

export default function Home() {
    return (
        <>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 25s linear infinite;
                }
            `}</style>

            <section className="relative w-full flex flex-col overflow-hidden" style={{ minHeight: '100svh', height: '100svh' }}>
                <div className="relative w-full flex items-center justify-center overflow-hidden" style={{ minHeight: 0, flex: '1 1 auto' }}>
                    <div className="absolute inset-0 z-0 bg-[#1C1C1C]">
                        <video
                            className="hero-img w-full h-full object-cover opacity-0 scale-125"
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                            aria-hidden="true"
                            onError={(event) => {
                                event.currentTarget.style.display = 'none';
                            }}
                        >
                            <source src="https://hvkgcmgqelczdnvhxtrj.supabase.co/storage/v1/object/public/Logos/7679415-uhd_4096_2160_25fps.mp4" type="video/mp4" />
                        </video>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C] via-[#1C1C1C]/40 to-transparent"></div>
                    </div>

                    <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-end gap-8 text-[#EFECE8] px-6 md:px-12">
                        <div className="w-full md:w-auto">
                            <div className="overflow-hidden -mb-[0.5vw]"><h1 className="hero-title storefront-home-display font-serif font-light uppercase translate-y-full">Women</h1></div>
                            <div className="overflow-hidden"><h1 className="hero-title storefront-home-display storefront-home-shift font-serif font-light uppercase translate-y-full">Elegance</h1></div>
                        </div>
                        <div className="w-full md:w-[22rem] pb-4 md:pb-8 flex flex-col gap-4">
                            <p className="hero-sub text-xs md:text-sm tracking-[0.2em] font-light uppercase opacity-0">Elevating traditional craftsmanship into avant-garde fashion. Hand-knotted in Victoria.</p>
                            <div className="hero-sub w-full h-[1px] bg-white/30 opacity-0"></div>
                            <p className="hero-sub text-xs tracking-widest uppercase opacity-0 hover-target cursor-pointer w-max">Scroll to explore ↓</p>
                        </div>
                    </div>
                </div>

                <div className="w-full py-6 overflow-hidden flex whitespace-nowrap bg-[#1C1C1C] text-[#EFECE8] border-b border-white/10 hover-target" data-cursor-text="Scroll">
                    <div className="flex animate-marquee items-center">
                        <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8">Wearable Architecture</span><span className="text-xl px-4 opacity-50">✦</span>
                        <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8">Uncompromising Craft</span><span className="text-xl px-4 opacity-50">✦</span>
                        <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8">Editorial Spotlight</span><span className="text-xl px-4 opacity-50">✦</span>
                        <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8">Victoria Built</span><span className="text-xl px-4 opacity-50">✦</span>
                    </div>
                    <div className="flex animate-marquee items-center" aria-hidden="true">
                        <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8">Wearable Architecture</span><span className="text-xl px-4 opacity-50">✦</span>
                        <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8">Uncompromising Craft</span><span className="text-xl px-4 opacity-50">✦</span>
                        <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8">Editorial Spotlight</span><span className="text-xl px-4 opacity-50">✦</span>
                        <span className="text-3xl md:text-5xl font-serif font-light uppercase tracking-widest px-8">Victoria Built</span><span className="text-xl px-4 opacity-50">✦</span>
                    </div>
                </div>
            </section>

            <section className="w-full bg-[#11110F] text-[#EFECE8] py-16 md:py-20 xl:py-24">
                <div className="max-w-[1800px] mx-auto px-6 md:px-12">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-8 mb-10 md:mb-12">
                        <div className="max-w-2xl">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-white/45">Category Showcase</p>
                            <h2 className="reveal-text opacity-0 translate-y-8 mt-4 storefront-section-display font-serif font-light uppercase tracking-[0.08em]">Collections In Focus</h2>
                        </div>
                        <p className="reveal-text opacity-0 translate-y-8 max-w-xl text-sm md:text-base leading-relaxed text-white/60">A concise edit of the house categories, presented as large image fields with restrained overlays and direct paths into the archive.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                        {categoryShowcaseItems.map((item) => (
                            <a
                                key={item.title}
                                href={item.href}
                                className={`group relative overflow-hidden border border-white/8 bg-[#161614] hover-target transition-link ${item.layout}`}
                            >
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="absolute inset-0 h-full w-full object-contain p-3 md:p-4 transition-transform duration-[1600ms] ease-out group-hover:scale-[1.02]"
                                    onError={(event) => {
                                        event.target.style.display = 'none';
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/24 to-black/12 opacity-88 transition-opacity duration-500 group-hover:opacity-96"></div>
                                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">{item.label}</p>
                                    <div className="mt-3 inline-flex items-end gap-3 border-b border-white/0 pb-1 transition-all duration-500 group-hover:border-white/30">
                                        <h3 className="font-serif text-2xl md:text-4xl font-light uppercase tracking-[0.08em] text-white">{item.title}</h3>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="w-full bg-[#EFECE8] pt-28 md:pt-36 pb-28 md:pb-40">
                <div className="max-w-[1800px] mx-auto px-6 md:px-12">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14 md:mb-20">
                        <div className="max-w-2xl">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-[#1C1C1C]/40">Featured Products</p>
                            <h2 className="reveal-text opacity-0 translate-y-8 mt-4 storefront-section-display font-serif font-light uppercase tracking-[0.08em] text-[#1C1C1C]">Bestsellers Grid</h2>
                        </div>
                        <p className="reveal-text opacity-0 translate-y-8 max-w-xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/58">Four essentials, presented with deliberate spacing, quiet typography, and a smooth hover swap that lets each card reveal a second frame.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-10 md:gap-12 xl:gap-14">
                        {featuredProducts.map((product) => (
                            <a key={product.name} href={product.href} className="group flex flex-col gap-5 hover-target transition-link">
                                <div className="relative aspect-[3/4] overflow-hidden bg-[#D8D1C7]">
                                    <img
                                        src={product.primaryImage}
                                        alt={product.name}
                                        className="absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms] ease-out group-hover:scale-[1.03] group-hover:opacity-0"
                                        onError={(event) => {
                                            event.target.style.display = 'none';
                                        }}
                                    />
                                    <img
                                        src={product.secondaryImage}
                                        alt={`${product.name} alternate view`}
                                        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-[1200ms] ease-out group-hover:scale-[1.03] group-hover:opacity-100"
                                        onError={(event) => {
                                            event.target.style.display = 'none';
                                        }}
                                    />
                                </div>
                                <div className="border-t border-[#1C1C1C]/12 pt-4 flex items-center justify-between gap-4 text-[#1C1C1C]">
                                    <span className="text-sm uppercase tracking-[0.24em] font-medium">{product.name}</span>
                                    <span className="text-sm uppercase tracking-[0.18em] text-[#1C1C1C]/58">{product.price}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="w-full px-6 md:px-12 pb-20 md:pb-24 bg-[#EFECE8]">
                <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-2 bg-[#121211] text-[#EFECE8] overflow-hidden">
                    <div className="flex items-center px-6 md:px-10 xl:px-14 py-12 md:py-14 xl:py-16">
                        <div className="max-w-2xl flex flex-col gap-8">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-white/40">Brand Ethos</p>
                            <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.08em] leading-[0.92]">Elevating traditional craftsmanship into avant-garde fashion.</h2>
                            <p className="reveal-text opacity-0 translate-y-8 max-w-xl text-sm md:text-base leading-relaxed text-white/62">Every silhouette begins as a study in tension, line, and hand-knotting discipline. The atelier treats slow craft as structure, turning traditional techniques into an editorial language that feels directional rather than nostalgic.</p>
                            <a href="/spotlight" className="reveal-text opacity-0 translate-y-8 inline-flex w-max items-center gap-3 border border-white/12 px-8 py-4 text-[10px] uppercase tracking-[0.26em] font-medium text-white transition-colors hover:bg-white hover:text-[#121211]">
                                Enter The Spotlight
                            </a>
                        </div>
                    </div>

                    <div className="relative h-[18rem] md:h-[22rem] lg:h-auto lg:min-h-[24rem] overflow-hidden view-img bg-[#1C1C1C]">
                        <img
                            src="https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=2000"
                            alt="Styling by VA atelier detail"
                            className="absolute inset-0 h-full w-full object-contain p-3 md:p-4"
                            onError={(event) => {
                                event.target.style.display = 'none';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-transparent to-black/45"></div>
                    </div>
                </div>
            </section>

            <section className="w-full bg-[#0D0D0C] text-[#EFECE8] border-t border-white/8">
                <div className="max-w-[1800px] mx-auto px-6 md:px-12 py-20 md:py-24">
                    <div className="border border-white/10 bg-white/[0.03] px-6 md:px-10 xl:px-12 py-10 md:py-12 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-10 xl:gap-12">
                        <div className="max-w-2xl">
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.32em] text-white/38">Newsletter Sign-Up</p>
                            <h2 className="reveal-text opacity-0 translate-y-8 mt-4 font-serif text-3xl md:text-5xl font-light uppercase tracking-[0.08em] leading-[0.94]">Join the atelier dispatch for collection drops, fittings, and editorial releases.</h2>
                        </div>

                        <form onSubmit={(event) => event.preventDefault()} className="w-full xl:max-w-[34rem] flex flex-col sm:flex-row gap-3 md:gap-4">
                            <input
                                type="email"
                                placeholder="Email address"
                                className="h-14 flex-1 border border-white/12 bg-transparent px-5 text-sm tracking-[0.08em] text-white placeholder:text-white/34 outline-none transition-colors focus:border-white/40"
                            />
                            <button type="submit" className="h-14 px-7 border border-white bg-white text-[#121211] text-[10px] uppercase tracking-[0.26em] font-medium transition-colors hover:bg-transparent hover:text-white">
                                Subscribe
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}
