export function isSiteCopySetupError(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === '42703'
        || error?.code === 'PGRST204'
        || error?.code === 'PGRST205'
        || message.toLowerCase().includes('site_copy_entries')
        || message.toLowerCase().includes('schema cache');
}

const DEFAULT_MEDIA_POSITION = Object.freeze({ x: 50, y: 50 });
const DEFAULT_MEDIA_SETTINGS = Object.freeze({
    fitDesktop: 'cover',
    fitMobile: 'cover',
    positionDesktop: DEFAULT_MEDIA_POSITION,
    positionMobile: DEFAULT_MEDIA_POSITION,
    scaleDesktop: 1,
    scaleMobile: 1,
});

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value, fallback = '') {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (value == null) {
        return fallback;
    }

    return String(value).trim() || fallback;
}

function parsePossibleJsonObject(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();

    if (!normalizedValue.startsWith('{') || !normalizedValue.endsWith('}')) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(normalizedValue);
        return isPlainObject(parsedValue) ? parsedValue : null;
    } catch {
        return null;
    }
}

function clampNumber(value, minValue, maxValue, fallbackValue) {
    const parsedValue = Number.parseFloat(String(value ?? ''));

    if (!Number.isFinite(parsedValue)) {
        return fallbackValue;
    }

    return Math.min(Math.max(parsedValue, minValue), maxValue);
}

function normalizeMediaFit(value, fallbackValue = 'cover') {
    return value === 'contain' ? 'contain' : fallbackValue;
}

function normalizeMediaPosition(value, fallbackValue = DEFAULT_MEDIA_POSITION) {
    const fallbackPosition = isPlainObject(fallbackValue) ? fallbackValue : DEFAULT_MEDIA_POSITION;

    if (!isPlainObject(value)) {
        return {
            x: clampNumber(fallbackPosition.x, 0, 100, DEFAULT_MEDIA_POSITION.x),
            y: clampNumber(fallbackPosition.y, 0, 100, DEFAULT_MEDIA_POSITION.y),
        };
    }

    return {
        x: clampNumber(value.x, 0, 100, clampNumber(fallbackPosition.x, 0, 100, DEFAULT_MEDIA_POSITION.x)),
        y: clampNumber(value.y, 0, 100, clampNumber(fallbackPosition.y, 0, 100, DEFAULT_MEDIA_POSITION.y)),
    };
}

function normalizeMediaScale(value, fallbackValue = 1) {
    return clampNumber(value, 0.6, 2.4, fallbackValue);
}

export function createDefaultMediaSettings(overrides = {}) {
    const sourceSettings = isPlainObject(overrides) ? overrides : {};

    return {
        fitDesktop: normalizeMediaFit(sourceSettings.fitDesktop, DEFAULT_MEDIA_SETTINGS.fitDesktop),
        fitMobile: normalizeMediaFit(sourceSettings.fitMobile, sourceSettings.fitDesktop || DEFAULT_MEDIA_SETTINGS.fitMobile),
        positionDesktop: normalizeMediaPosition(sourceSettings.positionDesktop, DEFAULT_MEDIA_SETTINGS.positionDesktop),
        positionMobile: normalizeMediaPosition(sourceSettings.positionMobile, sourceSettings.positionDesktop || DEFAULT_MEDIA_SETTINGS.positionMobile),
        scaleDesktop: normalizeMediaScale(sourceSettings.scaleDesktop, DEFAULT_MEDIA_SETTINGS.scaleDesktop),
        scaleMobile: normalizeMediaScale(sourceSettings.scaleMobile, sourceSettings.scaleDesktop || DEFAULT_MEDIA_SETTINGS.scaleMobile),
    };
}

export function resolveSiteCopyMediaEntry(value, fallbackSource = '', defaultSettings = {}) {
    const normalizedFallbackSource = toTrimmedString(fallbackSource);
    const parsedValue = isPlainObject(value) ? value : parsePossibleJsonObject(value);
    const normalizedDefaults = createDefaultMediaSettings(defaultSettings);
    const normalizedSource = parsedValue
        ? toTrimmedString(parsedValue.src, normalizedFallbackSource)
        : toTrimmedString(value, normalizedFallbackSource);

    return {
        src: normalizedSource || normalizedFallbackSource,
        ...createDefaultMediaSettings({
            ...normalizedDefaults,
            ...(parsedValue || {}),
        }),
    };
}

export function serializeSiteCopyMediaEntry(value, defaultSettings = {}) {
    return JSON.stringify(resolveSiteCopyMediaEntry(value, '', defaultSettings));
}

function buildViewportMediaStyleInternal(config, viewport) {
    const isMobileViewport = viewport === 'mobile';
    const fit = isMobileViewport ? config.fitMobile : config.fitDesktop;
    const position = isMobileViewport ? config.positionMobile : config.positionDesktop;
    const scale = isMobileViewport ? config.scaleMobile : config.scaleDesktop;
    const positionX = `${position.x}%`;
    const positionY = `${position.y}%`;

    return {
        objectFit: fit,
        objectPosition: `${positionX} ${positionY}`,
        transform: `scale(${scale})`,
        transformOrigin: `${positionX} ${positionY}`,
    };
}

export function buildResponsiveMediaStyle(config = {}) {
    const normalizedConfig = resolveSiteCopyMediaEntry(config);

    return {
        '--editable-media-fit-desktop': normalizedConfig.fitDesktop,
        '--editable-media-fit-mobile': normalizedConfig.fitMobile,
        '--editable-media-position-desktop-x': `${normalizedConfig.positionDesktop.x}%`,
        '--editable-media-position-desktop-y': `${normalizedConfig.positionDesktop.y}%`,
        '--editable-media-position-mobile-x': `${normalizedConfig.positionMobile.x}%`,
        '--editable-media-position-mobile-y': `${normalizedConfig.positionMobile.y}%`,
        '--editable-media-scale-desktop': String(normalizedConfig.scaleDesktop),
        '--editable-media-scale-mobile': String(normalizedConfig.scaleMobile),
    };
}

export function buildViewportMediaLayoutStyle(config = {}, viewport = 'desktop') {
    const { objectFit, objectPosition } = buildViewportMediaStyleInternal(resolveSiteCopyMediaEntry(config), viewport);

    return { objectFit, objectPosition };
}

export function buildViewportMediaTransformStyle(config = {}, viewport = 'desktop') {
    const { transform, transformOrigin } = buildViewportMediaStyleInternal(resolveSiteCopyMediaEntry(config), viewport);

    return { transform, transformOrigin };
}

export function toSiteCopyMap(entries = []) {
    return Object.fromEntries(
        (entries || [])
            .filter((entry) => typeof entry?.key === 'string')
            .map((entry) => [entry.key, typeof entry?.value === 'string' ? entry.value : ''])
    );
}