"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '../utils/supabase/client';
import EditableText from './site-copy/EditableText';

export default function AuthPanel({ initialMode = 'sign-in' }) {
    const supabase = isSupabaseConfigured() ? createClient() : null;
    const router = useRouter();
    const [mode, setMode] = useState(initialMode);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    const buildRedirectUrl = (path) => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        return `${window.location.origin}${path}`;
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
            throw new Error(data.error || 'Account created, but profile details could not be saved yet.');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'idle', message: '' });

        try {
            if (!supabase) {
                throw new Error('Account auth is unavailable locally until Supabase env values are added to .env.local.');
            }

            if (mode === 'recovery') {
                const redirectTo = buildRedirectUrl('/account/reset-password');
                const { error } = await supabase.auth.resetPasswordForEmail(
                    email,
                    redirectTo ? { redirectTo } : undefined
                );

                if (error) {
                    throw error;
                }

                setStatus({
                    type: 'success',
                    message: 'Password reset email sent. Open the link in your email to choose a new password.',
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
                    emailRedirectTo: buildRedirectUrl('/account'),
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
                message: 'Your account is created. Check your email if Supabase confirmation is enabled, then sign in to access your account.',
            });
            setMode('sign-in');
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.message || 'Unable to continue with authentication.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="border border-[#1C1C1C]/10 bg-white/60 p-6 md:p-8 rounded-sm">
            {!supabase && (
                <div className="mb-8 rounded-sm border border-[#1C1C1C]/10 bg-[#EFECE8] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45"><EditableText contentKey="auth.local_setup.eyebrow" fallback="Local Setup Needed" editorLabel="Auth local setup eyebrow" /></p>
                    <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/62"><EditableText contentKey="auth.local_setup.copy" fallback="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server to enable sign-in and account creation." editorLabel="Auth local setup copy" /></p>
                </div>
            )}

            {mode === 'recovery' ? (
                <div className="mb-8 rounded-sm border border-[#1C1C1C]/10 bg-[#EFECE8] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/45"><EditableText contentKey="auth.recovery.eyebrow" fallback="Password Recovery" editorLabel="Auth recovery eyebrow" /></p>
                    <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/62"><EditableText contentKey="auth.recovery.copy" fallback="Enter your email and the reset link will send you to a secure password update screen." editorLabel="Auth recovery copy" /></p>
                </div>
            ) : (
                <div className="flex gap-2 mb-8 border border-[#1C1C1C]/10 p-1 rounded-full bg-[#EFECE8]">
                    <button type="button" onClick={() => setMode('sign-in')} className={`flex-1 rounded-full px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${mode === 'sign-in' ? 'bg-[#1C1C1C] text-[#EFECE8]' : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}><EditableText contentKey="auth.tabs.login" fallback="Login" editorLabel="Auth login tab" /></button>
                    <button type="button" onClick={() => setMode('sign-up')} className={`flex-1 rounded-full px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${mode === 'sign-up' ? 'bg-[#1C1C1C] text-[#EFECE8]' : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}><EditableText contentKey="auth.tabs.create_account" fallback="Create Account" editorLabel="Auth create account tab" /></button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {mode === 'sign-up' && (
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        <EditableText contentKey="auth.fields.full_name" fallback="Full Name" editorLabel="Auth full name label" />
                        <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </label>
                )}

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    <EditableText contentKey="auth.fields.email" fallback="Email" editorLabel="Auth email label" />
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                </label>

                {mode !== 'recovery' && (
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        <EditableText contentKey="auth.fields.password" fallback="Password" editorLabel="Auth password label" />
                        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </label>
                )}

                {mode === 'sign-in' && (
                    <button type="button" onClick={() => {
                        setMode('recovery');
                        setStatus({ type: 'idle', message: '' });
                    }} className="w-fit text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 transition-colors hover:text-[#1C1C1C]">
                        <EditableText contentKey="auth.forgot_password" fallback="Forgot Password?" editorLabel="Auth forgot password" />
                    </button>
                )}

                {mode === 'recovery' && (
                    <button type="button" onClick={() => {
                        setMode('sign-in');
                        setStatus({ type: 'idle', message: '' });
                    }} className="w-fit text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55 transition-colors hover:text-[#1C1C1C]">
                        <EditableText contentKey="auth.back_to_login" fallback="Back To Login" editorLabel="Auth back to login" />
                    </button>
                )}

                {status.message && (
                    <p className={`text-xs leading-relaxed ${status.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/65'}`}>{status.message}</p>
                )}

                <button disabled={isSubmitting || !supabase} className={`mt-2 h-14 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.24em] text-xs font-medium transition-colors hover:bg-black ${(isSubmitting || !supabase) ? 'opacity-60' : ''}`}>
                    {isSubmitting
                        ? <EditableText contentKey="auth.submit.working" fallback="Working..." editorLabel="Auth submit working" />
                        : mode === 'sign-in'
                            ? <EditableText contentKey="auth.submit.enter_account" fallback="Enter Account" editorLabel="Auth submit enter account" />
                            : mode === 'recovery'
                                ? <EditableText contentKey="auth.submit.send_reset_email" fallback="Send Reset Email" editorLabel="Auth submit send reset email" />
                                : <EditableText contentKey="auth.submit.create_account" fallback="Create Account" editorLabel="Auth submit create account" />}
                </button>
            </form>
        </div>
    );
}