const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PresignedUrlResponse {
    uploadUrl: string;
    publicUrl: string;
    key: string;
}

interface UploadOptions {
    folder: 'banners' | 'products' | 'logos' | 'about' | 'categories';
    onProgress?: (percent: number) => void;
}

/**
 * Upload a file to Digital Ocean Spaces via presigned URL
 * @param file - The file to upload
 * @param options - Upload options including folder and progress callback
 * @returns The public URL of the uploaded file
 */
export async function uploadImage(
    file: File,
    options: UploadOptions
): Promise<string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') || 'default' : 'default';

    if (!token) {
        throw new Error('Authentication required');
    }

    // Step 1: Get presigned URL from backend
    const presignedResponse = await fetch(`${API_BASE}/admin/upload/presigned-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
            folder: options.folder,
            filename: file.name,
            contentType: file.type,
        }),
    });

    if (!presignedResponse.ok) {
        const error = await presignedResponse.json().catch(() => ({ message: 'Failed to get upload URL' }));
        throw new Error(error.message || 'Failed to get upload URL');
    }

    const { uploadUrl, publicUrl }: PresignedUrlResponse = await presignedResponse.json();

    // Step 2: Upload file directly to DO Spaces using presigned URL
    // The bucket should be configured with public file access at bucket level
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type,
        },
        body: file,
    });

    // S3-compatible PUT responses return 200 OK on success
    // Some may also return 204 No Content
    if (!uploadResponse.ok) {
        console.error('Upload failed:', uploadResponse.status, uploadResponse.statusText);
        throw new Error(`Failed to upload file to storage (${uploadResponse.status})`);
    }

    console.log('Upload successful, public URL:', publicUrl);
    return publicUrl;
}

/**
 * Upload multiple files
 * @param files - Array of files to upload
 * @param options - Upload options
 * @returns Array of public URLs
 */
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

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File size must be less than 10MB' };
    }

    return { valid: true };
}
