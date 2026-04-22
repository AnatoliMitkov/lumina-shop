import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboard from '../../components/AdminDashboard';
import { isPromotionSetupError } from '../../utils/promotions';
import { isSiteCopySetupError } from '../../utils/site-copy';
import { createClient } from '../../utils/supabase/server';
import { getCollectionMediaKeyPrefix, toCollectionMediaMap } from '../../utils/fifth-avenue-stage-media';
import { sortProducts } from '../../utils/products';

export const dynamic = 'force-dynamic';

const ADMIN_ORDER_SELECT = '*';
const ADMIN_INQUIRY_SELECT = '*';
const ADMIN_DISCOUNT_SELECT = 'id, code, label, description, discount_type, discount_value, shipping_benefit, minimum_subtotal, usage_limit, usage_count, is_active, starts_at, ends_at, created_at, updated_at';
const ADMIN_AFFILIATE_SELECT = 'id, code, partner_name, notes, customer_discount_type, customer_discount_value, commission_type, commission_value, minimum_subtotal, usage_limit, usage_count, is_active, starts_at, ends_at, created_at, updated_at';
const ADMIN_ACTIVITY_LIMIT = 500;

function isCatalogSetupError(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === '42703'
        || error?.code === 'PGRST204'
        || error?.code === 'PGRST205'
        || message.toLowerCase().includes('products')
        || message.toLowerCase().includes('is_admin')
        || message.toLowerCase().includes('schema cache');
}

function SetupCard({ title, copy, sql }) {
    return (
        <div className="pt-32 md:pt-40 pb-28 md:pb-36 px-6 md:px-12 max-w-[1200px] mx-auto">
            <div className="border border-[#1C1C1C]/10 bg-white/50 rounded-sm p-8 md:p-10 flex flex-col gap-8">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4">Admin / Setup Required</p>
                    <h1 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.12em] leading-[0.94] text-[#1C1C1C]">{title}</h1>
                </div>

                <p className="max-w-3xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">{copy}</p>

                <pre className="overflow-x-auto rounded-sm border border-[#1C1C1C]/10 bg-[#1C1C1C] p-5 text-sm leading-relaxed text-[#EFECE8]">
                    <code>{sql}</code>
                </pre>
            </div>
        </div>
    );
}

export default async function AdminPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/account');
    }

    const profileResult = await supabase
        .from('profiles')
        .select('full_name, is_admin')
        .eq('id', user.id)
        .maybeSingle();

    if (profileResult.error && isCatalogSetupError(profileResult.error)) {
        return (
            <SetupCard
                title="Finish the catalog schema first"
                copy="The admin route needs the richer products table and the is_admin profile flag. Apply the Supabase SQL files in order, then refresh this page."
                sql={`-- 1) Run base account tables\n-- supabase/cart-orders.sql\n\n-- 2) Run catalog schema\n-- supabase/catalog-admin.sql\n\n-- 3) Optional starter products\n-- supabase/catalog-seed.sql`}
            />
        );
    }

    if (!profileResult.data?.is_admin) {
        return (
            <SetupCard
                title="Enable your admin account"
                copy="This signed-in account is not marked as an admin yet. Run the statement below in Supabase SQL, then sign out and back in so the new profile flag is picked up cleanly."
                sql={`insert into public.profiles (id, email, is_admin)\nvalues ((select id from auth.users where email = '${user.email}'), '${user.email}', true)\non conflict (id) do update\nset email = excluded.email,\n    is_admin = true;`}
            />
        );
    }

    const [productsResult, ordersResult, inquiriesResult, discountsResult, affiliatesResult, stageMediaResult] = await Promise.all([
        supabase.from('products').select('*').order('featured', { ascending: false }).order('sort_order', { ascending: true }).order('updated_at', { ascending: false }),
        supabase.from('orders').select(ADMIN_ORDER_SELECT).order('created_at', { ascending: false }).limit(ADMIN_ACTIVITY_LIMIT),
        supabase.from('contact_inquiries').select(ADMIN_INQUIRY_SELECT).order('created_at', { ascending: false }).limit(ADMIN_ACTIVITY_LIMIT),
        supabase.from('discount_codes').select(ADMIN_DISCOUNT_SELECT).order('is_active', { ascending: false }).order('updated_at', { ascending: false }),
        supabase.from('affiliate_codes').select(ADMIN_AFFILIATE_SELECT).order('is_active', { ascending: false }).order('updated_at', { ascending: false }),
        supabase.from('site_copy_entries').select('key, value').ilike('key', `${getCollectionMediaKeyPrefix()}%`),
    ]);

    if (productsResult.error && isCatalogSetupError(productsResult.error)) {
        return (
            <SetupCard
                title="Catalog schema still incomplete"
                copy="The products table exists, but the richer admin columns are still missing. Run the catalog admin SQL file and refresh this page."
                sql={`-- Apply the richer catalog schema\n-- supabase/catalog-admin.sql\n\n-- Optional starter content\n-- supabase/catalog-seed.sql`}
            />
        );
    }

    const maintenanceMessage = ordersResult.error || inquiriesResult.error
        ? 'Orders or inquiries could not be loaded. Re-run supabase/cart-orders.sql if those sections stay empty.'
        : '';
    const initialCollectionStageMediaEntries = stageMediaResult.error && isSiteCopySetupError(stageMediaResult.error)
        ? {}
        : toCollectionMediaMap(stageMediaResult.data ?? []);
    const promotionMessage = isPromotionSetupError(discountsResult.error) || isPromotionSetupError(affiliatesResult.error)
        ? 'Discount and affiliate tables are not ready yet. Run supabase/cart-orders.sql again to enable live promotion management.'
        : discountsResult.error || affiliatesResult.error
            ? 'Discount or affiliate codes could not be loaded right now.'
            : '';

    return (
        <div className="pt-32 md:pt-40 pb-28 md:pb-36 px-6 md:px-12 max-w-[1800px] mx-auto">
            <div className="mb-10 md:mb-12 grid grid-cols-1 xl:grid-cols-[1.02fr_0.98fr] gap-6 md:gap-8 items-stretch">
                <section className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4">Studio Admin / The VA Store</p>
                        <div className="overflow-hidden"><h1 className="hero-title font-serif text-5xl md:text-7xl font-light tracking-[-0.04em] uppercase translate-y-full">Admin</h1></div>
                    </div>
                    <p className="hero-sub opacity-0 max-w-3xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/62">This is the maintenance layer for the storefront: update products, push new images, control draft versus live pieces, and keep recent customer activity in view without leaving the app.</p>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    <div className="border border-[#1C1C1C]/10 bg-white/45 rounded-sm p-5 md:p-6 flex flex-col gap-3 justify-between">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">Signed In</p>
                        <p className="font-serif text-3xl md:text-4xl font-light leading-tight text-[#1C1C1C]">{profileResult.data?.full_name || 'Studio Admin'}</p>
                        <p className="text-sm leading-relaxed text-[#1C1C1C]/58">{user.email}</p>
                    </div>
                    <div className="border border-[#1C1C1C]/10 bg-[#1C1C1C] text-[#EFECE8] rounded-sm p-5 md:p-6 flex flex-col gap-3 justify-between">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Maintenance Mode</p>
                        <p className="font-serif text-3xl md:text-4xl font-light leading-tight">Catalog + Support</p>
                        <p className="text-sm leading-relaxed text-white/68">Products, recent orders, and inbound atelier messages live in one place.</p>
                    </div>
                </section>
            </div>

            <AdminDashboard
                user={user}
                profile={profileResult.data ?? null}
                initialProducts={sortProducts(productsResult.data ?? [])}
                recentOrders={ordersResult.data ?? []}
                recentInquiries={inquiriesResult.data ?? []}
                discountCodes={discountsResult.data ?? []}
                affiliateCodes={affiliatesResult.data ?? []}
                maintenanceMessage={maintenanceMessage}
                promotionMessage={promotionMessage}
                initialCollectionStageMediaEntries={initialCollectionStageMediaEntries}
            />
        </div>
    );
}
