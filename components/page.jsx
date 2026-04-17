import { createClient } from '../../../utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import AddToCartBtn from '../../../components/AddToCartBtn';

export const revalidate = 0; // Fetch fresh data on every load during development

export default async function ProductPage({ params }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Fetch the exact product from the database using the URL ID
    const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    // If the ID isn't in the database, trigger our new custom 404 page!
    if (!product) {
        notFound();
    }

    return (
        <div className="pt-32 md:pt-48 pb-24 px-6 md:px-12 max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-24 relative">
                <div className="md:col-span-7 flex flex-col gap-8 md:gap-16">
                    <div className="w-full aspect-[3/4] overflow-hidden rounded-sm view-img group hover-target" data-cursor-text="Zoom">
                        <img className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" src={product.image_main} alt={product.name} />
                    </div>
                    {product.image_detail && (
                        <div className="w-full aspect-[4/5] overflow-hidden rounded-sm view-img group hover-target" data-cursor-text="Zoom">
                            <img className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" src={product.image_detail} alt={`${product.name} Detail`} />
                        </div>
                    )}
                </div>

                <div className="md:col-span-5 relative">
                    <div className="sticky top-40 flex flex-col gap-10">
                        <div className="flex flex-col gap-4">
                            <div className="overflow-hidden"><p className="hero-title text-[10px] uppercase tracking-widest text-gray-500 translate-y-full">Collections / {product.category}</p></div>
                            <div className="overflow-hidden pb-2"><h1 className="hero-title font-serif text-5xl md:text-7xl font-light uppercase tracking-widest translate-y-full">{product.name}</h1></div>
                            <p className="hero-sub text-lg md:text-xl font-medium tracking-wide opacity-0">€{product.price}</p>
                        </div>
                        <div className="w-full h-[1px] bg-[#1C1C1C]/10 hero-sub opacity-0"></div>
                        <p className="hero-sub text-sm font-light tracking-wide text-gray-600 leading-relaxed opacity-0">{product.description}</p>
                        
                        <AddToCartBtn product={product} />

                        <div className="hero-sub opacity-0 flex flex-col mt-8 text-xs uppercase tracking-widest">
                            <div className="accordion-item border-t border-[#1C1C1C]/10">
                                <div className="accordion-header py-6 flex justify-between items-center group cursor-pointer hover-target"><span className="font-medium text-[#1C1C1C]">Material & Care</span><span className="accordion-icon text-lg font-light transition-transform duration-300">+</span></div>
                                <div className="accordion-content h-0 overflow-hidden opacity-0"><p className="pb-6 text-sm font-light tracking-wide text-gray-600 leading-relaxed normal-case">Crafted from 100% organic, sustainably sourced cotton cord. Spot clean only with a damp, light-colored cloth. Do not machine wash, bleach, or tumble dry. Store flat to maintain structural integrity.</p></div>
                            </div>
                            <div className="accordion-item border-t border-b border-[#1C1C1C]/10">
                                <div className="accordion-header py-6 flex justify-between items-center group cursor-pointer hover-target"><span className="font-medium text-[#1C1C1C]">Shipping & Returns</span><span className="accordion-icon text-lg font-light transition-transform duration-300">+</span></div>
                                <div className="accordion-content h-0 overflow-hidden opacity-0"><p className="pb-6 text-sm font-light tracking-wide text-gray-600 leading-relaxed normal-case">Complimentary worldwide shipping on all orders over €300. As each piece is hand-knotted to order, please allow 10-14 business days for dispatch. Returns are accepted within 14 days of delivery.</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}