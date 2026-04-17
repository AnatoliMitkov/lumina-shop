"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export default function AuthPanel({ initialMode = 'sign-in' }) {
    const router = useRouter();
    const [mode, setMode] = useState(initialMode);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

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
            <div className="flex gap-2 mb-8 border border-[#1C1C1C]/10 p-1 rounded-full bg-[#EFECE8]">
                <button type="button" onClick={() => setMode('sign-in')} className={`flex-1 rounded-full px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${mode === 'sign-in' ? 'bg-[#1C1C1C] text-[#EFECE8]' : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}>Login</button>
                <button type="button" onClick={() => setMode('sign-up')} className={`flex-1 rounded-full px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${mode === 'sign-up' ? 'bg-[#1C1C1C] text-[#EFECE8]' : 'text-[#1C1C1C]/55 hover:text-[#1C1C1C]'}`}>Create Account</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {mode === 'sign-up' && (
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                        Full Name
                        <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                    </label>
                )}

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    Email
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                </label>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                    Password
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
                </label>

                {status.message && (
                    <p className={`text-xs leading-relaxed ${status.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/65'}`}>{status.message}</p>
                )}

                <button disabled={isSubmitting} className={`mt-2 h-14 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.24em] text-xs font-medium transition-colors hover:bg-black ${isSubmitting ? 'opacity-60' : ''}`}>
                    {isSubmitting ? 'Working...' : mode === 'sign-in' ? 'Enter Account' : 'Create Account'}
                </button>
            </form>
        </div>
    );
}