export const ADMIN_ATTENTION_STATUS_OPTIONS = [
    { value: 'unseen', label: 'Unseen' },
    { value: 'reviewing', label: 'Reviewing' },
    { value: 'seen', label: 'Seen' },
];

const ATTENTION_META = {
    unseen: {
        label: 'Unseen',
        copy: 'Waiting for a first look from the atelier.',
        lightClassName: 'border-red-200 bg-red-50 text-red-700',
        darkClassName: 'border-red-300/25 bg-red-400/10 text-red-100',
        dotClassName: 'bg-red-500',
    },
    reviewing: {
        label: 'Reviewing',
        copy: 'Opened and currently under review.',
        lightClassName: 'border-amber-200 bg-amber-50 text-amber-700',
        darkClassName: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
        dotClassName: 'bg-amber-500',
    },
    seen: {
        label: 'Seen',
        copy: 'Reviewed and acknowledged by the atelier.',
        lightClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        darkClassName: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
        dotClassName: 'bg-emerald-500',
    },
};

export function normalizeAdminAttentionStatus(value) {
    const normalizedValue = String(value || '').trim().toLowerCase();

    return ATTENTION_META[normalizedValue] ? normalizedValue : 'unseen';
}

export function getAdminAttentionMeta(value) {
    return ATTENTION_META[normalizeAdminAttentionStatus(value)];
}

export function countAdminAttentionItems(items = []) {
    return items.reduce((counts, item) => {
        const status = normalizeAdminAttentionStatus(item?.admin_attention_status);

        return {
            ...counts,
            [status]: counts[status] + 1,
        };
    }, {
        unseen: 0,
        reviewing: 0,
        seen: 0,
    });
}