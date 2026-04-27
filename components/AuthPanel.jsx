"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '../utils/supabase/client';
import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, resolveLocalizedValue } from '../utils/language';
import { absoluteSiteUrl } from '../utils/seo';
import EditableText from './site-copy/EditableText';
import { useSiteCopy } from './site-copy/SiteCopyProvider';

export default function AuthPanel({ initialMode = 'sign-in' }) {
    const supabase = isSupabaseConfigured() ? createClient() : null;
    const router = useRouter();
    const siteCopy = useSiteCopy();
    const [mode, setMode] = useState(initialMode);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const getText = (key, fallback) => siteCopy ? siteCopy.resolveText(key, fallback) : resolveLocalizedValue(fallback, DEFAULT_LANGUAGE);

    const resolveAuthErrorMessage = (error) => {
        const errorCode = typeof error?.code === 'string' ? error.code : '';
        const errorMessage = typeof error?.message === 'string' ? error.message : '';

        if (
            error?.status === 429
            || errorCode === 'over_email_send_rate_limit'
            || errorCode === 'over_request_rate_limit'
            || /after 30 seconds|after 60 seconds|too many/i.test(errorMessage)
        ) {
            if (mode === 'recovery') {
                return getText(
                    'auth.messages.reset_rate_limited',
                    localizedFallback(
                        'A reset email was requested recently. Check your inbox and spam first, then wait about a minute before trying again.',
                        'Преди малко вече беше поискан имейл за смяна на паролата. Първо проверете входящата поща и спам папката, после изчакайте около минута преди нов опит.'
                    )
                );
            }

            if (mode === 'sign-up') {
                return getText(
                    'auth.messages.confirmation_rate_limited',
                    localizedFallback(
                        `Confirmation email was already requested for ${email}. Check your inbox and spam, then wait about a minute before trying again.`,
                        `Имейл за потвърждение вече беше поискан за ${email}. Проверете входящата поща и спам папката, после изчакайте около минута преди нов опит.`
                    )
                );
            }

            return getText(
                'auth.messages.rate_limited',
                localizedFallback(
                    'Too many auth requests were sent recently. Wait about a minute and try again.',
                    'Изпратени са твърде много заявки за вход за кратко време. Изчакайте около минута и опитайте отново.'
                )
            );
        }

        return errorMessage || getText(
            'auth.messages.generic_error',
            localizedFallback(
                'Unable to continue with authentication.',
                'Не успяхме да продължим с удостоверяването.'
            )
        );
    };

    const persistProfile = async () => {
        const response = await fetch('/api/account/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fullName }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || getText(
                'auth.messages.profile_persist_error',
                localizedFallback(
                    'Account created, but profile details could not be saved yet.',
                    'Профилът е създаден, но данните му още не можаха да се запазят.'
                )
            ));
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'idle', message: '' });

        try {
            if (!supabase) {
                throw new Error(getText(
                    'auth.messages.supabase_missing',
                    localizedFallback(
                        'Account auth is unavailable locally until Supabase env values are added to .env.local.',
                        'Достъпът до профили не е активен локално, докато не добавите Supabase стойностите в .env.local.'
                    )
                ));
            }

            if (mode === 'recovery') {
                const redirectTo = absoluteSiteUrl('/account/reset-password', { allowLocal: false });
                const { error } = await supabase.auth.resetPasswordForEmail(
                    email,
                    redirectTo ? { redirectTo } : undefined
                );

                if (error) {
                    throw error;
                }

                setStatus({
                    type: 'success',
                    message: getText(
                        'auth.messages.reset_sent',
                        localizedFallback(
                            'Password reset email sent. Open the link in your email to choose a new password.',
                            'Изпратихме имейл за смяна на паролата. Отворете линка в писмото, за да зададете нова.'
                        )
                    ),
                });
                return;
            }

            if (mode === 'sign-in') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });

                if (error) {
                    throw error;
                }

                router.push('/account');
                router.refresh();
                return;
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: absoluteSiteUrl('/account', { allowLocal: false }),
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) {
                throw error;
            }

            if (data.session) {
                await persistProfile();
                router.push('/account');
                router.refresh();
                return;
            }

            setStatus({
                type: 'success',
                message: getText(
                    'auth.messages.account_created',
                    localizedFallback(
                        `Welcome! We just sent a confirmation link to ${email}. Open the email and tap "Confirm your email" to activate your account, then come back here to sign in.`,
                        `Добре дошли! Изпратихме линк за потвърждение на ${email}. Отворете имейла и натиснете „Потвърди имейла“, за да активирате профила си, после се върнете тук, за да влезете.`
                    )
                ),
            });
            setMode('sign-in');
        } catch (error) {
            setStatus({
                type: 'error',
                message: resolveAuthErrorMessage(error),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="border border-[#1C1C1C]/10 bg-white/60 p-6 md:p-8 rounded-sm">
            {!supabase && (
                <div className="mb-8 rounded-sm border border-[#1C1C1C]/10 bg-[#EFECE8] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45"><EditableText contentKey="auth.local_setup.eyebrow" fallback={localizedFallback('Local Setup Needed', 'Нужна е локална настройка')} editorLabel="Auth local setup eyebrow" /></p>
                    <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/62"><EditableText contentKey="auth.local_setup.copy" fallback={localizedFallback('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server to enable sign-in and account creation.', 'Добавете NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local, после рестартирайте dev сървъра, за да активирате входа и създаването на профили.')} editorLabel="Auth local setup copy" /></p>
                </div>
            )}

            {mode === 'recovery' ? (
                <div className="mb-8 rounded-sm border border-[#1C1C1C]/10 bg-[#EFECE8] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45"><EditableText contentKey="auth.recovery.eyebrow" fallback={localizedFallback('Password Recovery', 'Възстановяване на парола')} editorLabel="Auth recovery eyebrow" /></p>
                    <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/62"><EditableText contentKey="auth.recovery.copy" fallback={localizedFallback('Enter your email and the reset link will send you to a secure password update screen.', 'Въведете имейла си и ще изпратим линк за сигурна смяна на паролата.')} editorLabel="Auth recovery copy" /></p>
                </div>
            ) : (
                <div className="flex gap-2 mb-8 border border-[#1C1C1C]/10 p-1 rounded-full bg-[#EFECE8]">
                    <button type="button" onClick={() => setMode('sign-in')} className={`flex-1 rounded-full px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${mode === 'sign-in' ? 'bg-[#1C1C1C] text-[#EFECE8]' : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}><EditableText contentKey="auth.tabs.login" fallback={localizedFallback('Login', 'Вход')} editorLabel="Auth login tab" /></button>
                    <button type="button" onClick={() => setMode('sign-up')} className={`flex-1 rounded-full px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${mode === 'sign-up' ? 'bg-[#1C1C1C] text-[#EFECE8]' : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}><EditableText contentKey="auth.tabs.create_account" fallback={localizedFallback('Create Account', 'Създай профил')} editorLabel="Auth create account tab" /></button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {mode === 'sign-up' && (
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        <EditableText contentKey="auth.fields.full_name" fallback={localizedFallback('Full Name', 'Име и фамилия')} editorLabel="Auth full name label" />
                        <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </label>
                )}

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="auth.fields.email" fallback={localizedFallback('Email', 'Имейл')} editorLabel="Auth email label" />
                    <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                    />
                </label>

                {mode !== 'recovery' && (
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        <EditableText contentKey="auth.fields.password" fallback={localizedFallback('Password', 'Парола')} editorLabel="Auth password label" />
                        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </label>
                )}

                {mode === 'sign-in' && (
                    <button type="button" onClick={() => {
                        setMode('recovery');
                        setStatus({ type: 'idle', message: '' });
                    }} className="w-fit text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 transition-colors hover:text-[#1C1C1C]">
                        <EditableText contentKey="auth.forgot_password" fallback={localizedFallback('Forgot Password?', 'Забравена парола?')} editorLabel="Auth forgot password" />
                    </button>
                )}

                {mode === 'recovery' && (
                    <button type="button" onClick={() => {
                        setMode('sign-in');
                        setStatus({ type: 'idle', message: '' });
                    }} className="w-fit text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 transition-colors hover:text-[#1C1C1C]">
                        <EditableText contentKey="auth.back_to_login" fallback={localizedFallback('Back To Login', 'Назад към вход')} editorLabel="Auth back to login" />
                    </button>
                )}

                {status.message && (
                    <p className={`text-xs leading-relaxed ${status.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/65'}`}>{status.message}</p>
                )}

                <button disabled={isSubmitting || !supabase} className={`mt-2 h-14 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.24em] text-xs font-medium transition-colors hover:bg-black ${(isSubmitting || !supabase) ? 'opacity-60' : ''}`}>
                    {isSubmitting
                        ? <EditableText contentKey="auth.submit.working" fallback={localizedFallback('Working...', 'Обработва се...')} editorLabel="Auth submit working" />
                        : mode === 'sign-in'
                            ? <EditableText contentKey="auth.submit.enter_account" fallback={localizedFallback('Enter Account', 'Влез в профила')} editorLabel="Auth submit enter account" />
                            : mode === 'recovery'
                                ? <EditableText contentKey="auth.submit.send_reset_email" fallback={localizedFallback('Send Reset Email', 'Изпрати имейл за смяна')} editorLabel="Auth submit send reset email" />
                                : <EditableText contentKey="auth.submit.create_account" fallback={localizedFallback('Create Account', 'Създай профил')} editorLabel="Auth submit create account" />}
                </button>
            </form>
        </div>
    );
}