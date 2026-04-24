import { cookies } from 'next/headers';
import { createClient, isSupabaseConfigured } from '../../utils/supabase/server';
import AuthPanel from '../../components/AuthPanel';
import AccountDashboard from '../../components/AccountDashboard';
import EditableText from '../../components/site-copy/EditableText';
import LocalizedText from '../../components/LocalizedText';
import {
    createLocalizedValue as localizedFallback,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    normalizeLanguage,
    resolveLocalizedValue,
} from '../../utils/language';

export const dynamic = 'force-dynamic';

function readAuthMessage(searchParams, language = DEFAULT_LANGUAGE) {
    const notice = searchParams?.notice;
    const error = searchParams?.error;
    const getText = (value) => resolveLocalizedValue(value, language);

    if (notice === 'email-confirmed') {
        return {
            type: 'success',
            message: getText(localizedFallback(
                'Your email is confirmed. You can sign in to your account now.',
                'Имейлът ви е потвърден. Вече можете да влезете в профила си.'
            )),
        };
    }

    if (notice === 'magic-link-confirmed') {
        return {
            type: 'success',
            message: getText(localizedFallback(
                'You are signed in. Your secure email link was accepted.',
                'Влязохте успешно. Защитената връзка по имейл беше приета.'
            )),
        };
    }

    if (notice === 'invite-accepted') {
        return {
            type: 'success',
            message: getText(localizedFallback(
                'Your invitation was accepted. Continue in your account.',
                'Поканата ви е приета. Продължете в профила си.'
            )),
        };
    }

    if (notice === 'email-change-confirmed') {
        return {
            type: 'success',
            message: getText(localizedFallback(
                'Your email change is confirmed.',
                'Промяната на имейла е потвърдена.'
            )),
        };
    }

    if (notice === 'password-reset') {
        return {
            type: 'success',
            message: getText(localizedFallback(
                'Your password was updated successfully.',
                'Паролата ви беше обновена успешно.'
            )),
        };
    }

    if (error === 'auth-link-invalid') {
        return {
            type: 'error',
            message: getText(localizedFallback(
                'This email link is invalid or expired. Request a fresh one and try again.',
                'Този имейл линк е невалиден или е изтекъл. Заявете нов и опитайте пак.'
            )),
        };
    }

    return null;
}

function isProfilesTableMissing(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === 'PGRST205'
        || message.includes("public.profiles")
        || message.toLowerCase().includes('schema cache');
}

function readErrorMessage(error, language = DEFAULT_LANGUAGE) {
    const getText = (value) => resolveLocalizedValue(value, language);

    if (!error) {
        return '';
    }

    if (isProfilesTableMissing(error)) {
        return getText(localizedFallback(
            'Profile details are using your account metadata for now while the dedicated profiles table is still unavailable.',
            'Засега профилните данни идват от метаданните на акаунта, докато отделната профилна таблица още не е налична.'
        ));
    }

    if (error.code === '42P01' || error.code === '42703' || error.code === 'PGRST205') {
        return getText(localizedFallback(
            'Account tables are not in Supabase yet. Re-run supabase/cart-orders.sql to enable saved profiles and order tracking.',
            'Таблиците за профили и поръчки още не са налични в Supabase. Пуснете отново supabase/cart-orders.sql, за да активирате запазени профили и проследяване на поръчки.'
        ));
    }

    return getText(localizedFallback(
        'Some account data is not available yet.',
        'Част от данните за профила още не са налични.'
    ));
}

export default async function AccountPage({ searchParams }) {
    const resolvedSearchParams = await searchParams;
    const cookieStore = await cookies();
    const currentLanguage = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || DEFAULT_LANGUAGE;
    const authMessage = readAuthMessage(resolvedSearchParams, currentLanguage);

    if (!isSupabaseConfigured()) {
        const setupSteps = [
            {
                step: '1',
                title: localizedFallback('Create .env.local', 'Създайте .env.local'),
                copy: localizedFallback('Copy .env.example to .env.local in the project root.', 'Копирайте .env.example като .env.local в основната папка на проекта.'),
            },
            {
                step: '2',
                title: localizedFallback('Add Supabase keys', 'Добавете Supabase ключовете'),
                copy: localizedFallback('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase or Vercel.', 'Попълнете NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY от Supabase или Vercel.'),
            },
            {
                step: '3',
                title: localizedFallback('Restart Next.js', 'Рестартирайте Next.js'),
                copy: localizedFallback('Stop and restart npm run dev so Next reloads the env values.', 'Спрете и пуснете отново npm run dev, за да зареди Next новите env стойности.'),
            },
        ];

        return (
            <div className="shell-page-pad-tight max-w-[1800px] mx-auto">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-10 md:gap-14 items-start">
                    <section className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4"><EditableText contentKey="account.setup.eyebrow" fallback={localizedFallback('Client Access / The VA Store', 'Достъп до профила / The VA Store')} editorLabel="Account setup eyebrow" /></p>
                            <h1 className="font-serif text-4xl md:text-6xl font-light uppercase tracking-[0.12em] leading-none"><EditableText contentKey="account.setup.title" fallback={localizedFallback('Account', 'Профил')} editorLabel="Account setup title" /></h1>
                        </div>

                        <p className="text-sm md:text-base leading-relaxed text-[#1C1C1C]/62 max-w-2xl"><EditableText contentKey="account.setup.copy" fallback={localizedFallback('The local account area needs Supabase public environment variables before it can create the auth client. Production is already fine; your local workspace is missing the values.', 'Локалният профил изисква публичните Supabase environment стойности, преди да може да създаде auth клиента. В продукция всичко е наред; липсват само стойностите във вашата локална среда.')} editorLabel="Account setup copy" /></p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {setupSteps.map(({ step, title, copy }) => (
                                <div key={step} className="border border-[#1C1C1C]/10 bg-white/75 rounded-sm p-4 md:p-5">
                                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/42"><EditableText contentKey={`account.setup.steps.${step}.eyebrow`} fallback={localizedFallback(`Step ${step}`, `Стъпка ${step}`)} editorLabel={`Account setup step ${step} eyebrow`} /></p>
                                    <p className="mt-3 font-serif text-2xl font-light uppercase tracking-[0.1em] text-[#1C1C1C]"><EditableText contentKey={`account.setup.steps.${step}.title`} fallback={title} editorLabel={`Account setup step ${step} title`} /></p>
                                    <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/58"><EditableText contentKey={`account.setup.steps.${step}.copy`} fallback={copy} editorLabel={`Account setup step ${step} copy`} /></p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-sm border border-[#1C1C1C]/10 bg-[#EFECE8] px-4 py-4 md:px-5 md:py-5">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45"><EditableText contentKey="account.setup.quick_option.eyebrow" fallback={localizedFallback('Quick Option', 'Бърз вариант')} editorLabel="Account setup quick option eyebrow" /></p>
                            <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/62"><EditableText contentKey="account.setup.quick_option.copy" fallback={localizedFallback('If the Vercel project already has the right variables, run vercel env pull after linking the project locally. Otherwise copy the same two public values from Supabase Dashboard → Project Settings → API.', 'Ако Vercel проектът вече има правилните стойности, изпълнете vercel env pull след като свържете проекта локално. Иначе копирайте същите две публични стойности от Supabase Dashboard → Project Settings → API.')} editorLabel="Account setup quick option copy" /></p>
                        </div>
                    </section>

                    <section className="xl:pt-6">
                        <AuthPanel />
                    </section>
                </div>
            </div>
        );
    }

    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const authBenefits = [
            {
                id: 'track',
                title: localizedFallback('Track', 'Следи'),
                copy: localizedFallback('See archived orders in one place.', 'Виждайте архивираните поръчки на едно място.'),
            },
            {
                id: 'save',
                title: localizedFallback('Save', 'Пази'),
                copy: localizedFallback('Keep your contact and delivery details ready.', 'Пазете контактните и доставните си детайли готови.'),
            },
            {
                id: 'reach',
                title: localizedFallback('Reach', 'Свържи се'),
                copy: localizedFallback('Submit atelier requests with a personal touch.', 'Изпращайте запитвания към ателието с личен контекст.'),
            },
        ];

        return (
            <div className="shell-page-pad max-w-[1800px] mx-auto">
                {authMessage && (
                    <div className={`mb-8 rounded-sm border px-4 py-4 text-sm leading-relaxed ${authMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-[#EFECE8] text-[#1C1C1C]/70'}`}>
                        {authMessage.message}
                    </div>
                )}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-12 md:gap-20 items-start">
                    <section className="flex flex-col gap-8 md:gap-10">
                        <div>
                            <p className="reveal-text opacity-0 translate-y-8 text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-6"><EditableText contentKey="account.auth.eyebrow" fallback={localizedFallback('Client Access / The VA Store', 'Достъп до профила / The VA Store')} editorLabel="Account auth eyebrow" /></p>
                            <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display font-serif font-light uppercase translate-y-full"><EditableText contentKey="account.auth.title.line_one" fallback={localizedFallback('Your', 'Вашият')} editorLabel="Account auth title line one" /></h1></div>
                            <div className="overflow-hidden"><h1 className="hero-title storefront-hero-display storefront-hero-shift font-serif font-light uppercase translate-y-full"><EditableText contentKey="account.auth.title.line_two" fallback={localizedFallback('Account', 'Профил')} editorLabel="Account auth title line two" /></h1></div>
                        </div>

                        <p className="hero-sub storefront-copy-measure opacity-0 max-w-xl text-sm md:text-base leading-relaxed text-[#1C1C1C]/65 font-light"><EditableText contentKey="account.auth.copy" fallback={localizedFallback('Create an account to track orders, keep your atelier details saved, and move faster when you want a spotlight piece or personal support.', 'Създайте профил, за да следите поръчките си, да пазите детайлите за ателието и да действате по-бързо, когато искате spotlight модел или лична консултация.')} editorLabel="Account auth copy" /></p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            {authBenefits.map(({ id, title, copy }) => (
                                <div key={id} className="storefront-stat-card reveal-text opacity-0 translate-y-8 border border-[#1C1C1C]/10 bg-white/40 p-4 md:p-5 rounded-sm">
                                    <p className="font-serif text-xl md:text-2xl font-light uppercase tracking-widest mb-3"><EditableText contentKey={`account.auth.benefits.${id}.title`} fallback={title} editorLabel={`${id} benefit title`} /></p>
                                    <p className="text-sm text-[#1C1C1C]/60 leading-relaxed"><EditableText contentKey={`account.auth.benefits.${id}.copy`} fallback={copy} editorLabel={`${id} benefit copy`} /></p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="xl:pt-8">
                        <AuthPanel />
                    </section>
                </div>
            </div>
        );
    }

    const [profileResult, ordersResult, inquiriesResult] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, location, notes, is_admin').eq('id', user.id).maybeSingle(),
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('contact_inquiries').select('id, query_type, message, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const profile = {
        full_name: profileResult.data?.full_name || user?.user_metadata?.full_name || '',
        phone: profileResult.data?.phone || user?.user_metadata?.phone || '',
        location: profileResult.data?.location || user?.user_metadata?.location || '',
        notes: profileResult.data?.notes || user?.user_metadata?.notes || '',
    };
    const isAdmin = Boolean(profileResult.data?.is_admin);
    const profileStorageMode = isProfilesTableMissing(profileResult.error) ? 'metadata' : 'table';
    const schemaMessage = readErrorMessage(profileResult.error, currentLanguage) || readErrorMessage(ordersResult.error, currentLanguage) || readErrorMessage(inquiriesResult.error, currentLanguage);
    const dashboardMetrics = [
        {
            id: 'orders',
            label: localizedFallback('Orders', 'Поръчки'),
            value: String(ordersResult.data?.length || 0).padStart(2, '0'),
            copy: localizedFallback('Submitted orders stored in your account.', 'Изпратените поръчки са запазени в профила ви.'),
        },
        {
            id: 'requests',
            label: localizedFallback('Requests', 'Запитвания'),
            value: String(inquiriesResult.data?.length || 0).padStart(2, '0'),
            copy: localizedFallback('Recent atelier conversations.', 'Последните разговори с ателието.'),
        },
        {
            id: 'profile',
            label: localizedFallback('Profile', 'Профил'),
            value: profile.full_name
                ? localizedFallback('Ready', 'Готов')
                : localizedFallback('Open', 'Попълни'),
            valueKey: profile.full_name ? 'account.dashboard.metrics.profile.value_ready' : 'account.dashboard.metrics.profile.value_open',
            copy: profile.full_name
                ? localizedFallback('Details are available for faster support.', 'Детайлите са налични за по-бърза помощ.')
                : localizedFallback('Add your details for smoother follow-up.', 'Добавете детайлите си за по-лесна последваща връзка.'),
        },
    ];

    return (
        <div className="shell-page-pad-tight max-w-[1800px] mx-auto">
            {authMessage && (
                <div className={`mb-8 rounded-sm border px-4 py-4 text-sm leading-relaxed ${authMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1C1C1C]/10 bg-[#EFECE8] text-[#1C1C1C]/70'}`}>
                    {authMessage.message}
                </div>
            )}
            <div className="mb-10 md:mb-12 grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-5 md:gap-6 items-stretch">
                <section className="account-surface border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-8 flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#1C1C1C]/45 mb-4"><LocalizedText value={localizedFallback('Client Room / The VA Store', 'Клиентска зона / The VA Store')} language={currentLanguage} /></p>
                        <div className="overflow-hidden"><h1 className="hero-title storefront-section-display font-serif font-light uppercase"><LocalizedText value={localizedFallback('My Account', 'Моят профил')} language={currentLanguage} /></h1></div>
                    </div>
                    <p className="hero-sub text-sm md:text-base max-w-2xl text-[#1C1C1C]/62 leading-relaxed"><LocalizedText value={localizedFallback('Signed in as', 'Влезли сте като')} language={currentLanguage} /> {user.email}. <LocalizedText value={localizedFallback('Keep your profile sharp, save atelier-ready details faster, and review orders and requests without the oversized empty intro.', 'Поддържайте профила си подреден, пазете важните детайли под ръка и преглеждайте поръчки и запитвания без излишни стъпки.')} language={currentLanguage} /></p>
                    <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/45">
                        <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/70 rounded-full"><LocalizedText value={localizedFallback('Verified account', 'Потвърден профил')} language={currentLanguage} /></span>
                        <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/70 rounded-full"><LocalizedText value={profileStorageMode === 'metadata' ? localizedFallback('Metadata-backed profile', 'Профил от метаданни') : localizedFallback('Supabase profile table', 'Профилна таблица в Supabase')} language={currentLanguage} /></span>
                        {isAdmin && <span className="px-3 py-2 border border-[#1C1C1C]/10 bg-white/70 rounded-full"><LocalizedText value={localizedFallback('Studio admin access', 'Админ достъп')} language={currentLanguage} /></span>}
                    </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                    {dashboardMetrics.map(({ id, label, value, valueKey, copy }) => (
                        <div key={id} className="account-metric-card account-surface storefront-stat-card border border-[#1C1C1C]/10 bg-white/40 rounded-sm p-4 md:p-5 flex flex-col justify-between">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45"><LocalizedText value={label} language={currentLanguage} /></p>
                            <p className="storefront-stat-display font-serif font-light text-[#1C1C1C]">{valueKey ? <LocalizedText value={value} language={currentLanguage} /> : value}</p>
                            <p className="text-sm leading-relaxed text-[#1C1C1C]/58"><LocalizedText value={copy} language={currentLanguage} /></p>
                        </div>
                    ))}
                </section>
            </div>

            <AccountDashboard user={user} profile={profile} orders={ordersResult.data ?? []} inquiries={inquiriesResult.data ?? []} schemaMessage={schemaMessage} profileStorageMode={profileStorageMode} isAdmin={isAdmin} language={currentLanguage} />
        </div>
    );
}