"use client";

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

            <div className="storefront-screen-hero relative w-full flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 bg-[#1C1C1C]">
                    <img
                        src="https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg?auto=compress&cs=tinysrgb&w=2500"
                        alt="Hero Background"
                        className="hero-img w-full h-full object-cover opacity-0 scale-125"
                        onError={(event) => {
                            event.target.style.display = 'none';
                        }}
                    />
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

            <div className="w-full py-24 md:py-32 px-6 md:px-12 max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-12 md:gap-14">
                <div className="w-full md:w-1/2 flex flex-col gap-8">
                    <div>
                        <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em]">The Art of</h2>
                        <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em] ml-0 md:ml-12">Knots</h2>
                    </div>
                    <p className="reveal-text opacity-0 translate-y-8 text-[#1C1C1C]/70 max-w-md leading-relaxed font-light text-sm md:text-base">
                        Every piece is a dialogue between tension and release. We source the finest organic cords, treating each thread as a sculptural element. Our process embraces the slow, meditative rhythm of hand-knotting to create wearable architecture.
                    </p>
                    <div className="reveal-text opacity-0 translate-y-8 mt-4">
                        <a href="/collections" className="transition-link inline-block px-10 py-5 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover-target hover:bg-black transition-colors">
                            Discover Archive
                        </a>
                    </div>
                </div>
                <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target bg-[#1C1C1C]" data-cursor-text="Explore">
                    <img src="https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=2000" alt="Macrame Art" className="w-full h-full object-cover" onError={(event) => {
                        event.target.style.display = 'none';
                    }} />
                </div>
            </div>

            <div className="w-full pb-24 md:pb-32 px-6 md:px-12 max-w-[1800px] mx-auto">
                <div className="mb-16 md:mb-24 flex justify-between items-end border-b border-[#1C1C1C]/20 pb-8">
                    <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif font-light uppercase tracking-[0.1em]">Selected Works</h2>
                    <a href="/collections" className="reveal-text opacity-0 translate-y-8 hover-target transition-link text-xs uppercase tracking-widest font-medium hidden md:block">View All →</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
                    <div className="flex flex-col gap-6 md:mt-24">
                        <a href="/collections" className="transition-link w-full aspect-[3/4] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C]" data-cursor-text="Shop">
                            <img src="https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1500" alt="Aura Vest" className="w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105" onError={(event) => {
                                event.target.style.display = 'none';
                            }} />
                        </a>
                        <div className="reveal-text opacity-0 translate-y-8 flex justify-between items-center text-sm uppercase tracking-widest font-medium">
                            <span>Aura Vest</span>
                            <span>€450</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-6">
                        <a href="/collections" className="transition-link w-full aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target block bg-[#1C1C1C]" data-cursor-text="Shop">
                            <img src="https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1500" alt="Lumina Top" className="w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105" onError={(event) => {
                                event.target.style.display = 'none';
                            }} />
                        </a>
                        <div className="reveal-text opacity-0 translate-y-8 flex justify-between items-center text-sm uppercase tracking-widest font-medium">
                            <span>Lumina Top</span>
                            <span>€380</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="storefront-banner-stage w-full relative overflow-hidden view-img hover-target bg-[#1C1C1C]" data-cursor-text="Spotlight">
                <img src="https://images.pexels.com/photos/3317434/pexels-photo-3317434.jpeg?auto=compress&cs=tinysrgb&w=2000" alt="Editorial Spotlight" className="w-full h-full object-cover" onError={(event) => {
                    event.target.style.display = 'none';
                }} />
                <div className="absolute inset-0 bg-[#1C1C1C]/60 flex flex-col items-center justify-center gap-6">
                    <h2 className="reveal-text opacity-0 translate-y-8 storefront-section-display font-serif text-[#EFECE8] font-light uppercase tracking-[0.1em] text-center">The Brand&apos;s<br/>Lead Frame</h2>
                    <a href="/spotlight" className="reveal-text opacity-0 translate-y-8 transition-link mt-4 px-10 py-5 border border-[#EFECE8] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover-target hover:bg-[#EFECE8] hover:text-[#1C1C1C] transition-colors">
                        Enter Spotlight
                    </a>
                </div>
            </div>
        </>
    );
}
