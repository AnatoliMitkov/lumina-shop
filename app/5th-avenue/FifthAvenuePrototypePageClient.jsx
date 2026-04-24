'use client';

export default function FifthAvenuePrototypePageClient() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#1C1C1C] text-[#EFECE8] px-6 text-center">
            <div className="flex flex-col gap-4 max-w-sm">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#EFECE8]/40">5th Avenue</p>
                <h1 className="font-serif text-4xl font-light uppercase tracking-[0.12em]">Coming Soon</h1>
                <p className="text-sm leading-relaxed text-[#EFECE8]/55">
                    The 5th Avenue experience is being rebuilt as part of the v2 storefront.
                </p>
                <a href="/" className="text-xs uppercase tracking-[0.22em] text-[#EFECE8]/50 hover:text-[#EFECE8] transition-colors mt-4">
                    ← Back to Store
                </a>
            </div>
        </div>
    );
}

