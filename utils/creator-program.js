import { DEFAULT_LANGUAGE, normalizeLanguage } from './language';

export const CREATOR_PROGRAM_ROUTE = '/collaboration';
export const CREATOR_PROGRAM_BRAND_NAME = 'THE VA STORE';
export const CREATOR_PROGRAM_HASHTAG = '#thevastore';

export const CREATOR_PROGRAM_OFFER = {
    en: 'A performance-based creator partnership for THE VA STORE, built for premium avant-garde fashion, sharp brand visibility, and reusable editorial content.',
    bg: 'Партньорска програма за създатели с THE VA STORE, създадена за премиум авангардна мода, силно бранд присъствие и редакционно съдържание с повторна употреба.',
};

export const CREATOR_PROGRAM_DEADLINE = {
    en: 'Primary delivery window: within 7 days of receiving the approved order.',
    bg: 'Основен срок за изпълнение: до 7 дни след получаване на одобрената поръчка.',
};

export const CREATOR_PROGRAM_RIGHTS_STATEMENT = {
    en: 'I agree to the 7-day deadline, the content and tagging requirements, the raw-footage handoff, the hashtag requirement, and THE VA STORE rights to reuse my content for marketing, ads, website placement, and brand social media.',
    bg: 'Съгласявам се със 7-дневния срок, изискванията за съдържание и тагване, предаването на суровите файлове, задължителния хаштаг и правото на THE VA STORE да използва съдържанието ми за маркетинг, реклами, сайта и социалните си мрежи.',
};

export const CREATOR_PROGRAM_BENEFITS = [
    {
        key: 'creator_pricing',
        value: '70%',
        title: {
            en: 'Approved creator pricing',
            bg: 'Преференциална цена при одобрение',
        },
        copy: {
            en: 'Approved creators unlock 70% off eligible orders so the pieces can be styled, worn, and showcased properly.',
            bg: 'Одобрените профили получават 70% отстъпка за допустими поръчки, за да стилизират, носят и покажат моделите по правилния начин.',
        },
    },
    {
        key: 'performance_refund',
        value: '30%',
        title: {
            en: 'Performance refund upside',
            bg: 'Допълнително възстановяване при резултат',
        },
        copy: {
            en: 'After every deliverable is completed and the performance is strong, the remaining 30% can be refunded after review.',
            bg: 'След изпълнение на всички задачи и силно представяне, останалите 30% могат да бъдат възстановени след преглед.',
        },
    },
    {
        key: 'affiliate_commission',
        value: '7%',
        title: {
            en: 'Affiliate commission',
            bg: 'Affiliate комисиона',
        },
        copy: {
            en: 'Earn 7% commission on every completed order placed through your personal affiliate code.',
            bg: 'Получавате 7% комисиона от всяка завършена поръчка, направена с вашия личен affiliate code.',
        },
    },
    {
        key: 'audience_discount',
        value: '5%',
        title: {
            en: 'Audience discount value',
            bg: 'Отстъпка за аудиторията',
        },
        copy: {
            en: 'Your audience receives 5% off, and that code can stack with other eligible store discounts for a better final price.',
            bg: 'Вашата аудитория получава 5% отстъпка, а кодът може да се комбинира с други допустими промоции за още по-добра крайна цена.',
        },
    },
    {
        key: 'long_term',
        value: 'LT',
        title: {
            en: 'Long-term collaboration path',
            bg: 'Път към дългосрочно партньорство',
        },
        copy: {
            en: 'Strong execution opens the door to repeat sends, bigger campaigns, and long-term collaboration planning.',
            bg: 'Силното изпълнение отваря път към повторни изпращания, по-големи кампании и дългосрочно планиране заедно.',
        },
    },
];

export const CREATOR_PROGRAM_OBLIGATIONS = [
    {
        key: 'hero_video',
        title: {
            en: '1 premium video within 7 days',
            bg: '1 премиум видео до 7 дни',
        },
        copy: {
            en: 'Post one Reel, TikTok, Short, or equivalent video within 7 days of receiving the approved order. Minimum 1080p, 4K welcome, no watermarks, clean lighting, and a polished 2026 Instagramable / Pinterestable finish.',
            bg: 'Публикувайте един Reel, TikTok, Short или еквивалентно видео до 7 дни след получаване на одобрената поръчка. Минимум 1080p, 4K е добре дошло, без watermark, с чиста светлина и завършен 2026 Instagramable / Pinterestable вид.',
        },
    },
    {
        key: 'tag_and_collaborate',
        title: {
            en: 'Tag the brand and invite collaboration',
            bg: 'Тагнете бранда и поканете collaborator',
        },
        copy: {
            en: 'THE VA STORE must be tagged on the content, and on platforms that support it the brand must be invited as collaborator.',
            bg: 'THE VA STORE трябва да бъде тагнат в съдържанието, а в платформите, които го позволяват, брандът трябва да бъде поканен като collaborator.',
        },
    },
    {
        key: 'raw_footage_and_proof',
        title: {
            en: 'Send raw footage and proof',
            bg: 'Изпратете raw footage и доказателство',
        },
        copy: {
            en: 'Send the raw video footage together with proof of posting so the brand can reuse it for ads, the website, and social media.',
            bg: 'Изпратете суровите видео файлове заедно с доказателство за публикуване, за да може брандът да ги използва за реклами, сайта и социалните мрежи.',
        },
    },
    {
        key: 'story_sequence',
        title: {
            en: '3 consecutive story frames with link sticker',
            bg: '3 последователни stories със sticker link',
        },
        copy: {
            en: 'Upload three stories in a row featuring the product or the brand, each with a sticker link leading to the website or the specific product referenced.',
            bg: 'Качете три поредни stories с продукта или бранда, със sticker link към сайта или към конкретния продукт, който показвате.',
        },
    },
    {
        key: 'brand_hashtag',
        title: {
            en: 'Use the brand hashtag',
            bg: 'Използвайте бранд хаштага',
        },
        copy: {
            en: `Use the house hashtag ${CREATOR_PROGRAM_HASHTAG} in the relevant content package.`,
            bg: `Използвайте официалния хаштаг ${CREATOR_PROGRAM_HASHTAG} в съответния пакет съдържание.`,
        },
    },
];

export const CREATOR_PROGRAM_QUALITY_STANDARDS = [
    {
        key: 'resolution',
        label: {
            en: '1080p minimum, 4K welcome',
            bg: 'Минимум 1080p, 4K е добре дошло',
        },
    },
    {
        key: 'no_watermarks',
        label: {
            en: 'No watermarks or third-party branding',
            bg: 'Без watermark или чужд branding',
        },
    },
    {
        key: 'lighting',
        label: {
            en: 'Good lighting and aesthetically pleasing setting',
            bg: 'Добра светлина и естетична среда',
        },
    },
    {
        key: 'product_visibility',
        label: {
            en: 'Clear product visibility, silhouette, and styling',
            bg: 'Ясна видимост на продукта, силуета и стилинга',
        },
    },
    {
        key: 'editorial_finish',
        label: {
            en: 'Visually sharp, 2026 Instagramable / Pinterestable finish',
            bg: 'Визуално силен 2026 Instagramable / Pinterestable завършек',
        },
    },
    {
        key: 'reuse_ready',
        label: {
            en: 'Suitable for organic reuse, ads, and website placement',
            bg: 'Подходящо за organic reuse, ads и позициониране в сайта',
        },
    },
];

function toText(value, maxLength = 500) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().slice(0, maxLength);
}

function toTextList(values, maxLength = 500) {
    if (!Array.isArray(values)) {
        return [];
    }

    return values.map((value) => toText(value, maxLength));
}

export function getCreatorProgramText(language, englishValue, bulgarianValue) {
    return (normalizeLanguage(language) || DEFAULT_LANGUAGE) === 'bg' ? bulgarianValue : englishValue;
}

export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidCreatorProfileUrl(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return false;
        }
        const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
        // Accept any public profile URL: Instagram, TikTok, YouTube, X, Reddit, ArtStation,
        // personal sites, etc. The team reviews each link manually before opening it.
        return hostname.includes('.') && hostname.length > 3;
    } catch {
        return false;
    }
}

export function normalizeCreatorApplicationPayload(payload = {}) {
    const socialLinks = Array.isArray(payload?.socialLinks) && payload.socialLinks.length > 0
        ? toTextList(payload.socialLinks, 240)
        : [toText(payload?.profileUrl, 240)];
    const populatedSocialLinks = socialLinks.filter(Boolean);

    return {
        fullName: toText(payload?.fullName, 140),
        email: toText(payload?.email, 180).toLowerCase(),
        phone: toText(payload?.phone, 60),
        socialLinks,
        profileUrl: populatedSocialLinks[0] || '',
        motivation: toText(payload?.motivation, 2400),
        agreedToTerms: Boolean(payload?.agreedToTerms),
    };
}

export function validateCreatorApplicationPayload(payload, { language = DEFAULT_LANGUAGE } = {}) {
    const normalized = normalizeCreatorApplicationPayload(payload);
    const errors = {};

    if (!normalized.fullName) {
        errors.fullName = getCreatorProgramText(language, 'Please enter your full name.', 'Моля, въведете име и фамилия.');
    }

    if (!normalized.email) {
        errors.email = getCreatorProgramText(language, 'Please enter your email address.', 'Моля, въведете имейл адрес.');
    } else if (!isValidEmail(normalized.email)) {
        errors.email = getCreatorProgramText(language, 'Please enter a valid email address.', 'Моля, въведете валиден имейл адрес.');
    }

    if (!normalized.socialLinks.length || !normalized.socialLinks[0]) {
        errors.socialLinks = [getCreatorProgramText(language, 'Please add at least one social profile link.', 'Моля, добавете поне един линк към социален профил.')];
    } else {
        const socialLinkErrors = normalized.socialLinks.map((socialLink) => {
            if (!socialLink) {
                return getCreatorProgramText(language, 'This social profile link is required.', 'Този линк към социален профил е задължителен.');
            }

            if (!isValidCreatorProfileUrl(socialLink)) {
                return getCreatorProgramText(language, 'Please paste a full link starting with https://', 'Моля, поставете пълен линк, започващ с https://');
            }

            return '';
        });

        if (socialLinkErrors.some(Boolean)) {
            errors.socialLinks = socialLinkErrors;
        }
    }

    if (!normalized.motivation) {
        errors.motivation = getCreatorProgramText(language, 'Tell us why you want to collaborate with THE VA STORE.', 'Разкажете ни защо искате да работите с THE VA STORE.');
    } else if (normalized.motivation.length < 30) {
        errors.motivation = getCreatorProgramText(language, 'Please add a bit more detail so the team can review your fit.', 'Добавете малко повече детайл, за да може екипът да прецени профила ви.');
    }

    if (!normalized.agreedToTerms) {
        errors.agreedToTerms = getCreatorProgramText(language, 'You need to accept the terms before applying.', 'Трябва да приемете условията, преди да кандидатствате.');
    }

    return {
        normalized: {
            ...normalized,
            socialLinks: normalized.socialLinks.filter(Boolean),
            profileUrl: normalized.socialLinks.filter(Boolean)[0] || '',
        },
        errors,
        isValid: Object.keys(errors).length === 0,
    };
}

export function firstCreatorApplicationError(errors = {}) {
    const queue = [...Object.values(errors)];

    while (queue.length > 0) {
        const currentValue = queue.shift();

        if (typeof currentValue === 'string' && currentValue) {
            return currentValue;
        }

        if (Array.isArray(currentValue)) {
            queue.push(...currentValue);
            continue;
        }

        if (currentValue && typeof currentValue === 'object') {
            queue.push(...Object.values(currentValue));
        }
    }

    return '';
}

export function buildCreatorApplicationInsert(payload, { userId = null } = {}) {
    return {
        user_id: userId,
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone || null,
        profile_url: payload.profileUrl,
        social_links: payload.socialLinks,
        motivation: payload.motivation,
        terms_accepted: payload.agreedToTerms,
        status: 'pending',
    };
}

export function isMissingCreatorApplicationsTableError(error) {
    const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

    return error?.code === '42P01'
        || error?.code === 'PGRST204'
        || error?.code === 'PGRST205'
        || message.includes('creator_applications');
}