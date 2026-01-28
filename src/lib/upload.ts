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

    // Check if file is a video - skip compression for videos
    const isVideo = file.type.startsWith('video/');
    let fileToUpload = file;

    if (!isVideo) {
        // Compress image before upload
        console.log(`Original file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        fileToUpload = await compressImage(file, 20); // 20MB limit
        console.log(`Ready to upload: ${fileToUpload.name}, size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
    } else {
        console.log(`Uploading video: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB (no compression)`);
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', fileToUpload);
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
 * Compress an image file to reduce size and optimize format
 * @param file - The image file to compress
 * @param maxSizeMB - Maximum size in MB (default 2)
 * @returns Compressed image as a File object
 */
async function compressImage(file: File, maxSizeMB: number = 2): Promise<File> {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // If already small enough and is WebP, return as-is
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
                // Calculate new dimensions (max width 1920px)
                const maxWidth = 1920;
                let { width, height } = img;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Try different quality levels to get under size limit
                const qualities = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6];

                for (const quality of qualities) {
                    const blob = await new Promise<Blob | null>((res) => {
                        canvas.toBlob((b) => res(b), 'image/webp', quality);
                    });

                    if (!blob) continue;

                    if (blob.size <= maxSizeBytes) {
                        // Success! Convert blob to file
                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^/.]+$/, '.webp'),
                            { type: 'image/webp' }
                        );
                        console.log(`Compressed ${file.name} from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(blob.size / 1024 / 1024).toFixed(2)}MB (quality: ${quality})`);
                        resolve(compressedFile);
                        return;
                    }
                }

                // If still too large, reject
                reject(new Error(`Unable to compress image to under ${maxSizeMB}MB. Please use a smaller image or compress it manually.`));
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => reject(new Error('Failed to load image'));

        reader.readAsDataURL(file);
    });
}

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024; // 100MB before compression
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File size must be less than 100MB (will be compressed automatically)' };
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

/**
 * Validate video file before upload
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = [
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
    ];

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Only MP4, WebM, MOV, and AVI videos are allowed' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'Video size must be less than 20MB. Please compress your video before uploading.' };
    }

    return { valid: true };
}

/**
 * Upload a video file
 */
export async function uploadVideo(
    file: File,
    options: UploadOptions
): Promise<string> {
    const validation = validateVideoFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    return uploadImage(file, options); // Reuse uploadImage as it handles the backend proxy
}

/**
 * Get optimized CDN URL for images
 * @param url - The original image URL
 * @param options - Optimization options (width, quality, format)
 * @returns - The optimized URL
 */
export function getCdnOptimizedUrl(
    url: string,
    options: { width?: number; quality?: number; format?: 'webp' | 'auto' } = {}
): string {
    if (!url || typeof url !== 'string') return '';

    // If not a DO Spaces CDN URL or is a video, return as-is
    if (!url.includes('digitaloceanspaces.com') || isVideoUrl(url)) return url;

    const { width, quality = 85, format = 'webp' } = options;
    const params = new URLSearchParams();

    if (width) params.set('width', width.toString());
    params.set('quality', quality.toString());
    if (format === 'webp') params.set('format', 'webp');

    // Check if URL already has query params
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
}

/**
 * Check if a URL points to a video
 */
export function isVideoUrl(url: string): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.mp4') ||
        lowerUrl.endsWith('.webm') ||
        lowerUrl.endsWith('.mov') ||
        lowerUrl.endsWith('.avi');
}
