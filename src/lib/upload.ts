/**
 * Cloudflare R2 uploads — direct browser PUT via presigned URL (preferred).
 *
 * Flow:
 * 1) Backend issues presigned PUT
 * 2) Browser uploads once to R2 with Cache-Control: immutable
 * 3) Store returned object **key** in MongoDB (API expands to CDN URL on read)
 * 4) Visitors read via CDN_BASE_URL / NEXT_PUBLIC_CDN_URL
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CDN_BASE = (process.env.NEXT_PUBLIC_CDN_URL || '').replace(/\/$/, '');

/** Hard cap — stay under R2 multipart thresholds (~200MB); app uses 20MB. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

interface PresignedUploadResponse {
    uploadUrl: string;
    publicUrl: string;
    key: string;
    cacheControl: string;
    contentType: string;
}

interface UploadOptions {
    folder: 'banners' | 'products' | 'logos' | 'about' | 'categories';
    onProgress?: (percent: number) => void;
}

function authHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') || 'default' : 'default';
    if (!token) {
        throw new Error('Authentication required');
    }
    return {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
    };
}

/** Build a public CDN URL from a storage key (or pass through full URLs). */
export function getPublicUrl(keyOrUrl: string | null | undefined): string {
    if (!keyOrUrl) return '';
    const trimmed = keyOrUrl.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;
    if (!CDN_BASE) return trimmed;
    return `${CDN_BASE}/${trimmed.replace(/^\//, '')}`;
}

/**
 * Upload a file: compress (images) → get presigned URL → PUT directly to R2.
 * Returns the object **key** for MongoDB storage (not the full CDN URL).
 */
export async function uploadImage(
    file: File,
    options: UploadOptions
): Promise<string> {
    const isVideo = file.type.startsWith('video/');
    let fileToUpload = file;

    if (!isVideo) {
        fileToUpload = await compressImage(file, 20);
    }

    if (fileToUpload.size > MAX_UPLOAD_BYTES) {
        throw new Error(`File must be under ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB (avoids multipart Class A costs)`);
    }

    // (1) Ask backend for a signed PUT URL — Class A is the eventual PUT, not this call
    const signRes = await fetch(`${API_BASE}/admin/upload/presigned-url`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            folder: options.folder,
            filename: fileToUpload.name,
            contentType: fileToUpload.type || 'application/octet-stream',
        }),
    });

    if (!signRes.ok) {
        const error = await signRes.json().catch(() => ({ message: 'Failed to get upload URL' }));
        throw new Error(error.message || 'Failed to get upload URL');
    }

    const signed: PresignedUploadResponse = await signRes.json();

    // (2) Direct browser → R2 PUT (single Class A write; Cache-Control baked into object)
    const putRes = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': signed.contentType,
            'Cache-Control': signed.cacheControl,
        },
        body: fileToUpload,
    });

    if (!putRes.ok) {
        const text = await putRes.text().catch(() => '');
        console.error('R2 direct upload failed:', putRes.status, text);
        // Fallback: proxy through Droplet if R2 CORS is not configured yet
        return uploadViaBackendProxy(fileToUpload, options.folder);
    }

    if (options.onProgress) {
        options.onProgress(100);
    }

    return signed.key;
}

/** Fallback when R2 bucket CORS is missing — still sets Cache-Control server-side. */
async function uploadViaBackendProxy(file: File, folder: string): Promise<string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') || 'default' : 'default';
    if (!token) throw new Error('Authentication required');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(`${API_BASE}/admin/upload/file`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to upload file' }));
        throw new Error(error.message || 'Failed to upload file');
    }

    const { key, publicUrl } = await response.json();
    return key || publicUrl;
}

export async function uploadImages(
    files: File[],
    options: UploadOptions
): Promise<string[]> {
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i], options);
        urls.push(url);

        if (options.onProgress) {
            options.onProgress(Math.round(((i + 1) / files.length) * 100));
        }
    }

    return urls;
}

async function compressImage(file: File, maxSizeMB: number = 2): Promise<File> {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size <= maxSizeBytes && file.type === 'image/webp') {
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read image file'));

        img.onload = async () => {
            try {
                const maxWidth = 1920;
                let { width, height } = img;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                const qualities = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6];

                for (const quality of qualities) {
                    const blob = await new Promise<Blob | null>((res) => {
                        canvas.toBlob((b) => res(b), 'image/webp', quality);
                    });

                    if (!blob) continue;

                    if (blob.size <= maxSizeBytes) {
                        resolve(
                            new File(
                                [blob],
                                file.name.replace(/\.[^/.]+$/, '.webp'),
                                { type: 'image/webp' },
                            ),
                        );
                        return;
                    }
                }

                reject(new Error(`Unable to compress image to under ${maxSizeMB}MB.`));
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        reader.readAsDataURL(file);
    });
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File size must be less than 100MB (will be compressed automatically)' };
    }

    return { valid: true };
}

export async function deleteImage(url: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/admin/upload/file`, {
            method: 'DELETE',
            headers: authHeaders(),
            body: JSON.stringify({ url }),
        });

        if (!response.ok) return false;
        const { success } = await response.json();
        return success;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
    const maxSize = MAX_UPLOAD_BYTES;
    const allowedTypes = [
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    ];

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Only MP4, WebM, MOV, and AVI videos are allowed' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'Video size must be less than 20MB.' };
    }

    return { valid: true };
}

export async function uploadVideo(
    file: File,
    options: UploadOptions
): Promise<string> {
    const validation = validateVideoFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    return uploadImage(file, options);
}

/** Public CDN URLs / keys — resolve keys via NEXT_PUBLIC_CDN_URL. */
export function getCdnOptimizedUrl(
    url: string,
    _options: { width?: number; quality?: number; format?: 'webp' | 'auto' } = {}
): string {
    return getPublicUrl(url);
}

export function isVideoUrl(url: string): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.mp4') ||
        lowerUrl.endsWith('.webm') ||
        lowerUrl.endsWith('.mov') ||
        lowerUrl.endsWith('.avi') ||
        lowerUrl.includes('.mp4') ||
        lowerUrl.includes('.webm');
}

export function isManagedStorageUrl(url: string): boolean {
    if (!url) return false;
    if (
        url.includes('digitaloceanspaces.com') ||
        url.includes('r2.cloudflarestorage.com') ||
        Boolean(CDN_BASE && url.startsWith(CDN_BASE))
    ) {
        return true;
    }
    // Bare object keys we manage
    return /^(products|banners|logos|about|categories)\//.test(url);
}
