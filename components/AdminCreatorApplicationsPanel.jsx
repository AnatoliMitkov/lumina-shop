"use client";

import { useMemo, useState } from 'react';

function formatDate(value) {
    if (!value) {
        return 'Pending';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function sanitizeStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (['pending', 'reviewing', 'approved', 'declined', 'archived'].includes(normalized)) {
        return normalized;
    }

    return 'pending';
}

function getStatusTone(status) {
    switch (sanitizeStatus(status)) {
        case 'approved':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'reviewing':
            return 'border-amber-200 bg-amber-50 text-amber-700';
        case 'declined':
            return 'border-red-200 bg-red-50 text-red-700';
        case 'archived':
            return 'border-[#1C1C1C]/15 bg-[#EFE7DA] text-[#1C1C1C]/62';
        default:
            return 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]';
    }
}

function toSocialLinks(value, profileUrl) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);

            if (Array.isArray(parsed)) {
                return parsed.filter(Boolean);
            }
        } catch {
            // Keep fallback below.
        }
    }

    return profileUrl ? [profileUrl] : [];
}

function toTitleCase(value) {
    return String(value || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(' ');
}

function getSocialButtonLabel(url) {
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
        const platformMap = {
            'x.com': 'X',
            'twitter.com': 'X',
            'threads.net': 'Threads',
            'threads.com': 'Threads',
            'instagram.com': 'Instagram',
            'facebook.com': 'Facebook',
            'tiktok.com': 'TikTok',
            'youtube.com': 'YouTube',
            'youtu.be': 'YouTube',
            'reddit.com': 'Reddit',
            'linkedin.com': 'LinkedIn',
            'pinterest.com': 'Pinterest',
            'snapchat.com': 'Snapchat',
            'twitch.tv': 'Twitch',
            'discord.com': 'Discord',
            'discord.gg': 'Discord',
            'artstation.com': 'ArtStation',
            'behance.net': 'Behance',
            'dribbble.com': 'Dribbble',
            'medium.com': 'Medium',
            'substack.com': 'Substack',
            'tumblr.com': 'Tumblr',
            'soundcloud.com': 'SoundCloud',
            'spotify.com': 'Spotify',
        };

        const platformName = platformMap[hostname] || toTitleCase(hostname.split('.')[0] || 'Profile');

        return `Open ${platformName}`;
    } catch {
        return 'Open Profile';
    }
}

export default function AdminCreatorApplicationsPanel({
    initialApplications = [],
    affiliateCodes = [],
    setupMessage = '',
}) {
    const [applications, setApplications] = useState(initialApplications);
    const [activeStatusFilter, setActiveStatusFilter] = useState('all');
    const [selectedApplicationId, setSelectedApplicationId] = useState(initialApplications[0]?.id || '');
    const [draftStatus, setDraftStatus] = useState(sanitizeStatus(initialApplications[0]?.status || 'pending'));
    const [draftAffiliateCodeId, setDraftAffiliateCodeId] = useState(initialApplications[0]?.affiliate_code_id || '');
    const [draftAdminNote, setDraftAdminNote] = useState(initialApplications[0]?.admin_note || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState({ type: 'idle', message: '' });

    const sortedApplications = useMemo(() => {
        return [...applications].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    }, [applications]);

    const filteredApplications = useMemo(() => {
        if (activeStatusFilter === 'all') {
            return sortedApplications;
        }

        return sortedApplications.filter((application) => sanitizeStatus(application.status) === activeStatusFilter);
    }, [activeStatusFilter, sortedApplications]);

    const selectedApplication = useMemo(() => {
        if (!selectedApplicationId) {
            return null;
        }

        return applications.find((application) => application.id === selectedApplicationId) || null;
    }, [applications, selectedApplicationId]);

    const affiliateCodeOptions = useMemo(() => {
        return affiliateCodes
            .filter((record) => record?.id && record?.code)
            .map((record) => ({ id: record.id, code: record.code, label: record.partner_name || record.code }));
    }, [affiliateCodes]);

    const handleSelectApplication = (application) => {
        setSelectedApplicationId(application.id);
        setDraftStatus(sanitizeStatus(application.status));
        setDraftAffiliateCodeId(application.affiliate_code_id || '');
        setDraftAdminNote(application.admin_note || '');
        setSaveFeedback({ type: 'idle', message: '' });
    };

    const handleStatusPatch = async () => {
        if (!selectedApplicationId) {
            return;
        }

        if (draftStatus === 'approved' && !draftAffiliateCodeId) {
            setSaveFeedback({ type: 'error', message: 'Select an affiliate code before approving this creator.' });
            return;
        }

        setIsSaving(true);
        setSaveFeedback({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/admin/creator-applications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: selectedApplicationId,
                    status: draftStatus,
                    affiliateCodeId: draftStatus === 'approved' ? draftAffiliateCodeId : '',
                    adminNote: draftAdminNote,
                }),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.error || 'Unable to save creator review state.');
            }

            const updatedApplication = payload.creatorApplication;

            setApplications((currentApplications) => currentApplications.map((application) => (
                application.id === updatedApplication.id ? updatedApplication : application
            )));
            setDraftStatus(sanitizeStatus(updatedApplication.status));
            setDraftAffiliateCodeId(updatedApplication.affiliate_code_id || '');
            setDraftAdminNote(updatedApplication.admin_note || '');
            setSaveFeedback({ type: 'success', message: 'Creator review state saved.' });
        } catch (error) {
            setSaveFeedback({ type: 'error', message: error.message || 'Unable to save creator review state.' });
        } finally {
            setIsSaving(false);
        }
    };

    const selectedSocialLinks = toSocialLinks(selectedApplication?.social_links, selectedApplication?.profile_url);

    return (
        <section className="border border-[#1C1C1C]/10 bg-white/55 rounded-sm p-6 md:p-8 flex flex-col gap-6 md:gap-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#1C1C1C]/45">Creator Review</p>
                    <h2 className="mt-3 font-serif text-3xl md:text-4xl font-light uppercase tracking-[0.1em] leading-none">Applications Desk</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/60 max-w-3xl">Review applications in one focused block, assign affiliate codes on approval, and keep applicant history readable in a fixed-height workspace.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {['all', 'pending', 'reviewing', 'approved', 'declined', 'archived'].map((status) => {
                        const isActive = activeStatusFilter === status;

                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setActiveStatusFilter(status)}
                                className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors ${isActive ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white/70 text-[#1C1C1C]/58 hover:text-[#1C1C1C]'}`}
                            >
                                {status}
                            </button>
                        );
                    })}
                </div>
            </div>

            {setupMessage ? <p className="text-sm text-[#8A6A2F]">{setupMessage}</p> : null}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 md:gap-6 items-start">
                <div className="border border-[#1C1C1C]/10 bg-white/70 rounded-sm p-4 md:p-5 h-[40rem] md:h-[44rem] overflow-y-auto">
                    <div className="flex flex-col gap-3">
                        {filteredApplications.length === 0 ? (
                            <p className="text-sm text-[#1C1C1C]/55">No creator applications for the current filter.</p>
                        ) : filteredApplications.map((application) => {
                            const isSelected = selectedApplicationId === application.id;

                            return (
                                <button
                                    key={application.id}
                                    type="button"
                                    onClick={() => handleSelectApplication(application)}
                                    className={`w-full rounded-sm border p-4 text-left transition-colors ${isSelected ? 'border-[#1C1C1C] bg-[#1C1C1C] text-[#EFECE8]' : 'border-[#1C1C1C]/10 bg-white hover:border-[#1C1C1C]/30'}`}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full border text-[10px] uppercase tracking-[0.2em] ${isSelected ? 'border-white/25 bg-white/10 text-white/82' : getStatusTone(application.status)}`}>{application.status}</span>
                                        <span className={`text-[10px] uppercase tracking-[0.2em] ${isSelected ? 'text-white/60' : 'text-[#1C1C1C]/42'}`}>{formatDate(application.created_at)}</span>
                                    </div>
                                    <p className={`mt-3 font-serif text-xl font-light leading-tight ${isSelected ? 'text-white' : 'text-[#1C1C1C]'}`}>{application.full_name || 'Unnamed applicant'}</p>
                                    <p className={`mt-2 text-xs leading-relaxed ${isSelected ? 'text-white/70' : 'text-[#1C1C1C]/58'}`}>{application.email || '-'}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="border border-[#1C1C1C]/10 bg-white/72 rounded-sm p-4 md:p-5 h-[40rem] md:h-[44rem] overflow-y-auto">
                    {!selectedApplication ? (
                        <p className="text-sm text-[#1C1C1C]/55">Select an application to review details.</p>
                    ) : (
                        <div className="flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Applicant</p>
                                    <p className="mt-2 font-serif text-2xl font-light leading-tight">{selectedApplication.full_name || '-'}</p>
                                    <p className="mt-2 text-sm text-[#1C1C1C]/65">{selectedApplication.email || '-'}</p>
                                    <p className="mt-1 text-sm text-[#1C1C1C]/55">{selectedApplication.phone || 'No phone shared'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Timeline</p>
                                    <p className="mt-2 text-sm text-[#1C1C1C]/62">Applied: {formatDate(selectedApplication.created_at)}</p>
                                    <p className="mt-1 text-sm text-[#1C1C1C]/62">Reviewed: {formatDate(selectedApplication.reviewed_at)}</p>
                                    {selectedApplication.affiliate_code ? <p className="mt-1 text-sm text-[#1C1C1C]/62">Assigned code: {selectedApplication.affiliate_code}</p> : null}
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Social Profiles</p>
                                {selectedSocialLinks.length === 0 ? (
                                    <p className="mt-2 text-sm text-[#1C1C1C]/55">No social profile links submitted.</p>
                                ) : (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedSocialLinks.map((socialLink) => (
                                            <a
                                                key={socialLink}
                                                href={socialLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#1C1C1C]/62 hover:text-[#1C1C1C]"
                                            >
                                                {getSocialButtonLabel(socialLink)}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/42">Motivation</p>
                                <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/68 whitespace-pre-wrap">{selectedApplication.motivation || 'No motivation shared.'}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                    Review status
                                    <select
                                        value={draftStatus}
                                        onChange={(event) => setDraftStatus(sanitizeStatus(event.target.value))}
                                        className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-xs tracking-[0.16em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                                    >
                                        {['pending', 'reviewing', 'approved', 'declined', 'archived'].map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                    Affiliate code on approval
                                    <select
                                        value={draftAffiliateCodeId}
                                        onChange={(event) => setDraftAffiliateCodeId(event.target.value)}
                                        className="h-12 border border-[#1C1C1C]/12 bg-white px-4 text-xs tracking-[0.08em] uppercase text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C]"
                                    >
                                        <option value="">Select affiliate code</option>
                                        {affiliateCodeOptions.map((option) => (
                                            <option key={option.id} value={option.id}>{`${option.code} / ${option.label}`}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/55">
                                Internal note
                                <textarea
                                    value={draftAdminNote}
                                    onChange={(event) => setDraftAdminNote(event.target.value)}
                                    rows={4}
                                    className="border border-[#1C1C1C]/12 bg-white px-4 py-3 text-sm normal-case tracking-normal text-[#1C1C1C] outline-none transition-colors focus:border-[#1C1C1C] resize-none"
                                />
                            </label>

                            <div className="mt-1 border-t border-[#1C1C1C]/10 pt-4">
                                {saveFeedback.message ? (
                                    <p className={`text-sm ${saveFeedback.type === 'error' ? 'text-red-600' : 'text-[#1C1C1C]/65'}`}>{saveFeedback.message}</p>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={handleStatusPatch}
                                    disabled={isSaving}
                                    className={`mt-2 h-12 w-full rounded-full bg-[#1C1C1C] px-6 text-[10px] uppercase tracking-[0.24em] text-[#EFECE8] transition-colors ${isSaving ? 'opacity-60' : 'hover:bg-black'}`}
                                >
                                    {isSaving ? 'Saving Review' : 'Save Review Update'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
