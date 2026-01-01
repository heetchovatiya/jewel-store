const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UploadResponse {
    publicUrl: string;
    key: string;
}

interface UploadOptions {
    folder: 'banners' | 'products' | 'logos' | 'about' | 'categories';
    onProgress?: (percent: number) => void;
}

/**
 * Upload a file to Digital Ocean Spaces via backend proxy
 * This approach avoids CORS issues by having the backend handle the S3 upload
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

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', options.folder);

    // Upload file to backend which proxies to DO Spaces
    const response = await fetch(`${API_BASE}/admin/upload/file`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId,
            // Note: Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to upload file' }));
        console.error('Upload failed:', response.status, error);
        throw new Error(error.message || 'Failed to upload file');
    }

    const { publicUrl }: UploadResponse = await response.json();
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

/**
 * Delete an image from Digital Ocean Spaces
 * @param url - The public URL of the image to delete
 * @returns Whether the deletion was successful
 */
export async function deleteImage(url: string): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') || 'default' : 'default';

    if (!token) {
        console.warn('No token for image deletion');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/upload/file`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': tenantId,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            console.error('Failed to delete image:', response.status);
            return false;
        }

        const { success } = await response.json();
        return success;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}
