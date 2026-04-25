import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/min';
import contactCountryLabels from './contact-country-labels';
import contactCountryLabelsBg from './contact-country-labels-bg';
import { createLocalizedValue as localizedValue, DEFAULT_LANGUAGE, normalizeLanguage, resolveLocalizedValue } from './language';

export const defaultContactCountry = 'BG';

export const queryOptions = [
    'Bespoke Commission',
    'Order Support',
    'Styling Consultation',
    'Press / Collaboration',
    'Other',
];

const prioritizedCountries = ['BG', 'RO', 'GR', 'TR', 'IT', 'DE', 'GB', 'US'];

const featuredLocationRecords = [
    { city: localizedValue('Ruse', 'Русе'), country: 'BG' },
    { city: localizedValue('Sofia', 'София'), country: 'BG' },
    { city: localizedValue('Varna', 'Варна'), country: 'BG' },
    { city: localizedValue('Plovdiv', 'Пловдив'), country: 'BG' },
    { city: localizedValue('Burgas', 'Бургас'), country: 'BG' },
    { city: localizedValue('Veliko Tarnovo', 'Велико Търново'), country: 'BG' },
    { city: localizedValue('Shumen', 'Шумен'), country: 'BG' },
    { city: localizedValue('Pleven', 'Плевен'), country: 'BG' },
    { city: localizedValue('Dobrich', 'Добрич'), country: 'BG' },
    { city: localizedValue('Blagoevgrad', 'Благоевград'), country: 'BG' },
    { city: localizedValue('Bucharest', 'Букурещ'), country: 'RO' },
    { city: localizedValue('Athens', 'Атина'), country: 'GR' },
    { city: localizedValue('Istanbul', 'Истанбул'), country: 'TR' },
    { city: localizedValue('Milan', 'Милано'), country: 'IT' },
    { city: localizedValue('Paris', 'Париж'), country: 'FR' },
    { city: localizedValue('London', 'Лондон'), country: 'GB' },
    { city: localizedValue('New York', 'Ню Йорк'), country: 'US' },
    { city: localizedValue('Los Angeles', 'Лос Анджелис'), country: 'US' },
    { city: localizedValue('Dubai', 'Дубай'), country: 'AE' },
    { city: localizedValue('Tokyo', 'Токио'), country: 'JP' },
];

const timeZoneCountryMap = {
    'Europe/Sofia': 'BG',
    'Europe/Bucharest': 'RO',
    'Europe/Athens': 'GR',
    'Europe/Istanbul': 'TR',
    'Europe/Rome': 'IT',
    'Europe/Berlin': 'DE',
    'Europe/London': 'GB',
    'America/New_York': 'US',
    'America/Los_Angeles': 'US',
    'Asia/Dubai': 'AE',
    'Asia/Tokyo': 'JP',
};

function getCountryLabel(country) {
    const normalizedCountry = typeof country === 'string' ? country.trim().toUpperCase() : '';

    if (!normalizedCountry) {
        return '';
    }

    return contactCountryLabels[normalizedCountry] || normalizedCountry;
}

const priorityRank = new Map(prioritizedCountries.map((country, index) => [country, index]));

const baseCountryPhoneOptions = getCountries().map((country) => ({
    country,
    dialCode: `+${getCountryCallingCode(country)}`,
}));

const countrySet = new Set(baseCountryPhoneOptions.map((option) => option.country));
const countryPhoneOptionsCache = new Map();
const phoneOptionsByLongestCode = [...baseCountryPhoneOptions].sort((left, right) => right.dialCode.length - left.dialCode.length);

function getSortLocale(language = DEFAULT_LANGUAGE) {
    const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

    return normalizedLanguage === 'bg' ? 'bg' : 'en';
}

export function getLocalizedCountryLabel(country, language = DEFAULT_LANGUAGE) {
    const normalizedCountry = typeof country === 'string' ? country.trim().toUpperCase() : '';
    const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

    if (!normalizedCountry) {
        return '';
    }

    if (normalizedLanguage === 'bg') {
        return contactCountryLabelsBg[normalizedCountry] || getCountryLabel(normalizedCountry);
    }

    return getCountryLabel(normalizedCountry);
}

function getCountryLabelCandidates(country) {
    return Array.from(new Set(
        [country, contactCountryLabels[country], contactCountryLabelsBg[country]]
            .filter((label) => typeof label === 'string' && label.trim())
            .map((label) => label.trim())
    ));
}

function buildCountryPhoneOptions(language = DEFAULT_LANGUAGE) {
    const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

    return baseCountryPhoneOptions
        .map((option) => ({
            ...option,
            label: getLocalizedCountryLabel(option.country, normalizedLanguage),
        }))
        .sort((left, right) => {
            const leftPriority = priorityRank.get(left.country);
            const rightPriority = priorityRank.get(right.country);

            if (leftPriority !== undefined || rightPriority !== undefined) {
                if (leftPriority === undefined) {
                    return 1;
                }

                if (rightPriority === undefined) {
                    return -1;
                }

                return leftPriority - rightPriority;
            }

            return left.label.localeCompare(right.label, getSortLocale(normalizedLanguage));
        });
}

export function getCountryPhoneOptions(language = DEFAULT_LANGUAGE) {
    const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

    if (!countryPhoneOptionsCache.has(normalizedLanguage)) {
        countryPhoneOptionsCache.set(normalizedLanguage, buildCountryPhoneOptions(normalizedLanguage));
    }

    return countryPhoneOptionsCache.get(normalizedLanguage);
}

export const countryPhoneOptions = getCountryPhoneOptions(DEFAULT_LANGUAGE);

function formatFeaturedLocation(record, language = DEFAULT_LANGUAGE) {
    return `${resolveLocalizedValue(record.city, language)}, ${getLocalizedCountryLabel(record.country, language)}`;
}

export function getLocationSuggestions(language = DEFAULT_LANGUAGE) {
    return Array.from(
        new Set([
            ...featuredLocationRecords.map((record) => formatFeaturedLocation(record, language)),
            ...getCountryPhoneOptions(language).map((option) => option.label),
        ])
    );
}

export const locationSuggestions = getLocationSuggestions(DEFAULT_LANGUAGE);

function resolveCountryCode(country = '') {
    const normalizedCountry = typeof country === 'string' ? country.trim() : '';

    if (!normalizedCountry) {
        return '';
    }

    const upperCaseCountry = normalizedCountry.toUpperCase();

    if (countrySet.has(upperCaseCountry)) {
        return upperCaseCountry;
    }

    const lowerCaseCountry = normalizedCountry.toLowerCase();
    const exactMatch = baseCountryPhoneOptions.find((option) => (
        getCountryLabelCandidates(option.country).some((label) => label.toLowerCase() === lowerCaseCountry)
    ));

    if (exactMatch) {
        return exactMatch.country;
    }

    const partialMatch = baseCountryPhoneOptions.find((option) => (
        getCountryLabelCandidates(option.country).some((label) => lowerCaseCountry.includes(label.toLowerCase()))
    ));

    return partialMatch?.country || '';
}

export function getLocationSuggestionsForCountry(country = '', language = DEFAULT_LANGUAGE) {
    const resolvedCountry = resolveCountryCode(country);
    const matchingLocations = resolvedCountry
        ? featuredLocationRecords.filter((record) => record.country === resolvedCountry)
        : featuredLocationRecords;
    const sourceLocations = matchingLocations.length > 0 ? matchingLocations : featuredLocationRecords;

    return Array.from(new Set(sourceLocations.map((record) => resolveLocalizedValue(record.city, language)).filter(Boolean)));
}

export function detectCountryFromLocale(locale) {
    if (!locale) {
        return '';
    }

    const directRegion = locale
        .split(/[-_]/)
        .map((part) => part.toUpperCase())
        .find((part) => countrySet.has(part));

    if (directRegion) {
        return directRegion;
    }

    try {
        const maximizedLocale = new Intl.Locale(locale).maximize();

        if (maximizedLocale.region && countrySet.has(maximizedLocale.region)) {
            return maximizedLocale.region;
        }
    } catch {
        return '';
    }

    return '';
}

export function resolveUserCountry({ locales = [], timeZone = '' } = {}) {
    for (const locale of locales) {
        const country = detectCountryFromLocale(locale);

        if (country) {
            return country;
        }
    }

    return timeZoneCountryMap[timeZone] || '';
}

export function detectCountryFromLocationText(location) {
    const normalizedLocation = typeof location === 'string' ? location.toLowerCase() : '';

    if (!normalizedLocation) {
        return '';
    }

    const match = baseCountryPhoneOptions.find((option) => (
        getCountryLabelCandidates(option.country).some((label) => normalizedLocation.includes(label.toLowerCase()))
    ));

    return match?.country || '';
}

export function splitStoredPhoneNumber(phone) {
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!trimmedPhone) {
        return { country: '', dialCode: '', nationalNumber: '' };
    }

    const normalizedPhone = trimmedPhone
        .replace(/^00/, '+')
        .replace(/(?!^\+)[^\d]/g, '');

    if (!normalizedPhone.startsWith('+')) {
        return { country: '', dialCode: '', nationalNumber: trimmedPhone };
    }

    const matchingOption = phoneOptionsByLongestCode.find((option) => normalizedPhone.startsWith(option.dialCode));

    if (!matchingOption) {
        return { country: '', dialCode: '', nationalNumber: normalizedPhone.replace(/^\+/, '') };
    }

    return {
        country: matchingOption.country,
        dialCode: matchingOption.dialCode,
        nationalNumber: normalizedPhone.slice(matchingOption.dialCode.length).trim(),
    };
}

export function buildPhoneValue(dialCode, phoneNumber) {
    const normalizedDialCode = typeof dialCode === 'string' ? dialCode.trim() : '';
    const normalizedPhoneNumber = typeof phoneNumber === 'string'
        ? phoneNumber.replace(/[^\d\s().-]/g, '').trim()
        : '';

    return [normalizedDialCode, normalizedPhoneNumber].filter(Boolean).join(' ').trim();
}

export function validatePhoneNumber(phone) {
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!trimmedPhone) {
        return { isValid: false, normalized: '', country: '', dialCode: '' };
    }

    try {
        const parsedPhone = parsePhoneNumberFromString(trimmedPhone);

        if (parsedPhone && parsedPhone.isPossible()) {
            return {
                isValid: true,
                normalized: parsedPhone.number,
                country: parsedPhone.country || '',
                dialCode: parsedPhone.countryCallingCode ? `+${parsedPhone.countryCallingCode}` : '',
            };
        }
    } catch {
        // Fall through to the digit-length guard.
    }

    const digitsOnly = trimmedPhone.replace(/\D/g, '');

    return {
        isValid: digitsOnly.length >= 6 && digitsOnly.length <= 15,
        normalized: trimmedPhone,
        country: '',
        dialCode: '',
    };
}

export function getCountryPhoneOption(country, language = DEFAULT_LANGUAGE) {
    return getCountryPhoneOptions(language).find((option) => option.country === country) || null;
}