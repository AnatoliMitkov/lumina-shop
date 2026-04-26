import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { createClient } from '../../../../../utils/supabase/server';
import { createAdminClient, isAdminConfigured } from '../../../../../utils/supabase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_BUCKETS = new Set(['Home Page Optimized', 'Storefront Optimized']);
const ALLOWED_FOLDERS = new Set(['products', 'site-copy']);
const DEFAULT_IMAGE_MAX_EDGE = 2000;
const MIN_IMAGE_MAX_EDGE = 1200;
const MAX_IMAGE_MAX_EDGE = 2600;
const IMAGE_QUALITY = 82;

function toText(value, fallback = '') {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (value == null) {
        return fallback;
    }

    return String(value).trim() || fallback;
}

function slugify(value, fallback = 'asset') {
    const normalizedValue = toText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalizedValue || fallback;
}

function clampImageMaxEdge(value) {
    const parsedValue = Number.parseInt(String(value ?? ''), 10);

    if (!Number.isFinite(parsedValue)) {
        return DEFAULT_IMAGE_MAX_EDGE;
    }

    return Math.min(Math.max(parsedValue, MIN_IMAGE_MAX_EDGE), MAX_IMAGE_MAX_EDGE);
}

function normalizeFileExtension(file) {
    const nameExtension = file?.name?.split('.').pop()?.toLowerCase();

    if (nameExtension) {
        return nameExtension;
    }

    if (typeof file?.type === 'string' && file.type.includes('/')) {
        return file.type.split('/').pop()?.toLowerCase() || '';
    }

    return '';
}

function buildReadableTimestamp() {
    const now = new Date();

    return [
        now.getUTCFullYear(),
        String(now.getUTCMonth() + 1).padStart(2, '0'),
        String(now.getUTCDate()).padStart(2, '0'),
        '-',
        String(now.getUTCHours()).padStart(2, '0'),
        String(now.getUTCMinutes()).padStart(2, '0'),
        String(now.getUTCSeconds()).padStart(2, '0'),
    ].join('');
}

function normalizeSubfolderPath(value) {
    return toText(value)
        .split(/[\\/]+/)
        .map((segment) => slugify(segment, ''))
        .filter(Boolean)
        .join('/');
}

function buildUploadPath(folder, subfolder, baseName, extension) {
    const folderPath = subfolder ? `${folder}/${subfolder}` : folder;

    return `${folderPath}/${slugify(baseName)}-${buildReadableTimestamp()}.${extension}`;
}

async function getAdminContext() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'You must be signed in to upload media.' }, { status: 401 }),
        };
    }

    const profileResult = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

    if (profileResult.error) {
        return {
            errorResponse: NextResponse.json({ error: profileResult.error.message || 'Unable to verify admin access right now.' }, { status: 500 }),
        };
    }

    if (!profileResult.data?.is_admin) {
        return {
            errorResponse: NextResponse.json({ error: 'Admin access is required for media uploads.' }, { status: 403 }),
        };
    }

    return { user };
}

async function normalizeImageBuffer(inputBuffer, fileExtension) {
    if (fileExtension !== 'heic' && fileExtension !== 'heif') {
        return inputBuffer;
    }

    try {
        return await sharp(inputBuffer).rotate().toBuffer();
    } catch {
        const convertedBuffer = await heicConvert({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 0.92,
        });

        return Buffer.from(convertedBuffer);
    }
}

async function optimizeImage(file, maxEdge) {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = normalizeFileExtension(file);
    const normalizedBuffer = await normalizeImageBuffer(inputBuffer, fileExtension);
    const image = sharp(normalizedBuffer, { failOn: 'none' }).rotate();

    const outputBuffer = await image
        .resize({
            width: maxEdge,
            height: maxEdge,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality: IMAGE_QUALITY, effort: 6 })
        .toBuffer();

    return {
        content: outputBuffer,
        extension: 'webp',
        contentType: 'image/webp',
        optimized: true,
    };
}

async function prepareUploadPayload(file, maxEdge) {
    const contentType = toText(file?.type).toLowerCase();

    if (contentType.startsWith('image/')) {
        return optimizeImage(file, maxEdge);
    }

    if (contentType.startsWith('video/')) {
        return {
            content: Buffer.from(await file.arrayBuffer()),
            extension: normalizeFileExtension(file) || 'mp4',
            contentType: contentType || 'video/mp4',
            optimized: false,
        };
    }

    throw new Error('Only image and video uploads are supported.');
}

export async function POST(request) {
    const context = await getAdminContext();

    if (context.errorResponse) {
        return context.errorResponse;
    }

    if (!isAdminConfigured()) {
        return NextResponse.json({ error: 'Supabase admin storage is not configured.' }, { status: 503 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const bucket = toText(formData.get('bucket'));
        const folder = toText(formData.get('folder'));
        const subfolder = normalizeSubfolderPath(formData.get('subfolder'));
        const baseName = toText(formData.get('baseName'));
        const imageMaxEdge = clampImageMaxEdge(formData.get('imageMaxEdge'));

        if (!(file instanceof File) || !file.size) {
            return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
        }

        if (!ALLOWED_BUCKETS.has(bucket)) {
            return NextResponse.json({ error: 'This upload bucket is not allowed.' }, { status: 400 });
        }

        if (!ALLOWED_FOLDERS.has(folder)) {
            return NextResponse.json({ error: 'This upload folder is not allowed.' }, { status: 400 });
        }

        if (!baseName) {
            return NextResponse.json({ error: 'A base upload name is required.' }, { status: 400 });
        }

        const uploadPayload = await prepareUploadPayload(file, imageMaxEdge);
        const filePath = buildUploadPath(folder, subfolder, baseName, uploadPayload.extension);
        const adminClient = createAdminClient();
        const { error } = await adminClient.storage.from(bucket).upload(filePath, uploadPayload.content, {
            cacheControl: '3600',
            upsert: false,
            contentType: uploadPayload.contentType,
        });

        if (error) {
            throw error;
        }

        const { data } = adminClient.storage.from(bucket).getPublicUrl(filePath);

        if (!data?.publicUrl) {
            throw new Error('Upload finished, but the public URL could not be resolved.');
        }

        return NextResponse.json({
            url: data.publicUrl,
            bucket,
            path: filePath,
            optimized: uploadPayload.optimized,
            mediaKind: uploadPayload.contentType.startsWith('video/') ? 'video' : 'image',
        });
    } catch (error) {
        return NextResponse.json({ error: error?.message || 'Unable to upload this media file.' }, { status: 500 });
    }
}