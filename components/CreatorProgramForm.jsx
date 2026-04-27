"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CREATOR_PROGRAM_DEADLINE,
    CREATOR_PROGRAM_RIGHTS_STATEMENT,
    firstCreatorApplicationError,
    getCreatorProgramText,
    validateCreatorApplicationPayload,
} from '../utils/creator-program';
import { downloadCreatorApplicationAgreement } from '../utils/creator-program-pdf';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../utils/language';

const INITIAL_STATUS = {
    type: 'idle',
    title: '',
    message: '',
    detail: '',
};

export default function CreatorProgramForm({ initialValues, initialLanguage = DEFAULT_LANGUAGE, compact = false }) {
    const { i18n } = useTranslation();
    const currentLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language || initialLanguage) || DEFAULT_LANGUAGE;
    const [formValues, setFormValues] = useState({
        fullName: initialValues?.fullName || '',
        email: initialValues?.email || '',
        phone: initialValues?.phone || '',
        socialLinks: Array.isArray(initialValues?.socialLinks) && initialValues.socialLinks.length > 0
            ? initialValues.socialLinks
            : [initialValues?.profileUrl || ''],
        motivation: initialValues?.motivation || '',
        agreedToTerms: false,
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [status, setStatus] = useState(INITIAL_STATUS);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const localize = (englishValue, bulgarianValue) => getCreatorProgramText(currentLanguage, englishValue, bulgarianValue);

    const updateField = (event) => {
        const { name, type, value, checked } = event.target;

        setFormValues((currentValues) => ({
            ...currentValues,
            [name]: type === 'checkbox' ? checked : value,
        }));
        setFieldErrors((currentErrors) => {
            if (!currentErrors[name]) {
                return currentErrors;
            }

            return {
                ...currentErrors,
                [name]: '',
            };
        });
    };

    const updateSocialLink = (index, nextValue) => {
        setFormValues((currentValues) => ({
            ...currentValues,
            socialLinks: currentValues.socialLinks.map((socialLink, socialLinkIndex) => (socialLinkIndex === index ? nextValue : socialLink)),
        }));
        setFieldErrors((currentErrors) => {
            if (!Array.isArray(currentErrors.socialLinks) || !currentErrors.socialLinks[index]) {
                return currentErrors;
            }

            const nextSocialLinkErrors = [...currentErrors.socialLinks];
            nextSocialLinkErrors[index] = '';

            return {
                ...currentErrors,
                socialLinks: nextSocialLinkErrors,
            };
        });
    };

    const addSocialLinkField = () => {
        setFormValues((currentValues) => ({
            ...currentValues,
            socialLinks: [...currentValues.socialLinks, ''],
        }));
    };

    const removeSocialLinkField = (index) => {
        setFormValues((currentValues) => ({
            ...currentValues,
            socialLinks: currentValues.socialLinks.filter((_, socialLinkIndex) => socialLinkIndex !== index),
        }));
        setFieldErrors((currentErrors) => {
            if (!Array.isArray(currentErrors.socialLinks)) {
                return currentErrors;
            }

            return {
                ...currentErrors,
                socialLinks: currentErrors.socialLinks.filter((_, socialLinkIndex) => socialLinkIndex !== index),
            };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setStatus(INITIAL_STATUS);

        const validation = validateCreatorApplicationPayload(formValues, { language: currentLanguage });

        if (!validation.isValid) {
            setFieldErrors(validation.errors);
            setStatus({
                type: 'error',
                title: localize('Application incomplete', 'Кандидатурата не е завършена'),
                message: firstCreatorApplicationError(validation.errors) || localize('Please review the form and try again.', 'Прегледайте формата и опитайте отново.'),
                detail: localize('The highlighted fields need attention before the application can be sent.', 'Отбелязаните полета трябва да се коригират, преди кандидатурата да бъде изпратена.'),
            });
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/collaboration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(validation.normalized),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (data?.errors && typeof data.errors === 'object') {
                    setFieldErrors(data.errors);
                }

                throw new Error(data.error || localize('Unable to submit your application right now.', 'Не успяхме да изпратим кандидатурата ви в момента.'));
            }

            let detail = localize(
                'Your agreement PDF has been downloaded automatically for your records.',
                'PDF споразумението беше изтеглено автоматично за вашия архив.'
            );

            try {
                await downloadCreatorApplicationAgreement({
                    application: data.application,
                    language: currentLanguage,
                });
            } catch (pdfError) {
                console.error('Creator Program PDF generation failed.', pdfError);
                detail = localize(
                    'Your application was saved, but the PDF could not be downloaded automatically.',
                    'Кандидатурата беше записана, но PDF не можа да се изтегли автоматично.'
                );
            }

            setStatus({
                type: 'success',
                title: localize('Application received', 'Кандидатурата е получена'),
                message: data.message || localize('The THE VA STORE team will review your profile and follow up by email.', 'Екипът на THE VA STORE ще прегледа профила ви и ще се свърже с вас по имейл.'),
                detail,
            });
            setFieldErrors({});
            setFormValues((currentValues) => ({
                ...currentValues,
                motivation: '',
                agreedToTerms: false,
            }));
        } catch (error) {
            setStatus({
                type: 'error',
                title: localize('Submission unavailable', 'Изпращането е недостъпно'),
                message: error.message || localize('Unable to submit your application right now.', 'Не успяхме да изпратим кандидатурата ви в момента.'),
                detail: localize('Review the form and try again once more.', 'Прегледайте формата и опитайте още веднъж.'),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderFieldError = (fieldName) => {
        if (!fieldErrors[fieldName]) {
            return null;
        }

        return <p className="text-[11px] leading-relaxed text-[#9F3C2F]">{fieldErrors[fieldName]}</p>;
    };

    const renderSocialLinkError = (index) => {
        if (!Array.isArray(fieldErrors.socialLinks) || !fieldErrors.socialLinks[index]) {
            return null;
        }

        return <p className="text-[11px] leading-relaxed text-[#9F3C2F]">{fieldErrors.socialLinks[index]}</p>;
    };

    const isSubmitDisabled = isSubmitting;
    const surfaceClassName = compact
        ? 'overflow-hidden rounded-[1.75rem] border border-[#181410]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,241,233,0.98)_100%)] shadow-[0_22px_70px_rgba(24,20,16,0.08)]'
        : 'overflow-hidden rounded-[1.9rem] border border-[#181410]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(248,241,233,0.96)_100%)] shadow-[0_30px_90px_rgba(24,20,16,0.08)]';
    const headerClassName = compact
        ? 'border-b border-[#181410]/8 px-5 py-4 sm:px-6'
        : 'border-b border-[#181410]/8 px-6 py-5 sm:px-8';
    const bodyClassName = compact
        ? 'grid grid-cols-1 gap-4 px-5 py-5 sm:px-6 sm:py-6'
        : 'grid grid-cols-1 gap-5 px-6 py-6 sm:px-8 sm:py-8';
    const titleClassName = compact
        ? 'font-serif text-[1.65rem] font-light uppercase tracking-[-0.04em] text-[#181410] sm:text-[2rem]'
        : 'font-serif text-[2rem] font-light uppercase tracking-[-0.04em] text-[#181410] sm:text-[2.5rem]';
    const descriptionText = compact
        ? localize(
            'The essential working terms are summarized on the page, and the full collaboration policy is linked beside the form.',
            'Основните условия са обобщени на страницата, а пълната политика за партньорство е свързана до формата.'
        )
        : localize(
            'Manual review prioritizes aesthetic fit, execution quality, and audience alignment. If approved, you receive the full brief by email and a downloadable agreement immediately after submission.',
            'Ръчният преглед гледа естетически fit, качество на изпълнение и съвпадение с аудиторията. При успешно изпращане получавате незабавно PDF споразумение, а одобрените профили получават пълен бриф по имейл.'
        );

    return (
        <form onSubmit={handleSubmit} className={surfaceClassName}>
            <div className={headerClassName}>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="max-w-[34rem] text-sm leading-relaxed text-[#181410]/64">
                            {descriptionText}
                        </p>
                    </div>
                    <p className={`text-[10px] uppercase tracking-[0.28em] text-[#181410]/44 ${compact ? 'max-w-[16rem]' : ''}`}>
                        {localize(CREATOR_PROGRAM_DEADLINE.en, CREATOR_PROGRAM_DEADLINE.bg)}
                    </p>
                </div>
            </div>

            <div className={bodyClassName}>
                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-[#181410]/50">
                    <span>{localize('Full Name', 'Име и фамилия')}</span>
                    <input
                        type="text"
                        name="fullName"
                        value={formValues.fullName}
                        onChange={updateField}
                        required
                        autoComplete="name"
                        className="min-h-14 rounded-[1.1rem] border border-[#181410]/12 bg-white/90 px-4 text-sm normal-case tracking-normal text-[#181410] outline-none transition-colors focus:border-[#181410]"
                    />
                    {renderFieldError('fullName')}
                </label>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-[#181410]/50">
                    <span>{localize('Phone Number', 'Телефонен номер')}</span>
                    <input
                        type="tel"
                        name="phone"
                        value={formValues.phone}
                        onChange={updateField}
                        autoComplete="tel"
                        placeholder={localize('+359 888 123 456', '+359 888 123 456')}
                        className="min-h-14 rounded-[1.1rem] border border-[#181410]/12 bg-white/90 px-4 text-sm normal-case tracking-normal text-[#181410] outline-none transition-colors focus:border-[#181410]"
                    />
                    {renderFieldError('phone')}
                </label>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-[#181410]/50">
                    <span>{localize('Email', 'Имейл')}</span>
                    <input
                        type="email"
                        name="email"
                        value={formValues.email}
                        onChange={updateField}
                        required
                        autoComplete="email"
                        className="min-h-14 rounded-[1.1rem] border border-[#181410]/12 bg-white/90 px-4 text-sm normal-case tracking-normal text-[#181410] outline-none transition-colors focus:border-[#181410]"
                    />
                    {renderFieldError('email')}
                </label>

                <div className="flex flex-col gap-3 text-[10px] uppercase tracking-[0.24em] text-[#181410]/50">
                    <div className="flex items-center justify-between gap-3">
                        <span>{localize('Social Profile Links', 'Линкове към социални профили')}</span>
                        <button
                            type="button"
                            onClick={addSocialLinkField}
                            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#181410]/12 bg-white/80 px-4 text-[10px] uppercase tracking-[0.22em] text-[#181410]/68 transition-colors hover:border-[#181410]/24 hover:text-[#181410]"
                        >
                            {localize('Add another one', 'Добави още един')}
                        </button>
                    </div>

                    {formValues.socialLinks.map((socialLink, index) => (
                        <div key={`social-link-${index}`} className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <input
                                    type="url"
                                    value={socialLink}
                                    onChange={(event) => updateSocialLink(index, event.target.value)}
                                    required
                                    placeholder={index === 0 ? 'https://instagram.com/your-profile' : 'https://your-platform.com/your-profile'}
                                    className="min-h-14 flex-1 rounded-[1.1rem] border border-[#181410]/12 bg-white/90 px-4 text-sm normal-case tracking-normal text-[#181410] outline-none transition-colors focus:border-[#181410]"
                                />

                                {formValues.socialLinks.length > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => removeSocialLinkField(index)}
                                        className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#181410]/12 bg-white/80 px-4 text-[10px] uppercase tracking-[0.22em] text-[#181410]/68 transition-colors hover:border-[#181410]/24 hover:text-[#181410]"
                                    >
                                        {localize('Remove', 'Премахни')}
                                    </button>
                                ) : null}
                            </div>
                            {renderSocialLinkError(index)}
                        </div>
                    ))}
                </div>

                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-[#181410]/50">
                    <span>{localize('Tell us more about you?', 'Разкажи ни повече за себе си')}</span>
                    <textarea
                        name="motivation"
                        value={formValues.motivation}
                        onChange={updateField}
                        required
                        rows={compact ? 5 : 7}
                        className="min-h-40 rounded-[1.1rem] border border-[#181410]/12 bg-white/90 px-4 py-4 text-sm normal-case leading-relaxed tracking-normal text-[#181410] outline-none transition-colors focus:border-[#181410]"
                    />
                    {renderFieldError('motivation')}
                </label>

                <label className="flex items-start gap-3 rounded-[1.25rem] border border-[#181410]/10 bg-white/75 px-4 py-4 text-sm leading-relaxed text-[#181410]/72">
                    <input
                        type="checkbox"
                        name="agreedToTerms"
                        checked={formValues.agreedToTerms}
                        onChange={updateField}
                        required
                        className="mt-1 h-4 w-4 rounded border-[#181410]/25 text-[#181410]"
                    />
                    <span>{localize(CREATOR_PROGRAM_RIGHTS_STATEMENT.en, CREATOR_PROGRAM_RIGHTS_STATEMENT.bg)}</span>
                </label>
                {renderFieldError('agreedToTerms')}

                {status.type !== 'idle' && (
                    <div className={`rounded-[1.25rem] border px-4 py-4 ${status.type === 'success' ? 'border-[#1F6A4A]/16 bg-[#F4FBF6] text-[#184935]' : 'border-[#9F3C2F]/14 bg-[#FFF7F5] text-[#6F2D24]'}`}>
                        <p className="text-[10px] uppercase tracking-[0.26em] opacity-70">{status.type === 'success' ? localize('Status', 'Статус') : localize('Attention', 'Внимание')}</p>
                        <p className="mt-2 font-serif text-[1.45rem] font-light tracking-[-0.03em]">{status.title}</p>
                        <p className="mt-2 text-sm leading-relaxed">{status.message}</p>
                        {status.detail ? <p className="mt-2 text-sm leading-relaxed opacity-80">{status.detail}</p> : null}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#181410] px-6 text-xs font-medium uppercase tracking-[0.28em] text-[#F7F1EA] transition-opacity duration-200 hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
                >
                    {isSubmitting ? localize('Submitting...', 'Изпращане...') : localize('Submit Application', 'Изпрати кандидатура')}
                </button>
            </div>
        </form>
    );
}