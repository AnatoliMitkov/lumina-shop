"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '../utils/supabase/client';
import EditableText from './site-copy/EditableText';

export default function ResetPasswordPanel() {
    const supabase = isSupabaseConfigured() ? createClient() : null;
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'idle', message: '' });

        try {
            if (!supabase) {
                throw new Error('Supabase auth is unavailable in this environment.');
            }

            if (password.length < 6) {
                throw new Error('Use a password with at least 6 characters.');
            }

            if (password !== confirmPassword) {
                throw new Error('The password confirmation does not match.');
            }

            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                throw error;
            }

            router.push('/account?notice=password-reset');
            router.refresh();
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.message || 'Unable to reset the password right now.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="border border-[#1C1C1C]/10 bg-white/70 p-6 md:p-8 rounded-sm flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                <EditableText contentKey="reset_password.form.new_password" fallback="New Password" editorLabel="Reset password new password label" />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
            </label>

            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                <EditableText contentKey="reset_password.form.confirm_password" fallback="Confirm Password" editorLabel="Reset password confirm password label" />
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={6} className="h-14 border border-[#1C1C1C]/12 bg-white px-4 text-sm tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]" />
            </label>

            {status.message && (
                <p className={`text-xs leading-relaxed ${status.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/65'}`}>{status.message}</p>
            )}

            <button disabled={isSubmitting || !supabase} className={`mt-2 h-14 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.24em] text-xs font-medium transition-colors hover:bg-black ${(isSubmitting || !supabase) ? 'opacity-60' : ''}`}>
                {isSubmitting ? <EditableText contentKey="reset_password.form.saving" fallback="Saving..." editorLabel="Reset password saving" /> : <EditableText contentKey="reset_password.form.save" fallback="Save New Password" editorLabel="Reset password save button" />}
            </button>
        </form>
    );
}