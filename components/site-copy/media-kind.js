const IMAGE_EXTENSIONS = new Set(['apng', 'avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'webp']);
const VIDEO_EXTENSIONS = new Set(['m4v', 'mov', 'mp4', 'mpeg', 'mpg', 'ogv', 'webm']);

function normalizeSource(source = '') {
    return typeof source === 'string' ? source.trim() : '';
}

function extractDataKind(source = '') {
    const match = normalizeSource(source).match(/^data:(image|video)\//i);
    return match ? match[1].toLowerCase() : '';
}

function extractExtension(source = '') {
    const normalizedSource = normalizeSource(source);

    if (!normalizedSource) {
        return '';
    }

    try {
        const parsedUrl = new URL(normalizedSource, 'https://stylingbyva.com');
        const pathname = parsedUrl.pathname || '';
        const segments = pathname.split('.');

        return segments.length > 1 ? segments.pop().toLowerCase() : '';
    } catch {
        const sanitizedSource = normalizedSource.split('?')[0].split('#')[0];
        const segments = sanitizedSource.split('.');

        return segments.length > 1 ? segments.pop().toLowerCase() : '';
    }
}

export function detectEditableMediaKind(source = '', fallbackKind = 'image') {
    const dataKind = extractDataKind(source);

    if (dataKind === 'image' || dataKind === 'video') {
        return dataKind;
    }

    const extension = extractExtension(source);

    if (VIDEO_EXTENSIONS.has(extension)) {
        return 'video';
    }

    if (IMAGE_EXTENSIONS.has(extension)) {
        return 'image';
    }

    return fallbackKind === 'video' ? 'video' : 'image';
}