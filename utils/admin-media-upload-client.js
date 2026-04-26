export const ADMIN_MEDIA_UPLOAD_BUCKETS = Object.freeze({
    homePage: 'Home Page Optimized',
    storefront: 'Storefront Optimized',
});

function toText(value, fallback = '') {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (value == null) {
        return fallback;
    }

    return String(value).trim() || fallback;
}

export async function uploadAdminMedia({ file, bucket, folder, subfolder, baseName, imageMaxEdge }) {
    if (!(file instanceof File)) {
        throw new Error('A file is required for upload.');
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('bucket', bucket);
    uploadFormData.append('folder', folder);
    uploadFormData.append('baseName', baseName);

    if (toText(subfolder)) {
        uploadFormData.append('subfolder', subfolder);
    }

    if (Number.isFinite(Number(imageMaxEdge))) {
        uploadFormData.append('imageMaxEdge', String(imageMaxEdge));
    }

    const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: uploadFormData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Unable to upload this media file right now.');
    }

    if (!toText(data.url)) {
        throw new Error('Upload finished, but the public URL could not be resolved.');
    }

    return data;
}

export function resolveSiteCopyUploadBucket(key = '') {
    return toText(key).startsWith('home.')
        ? ADMIN_MEDIA_UPLOAD_BUCKETS.homePage
        : ADMIN_MEDIA_UPLOAD_BUCKETS.storefront;
}

export function resolveSiteCopyImageMaxEdge(key = '') {
    const normalizedKey = toText(key).toLowerCase();

    if (normalizedKey.startsWith('home.hero') || normalizedKey.startsWith('home.brand') || normalizedKey.includes('collection-media')) {
        return 2200;
    }

    if (normalizedKey.includes('category_showcase')) {
        return 1600;
    }

    return 1800;
}