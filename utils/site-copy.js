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

export const SITE_COPY_RICH_TEXT_KIND = 'site-copy-rich-text-v1';

export const SITE_COPY_RICH_TEXT_BLOCK_TYPE_OPTIONS = Object.freeze([
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'heading1', label: 'H1' },
    { value: 'heading2', label: 'H2' },
    { value: 'heading3', label: 'H3' },
    { value: 'quote', label: 'Quote' },
    { value: 'bullet-list', label: 'Bullet List' },
    { value: 'numbered-list', label: 'Numbered List' },
]);

export const SITE_COPY_RICH_TEXT_SIZE_OPTIONS = Object.freeze([
    { value: 'xs', label: 'XS' },
    { value: 'sm', label: 'SM' },
    { value: 'body', label: 'Body' },
    { value: 'lg', label: 'LG' },
    { value: 'xl', label: 'XL' },
    { value: 'display', label: 'Display' },
]);

export const SITE_COPY_RICH_TEXT_ALIGN_OPTIONS = Object.freeze([
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
    { value: 'justify', label: 'Justify' },
]);

export const SITE_COPY_RICH_TEXT_COLOR_SWATCHES = Object.freeze([
    '#EFECE8',
    '#FFFFFF',
    '#D9CBB9',
    '#D7B56D',
    '#A78B65',
    '#7F8EA3',
    '#5C4B43',
    '#1C1C1C',
]);

const RICH_TEXT_BLOCK_TYPES = new Set(SITE_COPY_RICH_TEXT_BLOCK_TYPE_OPTIONS.map((option) => option.value));
const RICH_TEXT_SIZE_VALUES = new Set(SITE_COPY_RICH_TEXT_SIZE_OPTIONS.map((option) => option.value));
const RICH_TEXT_ALIGN_VALUES = new Set(SITE_COPY_RICH_TEXT_ALIGN_OPTIONS.map((option) => option.value));
const RICH_TEXT_TYPE_DEFAULT_SIZES = Object.freeze({
    paragraph: 'body',
    heading1: 'display',
    heading2: 'xl',
    heading3: 'lg',
    quote: 'lg',
    'bullet-list': 'body',
    'numbered-list': 'body',
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

function normalizeRichTextType(value) {
    return RICH_TEXT_BLOCK_TYPES.has(value) ? value : 'paragraph';
}

function normalizeRichTextSize(value, type = 'paragraph') {
    if (RICH_TEXT_SIZE_VALUES.has(value)) {
        return value;
    }

    return RICH_TEXT_TYPE_DEFAULT_SIZES[normalizeRichTextType(type)] || 'body';
}

function normalizeRichTextAlign(value) {
    return RICH_TEXT_ALIGN_VALUES.has(value) ? value : 'left';
}

function normalizeRichTextColor(value) {
    const normalizedValue = toTrimmedString(value);

    if (!normalizedValue) {
        return '';
    }

    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalizedValue) ? normalizedValue : '';
}

function normalizeRichTextText(value) {
    if (typeof value === 'string') {
        return value.replace(/\r\n?/g, '\n').trimEnd();
    }

    if (value == null) {
        return '';
    }

    return String(value).replace(/\r\n?/g, '\n').trimEnd();
}

function normalizeRichTextBoolean(value) {
    return value === true;
}

function normalizeRichTextBlockId(value, index = 0) {
    const normalizedValue = toTrimmedString(value);
    return normalizedValue || `block-${index + 1}`;
}

function parseSiteCopyRichTextDocument(value) {
    const parsedValue = isPlainObject(value) ? value : parsePossibleJsonObject(value);

    if (!isPlainObject(parsedValue) || parsedValue.kind !== SITE_COPY_RICH_TEXT_KIND) {
        return null;
    }

    return createSiteCopyRichTextDocument(parsedValue.blocks);
}

function normalizeRichTextFallback(fallback) {
    const parsedDocument = parseSiteCopyRichTextDocument(fallback);

    if (parsedDocument) {
        return parsedDocument;
    }

    if (isPlainObject(fallback) && Array.isArray(fallback.blocks)) {
        return createSiteCopyRichTextDocument(fallback.blocks);
    }

    if (Array.isArray(fallback)) {
        return createSiteCopyRichTextDocument(fallback);
    }

    if (typeof fallback === 'string' && fallback.trim()) {
        return createSiteCopyRichTextDocument([{ text: fallback }]);
    }

    return createSiteCopyRichTextDocument();
}

export function createSiteCopyRichTextBlock(overrides = {}, index = 0) {
    const type = normalizeRichTextType(overrides.type);

    return {
        id: normalizeRichTextBlockId(overrides.id, index),
        type,
        text: normalizeRichTextText(overrides.text),
        align: normalizeRichTextAlign(overrides.align),
        size: normalizeRichTextSize(overrides.size, type),
        color: normalizeRichTextColor(overrides.color),
        bold: normalizeRichTextBoolean(overrides.bold),
        italic: normalizeRichTextBoolean(overrides.italic),
        underline: normalizeRichTextBoolean(overrides.underline),
    };
}

export function createSiteCopyRichTextDocument(blocks = [{}]) {
    const sourceBlocks = Array.isArray(blocks) && blocks.length > 0 ? blocks : [{}];

    return {
        kind: SITE_COPY_RICH_TEXT_KIND,
        version: 1,
        blocks: sourceBlocks.map((block, index) => createSiteCopyRichTextBlock(block, index)),
    };
}

export function isSiteCopyRichTextValue(value) {
    return Boolean(parseSiteCopyRichTextDocument(value));
}

export function resolveSiteCopyRichTextEntry(value, fallback = '') {
    const fallbackDocument = normalizeRichTextFallback(fallback);
    const parsedDocument = parseSiteCopyRichTextDocument(value);

    if (parsedDocument) {
        return parsedDocument;
    }

    if (typeof value === 'string' && value.trim()) {
        const seedBlock = fallbackDocument.blocks[0] || createSiteCopyRichTextBlock();

        return createSiteCopyRichTextDocument([
            {
                ...seedBlock,
                text: normalizeRichTextText(value),
            },
        ]);
    }

    return fallbackDocument;
}

export function serializeSiteCopyRichTextEntry(value, fallback = '') {
    return JSON.stringify(resolveSiteCopyRichTextEntry(value, fallback));
}

export function extractSiteCopyPlainText(value, fallback = '') {
    const parsedDocument = parseSiteCopyRichTextDocument(value);

    if (!parsedDocument) {
        return typeof value === 'string' ? value : fallback;
    }

    const flattenedText = parsedDocument.blocks
        .map((block) => normalizeRichTextText(block.text))
        .filter(Boolean)
        .join('\n\n');

    return flattenedText || fallback;
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