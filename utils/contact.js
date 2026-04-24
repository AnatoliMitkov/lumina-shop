import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/min';
import contactCountryLabels from './contact-country-labels';

export const defaultContactCountry = 'BG';

export const queryOptions = [
    'Bespoke Commission',
    'Order Support',
    'Styling Consultation',
    'Press / Collaboration',
    'Other',
];

const prioritizedCountries = ['BG', 'RO', 'GR', 'TR', 'IT', 'DE', 'GB', 'US'];

const featuredLocations = [
    'Ruse, Bulgaria',
    'Sofia, Bulgaria',
    'Varna, Bulgaria',
    'Plovdiv, Bulgaria',
    'Burgas, Bulgaria',
    'Veliko Tarnovo, Bulgaria',
    'Shumen, Bulgaria',
    'Pleven, Bulgaria',
    'Dobrich, Bulgaria',
    'Blagoevgrad, Bulgaria',
    'Bucharest, Romania',
    'Athens, Greece',
    'Istanbul, Turkey',
    'Milan, Italy',
    'Paris, France',
    'London, United Kingdom',
    'New York, United States',
    'Los Angeles, United States',
    'Dubai, United Arab Emirates',
    'Tokyo, Japan',
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
    return contactCountryLabels[country] || country;
}

const priorityRank = new Map(prioritizedCountries.map((country, index) => [country, index]));

export const countryPhoneOptions = getCountries()
    .map((country) => ({
        country,
        dialCode: `+${getCountryCallingCode(country)}`,
        label: getCountryLabel(country),
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

        return left.label.localeCompare(right.label, 'en');
    });

const countrySet = new Set(countryPhoneOptions.map((option) => option.country));

const phoneOptionsByLongestCode = [...countryPhoneOptions].sort((left, right) => right.dialCode.length - left.dialCode.length);

export const locationSuggestions = Array.from(
    new Set([...featuredLocations, ...countryPhoneOptions.map((option) => option.label)])
);

const featuredLocationRecords = featuredLocations.map((location) => {
    const [city = '', country = ''] = location.split(',').map((part) => part.trim());

    return {
        city,
        country,
        location,
    };
});

function normalizeCountryLabel(country) {
    const normalizedCountry = typeof country === 'string' ? country.trim() : '';

    if (!normalizedCountry) {
        return '';
    }

    if (countrySet.has(normalizedCountry.toUpperCase())) {
        return getCountryLabel(normalizedCountry.toUpperCase());
    }

    return normalizedCountry;
}

export function getLocationSuggestionsForCountry(country = '') {
    const normalizedCountry = normalizeCountryLabel(country).toLowerCase();
    const matchingLocations = normalizedCountry
        ? featuredLocationRecords.filter((record) => record.country.toLowerCase() === normalizedCountry)
        : featuredLocationRecords;
    const sourceLocations = matchingLocations.length > 0 ? matchingLocations : featuredLocationRecords;

    return Array.from(new Set(sourceLocations.map((record) => record.city).filter(Boolean)));
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

    const match = countryPhoneOptions.find((option) => normalizedLocation.includes(option.label.toLowerCase()));

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

export function getCountryPhoneOption(country) {
    return countryPhoneOptions.find((option) => option.country === country) || null;
}